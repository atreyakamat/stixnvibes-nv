import { z } from "zod";

export const InventoryLogSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  change: z.number().int("Change must be an integer"),
  reason: z.string().min(2, "Reason is required"),
  previousStock: z.number().int().min(0, "Previous stock cannot be negative"),
  newStock: z.number().int().min(0, "New stock cannot be negative"),
  notes: z.string().optional().nullable(),
  operator: z.string().min(2, "Operator name is required"),
}).refine(data => data.previousStock + data.change === data.newStock, {
  message: "New stock must equal previous stock + change",
  path: ["newStock"],
});

export function validateInventoryLog(data: unknown) {
  return InventoryLogSchema.safeParse(data);
}
