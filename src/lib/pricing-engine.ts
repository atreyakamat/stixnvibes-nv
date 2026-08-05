/**
 * Stix N Vibes Dynamic Commerce Pricing Engine
 * Calculates item and order pricing dynamically based on database-configured modifiers:
 * Final Price = (Base Price + Material Modifier + Size Modifier) * (1 - Quantity Discount) + GST + Shipping
 */

export type PricingInput = {
  basePriceCents: number;
  materialModifierCents?: number;
  sizeModifierCents?: number;
  quantity?: number;
  gstRatePercent?: number; // Default 18%
  customAddonCents?: number;
};

export type PricingResult = {
  unitPriceCents: number;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  unitPriceFormatted: string;
  totalFormatted: string;
};

export function calculateItemPrice(input: PricingInput): PricingResult {
  const base = Math.max(0, input.basePriceCents || 0);
  const matMod = input.materialModifierCents || 0;
  const sizeMod = input.sizeModifierCents || 0;
  const addon = input.customAddonCents || 0;

  const unitPriceCents = base + matMod + sizeMod + addon;
  const qty = Math.max(1, input.quantity || 1);
  const rawSubtotal = unitPriceCents * qty;

  // Quantity Tier Discount calculation
  let discountPercent = 0;
  if (qty >= 100) discountPercent = 0.25; // 25% off 100+
  else if (qty >= 50) discountPercent = 0.15; // 15% off 50+
  else if (qty >= 25) discountPercent = 0.10; // 10% off 25+
  else if (qty >= 10) discountPercent = 0.05; // 5% off 10+

  const discountCents = Math.round(rawSubtotal * discountPercent);
  const subtotalCents = rawSubtotal - discountCents;

  const gstRate = (input.gstRatePercent ?? 18) / 100;
  const taxCents = Math.round(subtotalCents * gstRate);
  const totalCents = subtotalCents + taxCents;

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  return {
    unitPriceCents,
    subtotalCents,
    discountCents,
    taxCents,
    totalCents,
    unitPriceFormatted: formatter.format(unitPriceCents / 100),
    totalFormatted: formatter.format(totalCents / 100),
  };
}
