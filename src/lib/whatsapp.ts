type CartItem = {
  id: string;
  productId: string;
  name: string;
  price_cents: number;
  quantity: number;
  image?: string;
};

interface WhatsAppParams {
  name: string;
  address: string;
  pincode: string;
  phone: string;
  items: CartItem[];
  totalRupees: number;
}

/**
 * Build a WhatsApp deep‑link URL that pre‑fills a message with order details.
 * Uses the business phone number from env var NEXT_PUBLIC_WHATSAPP_NUMBER.
 */
export function buildWhatsAppUrl(params: WhatsAppParams): string {
  const businessNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
  if (!businessNumber) throw new Error("WhatsApp number not configured");
  const lines: string[] = [];
  lines.push("Hello, I would like to place an order:");
  lines.push("");
  lines.push(`*Name:* ${params.name}`);
  lines.push(`*Address:* ${params.address}`);
  lines.push(`*Pincode:* ${params.pincode}`);
  lines.push(`*Phone:* ${params.phone}`);
  lines.push("");
  lines.push("*Items:*);
  params.items.forEach((item) => {
    const price = (item.price_cents / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
    lines.push(`- ${item.name} x${item.quantity} — ${price}`);
  });
  lines.push("");
  const total = params.totalRupees.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  lines.push(`*Total:* ${total}`);
  const message = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${businessNumber}?text=${message}`;
}
