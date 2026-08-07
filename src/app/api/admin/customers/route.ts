export const dynamic = "force-dynamic";
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
  if (!id) return ApiResponse.error("Missing id", "BAD_REQUEST", 400);

  try {
    await customerService.deleteCustomer(id);
    return ApiResponse.success({ success: true });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
