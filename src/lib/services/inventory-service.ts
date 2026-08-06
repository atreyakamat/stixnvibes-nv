import { InventoryRepository, type InventoryLogParams } from "@/lib/repositories/inventory-repository";

export class InventoryService {
  private repo = new InventoryRepository();

  async getLogs(params: InventoryLogParams = {}) {
    return this.repo.getLogs(params);
  }

  async recordStockChange(productId: string, change: number, reason: string, notes?: string, operator?: string) {
    if (!productId) throw new Error("Product ID is required");
    if (typeof change !== "number") throw new Error("Stock change amount must be a number");
    if (!reason) throw new Error("Reason for stock change is required");

    return this.repo.recordMovement({
      productId,
      change,
      reason,
      notes,
      operator,
    });
  }
}
