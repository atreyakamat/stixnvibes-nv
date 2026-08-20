export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { NotFoundError, ValidationError } from "@/lib/errors";

const AdjustInventorySchema = z.object({
  productId: z.string().uuid(),
  adjustmentQuantity: z.number().int(), // Positive to add, negative to remove
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  operator: z.string().default("Admin Operator"),
});

export const POST = createApiHandler({
  requireAdmin: true,
  bodySchema: AdjustInventorySchema,
  handler: async ({ body }) => {
    const { productId, adjustmentQuantity, reason, operator } = body;

    if (adjustmentQuantity === 0) {
      throw new ValidationError("Adjustment quantity cannot be 0");
    }

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundError(`Product ${productId} not found`);
      }

      const previousStock = product.stock ?? 0;
      const newStock = previousStock + adjustmentQuantity;

      if (newStock < 0) {
        throw new ValidationError(
          `Cannot reduce stock by ${Math.abs(adjustmentQuantity)}: only ${previousStock} units available`
        );
      }

      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      // Record immutable ledger audit
      const ledgerEntry = await tx.inventoryLedgerEntry.create({
        data: {
          productId,
          entryType: "adjustment",
          quantity: adjustmentQuantity,
          previousStock,
          newStock,
          reason,
          operator,
        },
      });

      return {
        product: updatedProduct,
        ledgerEntry,
      };
    });
  },
});
