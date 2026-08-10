import { prisma } from "@/lib/prisma";
import type { InventoryLog } from "@prisma/client";

export interface InventoryLogParams {
  limit?: number;
  offset?: number;
  productId?: string;
}

export class InventoryRepository {
  async getLogs(params: InventoryLogParams = {}): Promise<InventoryLog[]> {
    const limit = Math.min(params.limit ?? 100, 500);
    const offset = params.offset ?? 0;
    
    let where: any = {};
    if (params.productId) {
      where.productId = params.productId;
    }

    return prisma.inventoryLog.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } } } // To mimic product_name if needed by frontend
    });
  }

  async recordMovement(params: {
    productId: string;
    change: number;
    reason: string;
    notes?: string | null;
    operator?: string;
  }): Promise<{ newStock: number; log: InventoryLog }> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch current stock
      const prod = await tx.product.findUnique({
        where: { id: params.productId },
        select: { id: true, name: true, stock: true }
      });
      if (!prod) throw new Error("Product not found");

      const previousStock = prod.stock ?? 0;
      const newStock = Math.max(0, previousStock + params.change);

      // 2. Update product stock
      await tx.product.update({
        where: { id: params.productId },
        data: { stock: newStock }
      });

      // 3. Log movement
      const log = await tx.inventoryLog.create({
        data: {
          productId: params.productId,
          change: params.change,
          reason: params.reason,
          previousStock,
          newStock,
          notes: params.notes || null,
          operator: params.operator || "admin",
        }
      });

      return { newStock, log };
    });
  }
}
