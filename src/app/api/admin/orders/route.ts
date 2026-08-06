export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";
import { OrderService } from "@/lib/services/order-service";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { requireAdminAuth } from "@/lib/auth-guard";
import type { OrderStatus } from "@/types/supabase";

const orderService = new OrderService();

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const limit = Number(url.searchParams.get("limit") ?? 100);

  try {
    const { data, total } = await orderService.getOrders({
      status,
      search,
      limit,
    });
    return ApiResponse.success(data, { total });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  let body: { orderId?: string; status?: OrderStatus; notes?: string };
  try {
    body = await req.json();
  } catch {
    return ApiResponse.error("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const { orderId, status, notes } = body;
  if (!orderId) {
    return ApiResponse.error("Missing required orderId", "BAD_REQUEST", 400);
  }

  try {
    if (status) {
      const updated = await orderService.updateOrderStatus(orderId, status);
      return ApiResponse.success(updated);
    }

    if (typeof notes === "string") {
      const updated = await orderService.updateOrderNotes(orderId, notes);
      return ApiResponse.success(updated);
    }

    return ApiResponse.error("No valid update operation specified", "BAD_REQUEST", 400);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
