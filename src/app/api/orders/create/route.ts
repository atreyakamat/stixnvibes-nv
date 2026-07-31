import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "@/lib/zod-lite";
import { createService } from "@/lib/supabase/service";
import { buildWhatsAppUrl, type WhatsAppCartItem } from "@/lib/whatsapp";
import { products, type Product } from "@/lib/data/products";

interface CartLine {
  product_id?: string;
  variant_id?: string | null;
  name: string;
  quantity?: number;
  price_cents: number;
  image_url?: string;
  variant_name?: string;
}

interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  address: string;
  pincode: string;
  notes?: string;
  items: CartLine[];
}

const PhoneRe = /^\+?[0-9]{8,15}$/;
const PincodeRe = /^[0-9A-Za-z\s-]{3,10}$/;

function sanitize(str: string): string {
  return str
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function validate(payload: any): payload is CreateOrderPayload {
  if (typeof payload !== "object" || payload === null) return false;
  if (typeof payload.customer_name !== "string" || payload.customer_name.trim().length < 2) return false;
  if (typeof payload.customer_phone !== "string" || !PhoneRe.test(payload.customer_phone)) return false;
  if (typeof payload.address !== "string" || payload.address.trim().length < 6) return false;
  if (typeof payload.pincode !== "string" || !PincodeRe.test(payload.pincode)) return false;
  if (!Array.isArray(payload.items) || payload.items.length === 0) return false;
  for (const item of payload.items as CartLine[]) {
    if (typeof item.name !== "string" || !item.name.trim()) return false;
    if (typeof item.price_cents !== "number" || item.price_cents < 0) return false;
    const qty = typeof item.quantity === "number" ? item.quantity : 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) return false;
  }
  if ("customer_email" in payload && payload.customer_email !== null && payload.customer_email !== "") {
    if (typeof payload.customer_email !== "string" || !z.email(payload.customer_email)) return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!validate(payload)) {
    return NextResponse.json({ error: "Invalid order payload" }, { status: 400 });
  }

  const cleanName = sanitize(payload.customer_name);
  const cleanPhone = sanitize(payload.customer_phone);
  const cleanAddress = sanitize(payload.address);
  const cleanPincode = sanitize(payload.pincode);
  const cleanNotes = payload.notes ? sanitize(payload.notes) : undefined;
  const cleanEmail = payload.customer_email ? sanitize(payload.customer_email) : null;

  // Verify prices server-side
  const items = payload.items;
  const quantities = items.map((i) => (typeof i.quantity === "number" ? i.quantity : 1));

  const verifiedItems = items.map((item, idx) => {
    const mockProd = products.find((p: Product) => p.id === item.product_id || p.slug === item.product_id);
    const verifiedPrice = mockProd ? Math.round(mockProd.price * 100) : item.price_cents;
    return {
      ...item,
      name: sanitize(item.name),
      quantity: quantities[idx],
      price_cents: verifiedPrice,
    };
  });

  const totalCents = verifiedItems.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);

  const whatsappItems: WhatsAppCartItem[] = verifiedItems.map((item, idx) => ({
    id: item.variant_id ?? item.product_id ?? `${item.name}-${idx}`,
    productId: item.product_id!,
    name: item.name,
    price_cents: item.price_cents,
    quantity: item.quantity,
    image: item.image_url,
    variantName: item.variant_name,
  }));

  const waUrl = buildWhatsAppUrl({
    name: cleanName,
    address: cleanAddress,
    pincode: cleanPincode,
    phone: cleanPhone,
    items: whatsappItems,
    totalRupees: totalCents / 100,
    notes: cleanNotes,
  });

  let orderId: string | null = null;
  try {
    const { createBrowser } = await import("@/lib/supabase/client");
    const client = createService() ?? createBrowser();
    if (client) {
      const orderInsert = {
        id: randomUUID(),
        customer_name: cleanName,
        customer_phone: cleanPhone,
        customer_email: cleanEmail,
        address: cleanAddress,
        pincode: cleanPincode,
        total_cents: totalCents,
        status: "sent",
        whatsapp_url: waUrl,
        notes: cleanNotes ?? null,
      };
      const itemInserts = verifiedItems.map((i) => ({
        id: randomUUID(),
        product_id: i.product_id ?? null,
        variant_id: i.variant_id ?? null,
        name: i.name,
        quantity: i.quantity,
        price_cents: i.price_cents,
        image_url: i.image_url ?? null,
      }));
      
      const { data, error: dbError } = await client.rpc("create_checkout_transaction", {
        p_order: orderInsert,
        p_items: itemInserts,
      });

      if (dbError) {
        console.error("[api/orders/create] insert failed:", dbError.message);
      } else if (data && data.success === false) {
        console.error("[api/orders/create] RPC failed:", data.error);
      } else {
        orderId = orderInsert.id;
      }
    }
  } catch (e) {
    console.error("[api/orders/create] Unexpected:", e);
  }

  return NextResponse.json({
    ok: true,
    whatsappUrl: waUrl,
    orderId,
    persisted: Boolean(orderId),
  });
}
