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
