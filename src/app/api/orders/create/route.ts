import { NextResponse, type NextRequest } from "next/server";
import { z } from "@/lib/zod-lite";
import { createService } from "@/lib/supabase/service";
import { buildWhatsAppUrl, type WhatsAppCartItem } from "@/lib/whatsapp";

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

function validate(payload: any): payload is CreateOrderPayload {
  if (typeof payload !== "object" || payload === null) return false;
  if (typeof payload.customer_name !== "string" || payload.customer_name.trim().length < 2) return false;
  if (typeof payload.customer_phone !== "string" || !PhoneRe.test(payload.customer_phone)) return false;
  if (typeof payload.address !== "string" || payload.address.trim().length < 6) return false;
  if (typeof payload.pincode !== "string" || !PincodeRe.test(payload.pincode)) return false;
  // items
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

  const items = payload.items;
  const quantities = items.map((i) => (typeof i.quantity === "number" ? i.quantity : 1));
  const totalCents = items.reduce((sum, item, idx) => sum + (item.price_cents * quantities[idx]), 0);
  const whatsappItems: WhatsAppCartItem[] = items.map((item, idx) => ({
    id: item.variant_id ?? item.product_id ?? `${item.name}-${idx}`,
    productId: item.product_id!,
    name: item.name,
    price_cents: item.price_cents,
    quantity: quantities[idx],
    image: item.image_url,
    variantName: item.variant_name,
  }));

  const waUrl = buildWhatsAppUrl({
    name: payload.customer_name,
    address: payload.address,
    pincode: payload.pincode,
    phone: payload.customer_phone,
    items: whatsappItems,
    totalRupees: totalCents / 100,
    notes: payload.notes,
  });

  // Persist order to Supabase when available.
  // Note: orders table allows anon insert per our RLS policies.
  let orderId: string | null = null;
  try {
    const { createBrowser } = await import("@/lib/supabase/client");
    const client = createService() ?? createBrowser();
    if (client) {
      const { data, error: dbError } = await client
        .from("orders")
        .insert({
          customer_name: payload.customer_name,
          customer_phone: payload.customer_phone,
          customer_email: payload.customer_email ?? null,
          address: payload.address,
          pincode: payload.pincode,
          total_cents: totalCents,
          status: "sent",
          whatsapp_url: waUrl,
          notes: payload.notes ?? null,
        })
        .select()
        .single();
      if (dbError) {
        console.error("[api/orders/create] insert failed:", dbError.message);
      } else {
        orderId = (data as { id: string }).id;
        // Insert line items.
        if (data?.id) {
          await client.from("order_items").insert(
            items.map((i, idx) => ({
              order_id: data!.id,
              product_id: i.product_id ?? null,
              variant_id: i.variant_id ?? null,
              name: i.name,
              quantity: quantities[idx],
              price_cents: i.price_cents,
              image_url: i.image_url ?? null,
            }))
          );
        }
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
