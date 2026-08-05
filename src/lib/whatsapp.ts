/**
 * Builds a WhatsApp deep-link URL pre-filled with the customer's order details.
 * Used as the primary checkout flow — Database is source of truth first,
 * then WhatsApp opens with pre-filled Order ID for admin confirmation.
 *
 * Env: NEXT_PUBLIC_WHATSAPP_NUMBER (country code + number, digits only).
 */

export type WhatsAppCartItem = {
  id?: string;
  productId?: string;
  name: string;
  price_cents: number;
  quantity: number;
  image?: string;
  variantName?: string;
};

export interface WhatsAppParams {
  orderId?: string;
  orderNumber?: string;
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

  const orderRef = params.orderNumber || (params.orderId ? `#ORD-${params.orderId.slice(0, 8).toUpperCase()}` : undefined);

  const lines: string[] = [];
  lines.push("Hi Stix N Vibes 👋");
  lines.push("");
  lines.push("I'd like to confirm my order.");
  lines.push("");
  if (orderRef) {
    lines.push("Order ID:");
    lines.push(orderRef);
    lines.push("");
  }
  lines.push("Name:");
  lines.push(params.name);
  lines.push("");
  lines.push("Phone:");
  lines.push(params.phone);
  lines.push("");
  lines.push("Items:");
  params.items.forEach((item) => {
    const price = formatRupees((item.price_cents * item.quantity) / 100);
    const variant = item.variantName ? ` (${item.variantName})` : "";
    lines.push(`• ${item.name}${variant} ×${item.quantity} — ${price}`);
  });
  lines.push("");
  lines.push("Delivery:");
  lines.push(`${params.address} (Pincode: ${params.pincode})`);
  if (params.notes) {
    lines.push(`Notes: ${params.notes}`);
  }
  lines.push("");
  lines.push("Total:");
  lines.push(formatRupees(params.totalRupees));
  lines.push("");
  lines.push("Thank you!");

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
