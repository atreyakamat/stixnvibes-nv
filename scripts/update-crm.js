const fs = require('fs');
const path = require('path');

const repoPath = path.join('C:', 'Projects', 'stixnvibes-nv', 'src', 'lib', 'repositories', 'customer-repository.ts');
const servicePath = path.join('C:', 'Projects', 'stixnvibes-nv', 'src', 'lib', 'services', 'customer-service.ts');
const routePath = path.join('C:', 'Projects', 'stixnvibes-nv', 'src', 'app', 'api', 'admin', 'customers', 'route.ts');

let repoContent = fs.readFileSync(repoPath, 'utf8');

const interfaceRegex = /export interface CustomerSummaryRecord {[^}]*}/;
const newInterface = `export interface CustomerSummaryRecord {
  id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string;
  first_order_at: string;
  vip?: boolean;
  blacklisted?: boolean;
  blacklist_reason?: string;
  notes?: string;
  favourite_products?: string;
}`;

repoContent = repoContent.replace(interfaceRegex, newInterface);

const classRegex = /export class CustomerRepository {/;
const newClassStart = `export class CustomerRepository {
  async updateCustomerCrm(id: string, data: any) {
    const client = this.getClient();
    const { error } = await client
      .from("settings")
      .upsert({
        key: \`crm_customer_\${id}\`,
        category: "crm_customers",
        value: data,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
  }

  async deleteCustomerCrm(id: string) {
    const client = this.getClient();
    const { error } = await client
      .from("settings")
      .delete()
      .eq("key", \`crm_customer_\${id}\`);
    if (error) throw error;
  }
`;

repoContent = repoContent.replace(classRegex, newClassStart);

const fetchAndMergeStr = `
    const { data: crmSettings } = await client
      .from("settings")
      .select("key, value")
      .eq("category", "crm_customers");
    
    const crmMap = new Map();
    if (crmSettings) {
      for (const s of crmSettings) {
        if (s.key.startsWith("crm_customer_")) {
          const id = s.key.replace("crm_customer_", "");
          crmMap.set(id, s.value);
        }
      }
    }

    const mergedCustomers = customers.map(c => {
      const id = c.customer_phone || c.customer_email || c.customer_name;
      const crm = crmMap.get(id) || {};
      return {
        ...c,
        id,
        ...crm
      };
    });

    return mergedCustomers.slice(0, limit);
  }
}
`;

// Just replace everything after the second return customers slice(0, limit) or similar
// Let's do it safely
let lines = repoContent.split('\n');
let replaced = false;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('return customers.slice(0, limit);')) {
    lines[i] = fetchAndMergeStr;
    replaced = true;
    break;
  }
}
if(!replaced) {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('return customers;')) {
        // wait there are two returns. 
    }
  }
}
repoContent = lines.join('\n');
fs.writeFileSync(repoPath, repoContent);

let serviceContent = fs.readFileSync(servicePath, 'utf8');
serviceContent = serviceContent.replace('}', `
  async updateCustomer(id: string, data: any) {
    return this.repo.updateCustomerCrm(id, data);
  }
  async deleteCustomer(id: string) {
    return this.repo.deleteCustomerCrm(id);
  }
}`);
fs.writeFileSync(servicePath, serviceContent);

const routeContent = \`export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { CustomerService } from "@/lib/services/customer-service";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";

const customerService = new CustomerService();

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || undefined;
  const sortBy = url.searchParams.get("sort") || "last_order_at";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  try {
    const customers = await customerService.getCustomers({ search, sortBy, limit });
    return ApiResponse.success(customers);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const id = body.id || body.customer_phone || body.customer_email || body.customer_name;
    if (!id) throw new Error("Missing customer identifier");
    
    await customerService.updateCustomer(id, {
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      customer_email: body.customer_email,
      vip: body.vip,
      blacklisted: body.blacklisted,
      blacklist_reason: body.blacklist_reason,
      notes: body.notes,
      favourite_products: body.favourite_products
    });
    return ApiResponse.success({ success: true });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return ApiResponse.clientError("Missing id");

  try {
    await customerService.deleteCustomer(id);
    return ApiResponse.success({ success: true });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
\`;
fs.writeFileSync(routePath, routeContent);
