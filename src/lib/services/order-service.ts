import { OrderRepository, type OrderListParams } from "@/lib/repositories/order-repository";
import { validateStateTransition } from "@/lib/orders/state-machine";
import type { OrderStatus } from "@/types/supabase";

export class OrderService {
  private repo = new OrderRepository();

  async getOrders(params: OrderListParams) {
    return this.repo.list(params);
  }

  async getOrder(id: string) {
    return this.repo.findById(id);
  }

  async updateOrderStatus(id: string, nextStatus: OrderStatus) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Order not found");

    validateStateTransition(existing.status, nextStatus);

    return this.repo.updateStatus(id, nextStatus);
  }

  async updateOrderNotes(id: string, notes: string) {
    return this.repo.updateNotes(id, notes);
  }

  async updateTracking(id: string, tracking_number: string, courier: string) {
    return this.repo.updateTracking(id, tracking_number, courier);
  }
}
