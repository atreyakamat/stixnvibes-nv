/**
 * Builds a WhatsApp deep-link URL pre-filled with the customer's order details.
 * Used as the primary checkout flow — no payment gateway required.
 *
 * Env: NEXT_PUBLIC_WHATSAPP_NUMBER (country code + number, digits only).
 */

export type WhatsAppCartItem = {
  id: string;
  productId: string;
  name: string;
  price_cents: number;
  quantity: number;
  image?: string;
  variantName?: string;
};

export interface WhatsAppParams {
  name: string;
  address: string;
  pincode: string;
  phone: string;
  items: WhatsAppCartItem[];
  totalRupees: number;
  notes?: string;
}

const BUSINESS_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");

/** True when the WhatsApp business number env var is set. */
export function isWhatsAppConfigured() {
  return Boolean(BUSINESS_NUMBER);
}

export function getWhatsAppNumber() {
  return BUSINESS_NUMBER ?? "";
}

export function buildWhatsAppUrl(params: WhatsAppParams): string {
  if (!BUSINESS_NUMBER) {
    throw new Error(
      "WhatsApp number not configured. Set NEXT_PUBLIC_WHATSAPP_NUMBER in your .env.local (country code + number, digits only)."
    );
  }

  const lines: string[] = [];
  lines.push("Hello Stix N Vibes! I'd like to place an order:");
  lines.push("");
  lines.push(`*Name:* ${params.name}`);
  lines.push(`*Address:* ${params.address}`);
  lines.push(`*Pincode:* ${params.pincode}`);
  lines.push(`*Phone:* ${params.phone}`);
  if (params.notes) lines.push(`*Notes:* ${params.notes}`);
  lines.push("");
  lines.push("*Items:*");
  params.items.forEach((item) => {
    const price = formatRupees(item.price_cents / 100);
    const variant = item.variantName ? ` (${item.variantName})` : "";
    lines.push(`• ${item.name}${variant} ×${item.quantity} — ${price}`);
  });
  lines.push("");
  const total = formatRupees(params.totalRupees);
  lines.push(`*Total:* ${total}`);
  lines.push("");
  lines.push("Sent via stixnvibes.com");

  const message = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${BUSINESS_NUMBER}?text=${message}`;
}

function formatRupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
