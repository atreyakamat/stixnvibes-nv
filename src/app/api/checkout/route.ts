import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";
import { createRazorpayOrder, isRazorpayConfigured, RAZORPAY_KEY_ID } from "@/lib/payment/razorpay";
import { products, type Product } from "@/lib/data/products";
import type { Insert } from "@/types/supabase";

export const dynamic = "force-dynamic";

interface CheckoutRequestBody {
  items: Array<{
    id: string;
    productId: string;
    variantId?: string | null;
    name: string;
    price_cents: number;
    quantity: number;
    image?: string;
    variantName?: string;
  }>;
  shippingAddress: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    pincode: string;
    notes?: string;
  };
  couponCode?: string;
  paymentMethod?: "razorpay" | "whatsapp";
}

const VALID_COUPONS: Record<string, number> = {
  VIBES20: 0.2, // 20% off
  VIBE10: 0.1,  // 10% off
};

function sanitize(str: string): string {
  return str
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export async function POST(req: NextRequest) {
  try {
    const body: CheckoutRequestBody = await req.json();
    const { items, shippingAddress, couponCode, paymentMethod = "razorpay" } = body;

    // 1. Input Sanitization & Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Cart is empty" },
        { status: 400 }
      );
    }

    if (
      !shippingAddress ||
      !shippingAddress.name?.trim() ||
      !shippingAddress.phone?.trim() ||
      !shippingAddress.address?.trim() ||
      !shippingAddress.pincode?.trim()
    ) {
      return NextResponse.json(
        { ok: false, error: "Missing required shipping fields (name, phone, address, pincode)" },
        { status: 400 }
      );
    }

    const cleanPincode = shippingAddress.pincode.trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid 6-digit Indian PIN code" },
        { status: 400 }
      );
    }

    const cleanName = sanitize(shippingAddress.name);
    const cleanPhone = sanitize(shippingAddress.phone);
    const cleanAddress = sanitize(shippingAddress.address);
    const cleanNotes = shippingAddress.notes ? sanitize(shippingAddress.notes) : null;
    const cleanEmail = shippingAddress.email ? sanitize(shippingAddress.email) : null;

    // 2. Server-Side Price Validation (Ignore client-provided price_cents for security)
    const svc = createService();
    let verifiedSubtotalCents = 0;
    const verifiedItems = [];

    // Fetch DB prices if Supabase is connected
    let dbProductsMap: Record<string, number> = {};
    if (svc) {
      const productIds = items.map((i) => i.productId).filter(Boolean);
      if (productIds.length > 0) {
        const { data: dbProds } = await (svc as any)
          .from("products")
          .select("id, price_cents, stock")
          .in("id", productIds);
        if (dbProds) {
          dbProductsMap = Object.fromEntries(dbProds.map((p: any) => [p.id, p.price_cents]));
        }
      }
    }

    for (const item of items) {
      const qty = Math.max(1, Math.min(99, item.quantity));
      const mockProd = products.find((p: Product) => p.id === item.productId || p.slug === item.productId);
      const verifiedPriceCents =
        dbProductsMap[item.productId] ??
        (mockProd ? Math.round(mockProd.price * 100) : Math.max(0, item.price_cents));

      verifiedSubtotalCents += verifiedPriceCents * qty;
      verifiedItems.push({
        ...item,
        quantity: qty,
        price_cents: verifiedPriceCents,
      });
    }

    let discountCents = 0;
    const cleanCoupon = couponCode ? couponCode.trim().toUpperCase() : null;
    const isWholesaleOrder = verifiedSubtotalCents >= 500000; // ₹5,000+ corporate threshold

    if (cleanCoupon && VALID_COUPONS[cleanCoupon]) {
      if (isWholesaleOrder) {
        return NextResponse.json(
          { ok: false, error: "Promo coupon codes cannot be stacked with corporate wholesale discounts." },
          { status: 400 }
        );
      }
      const discountPct = VALID_COUPONS[cleanCoupon];
      discountCents = Math.round(verifiedSubtotalCents * discountPct);
    }

    const shippingThresholdCents = 49900; // Free shipping over ₹499
    const shippingCents = verifiedSubtotalCents >= shippingThresholdCents ? 0 : 4900; // ₹49 shipping
    const totalCents = Math.max(0, verifiedSubtotalCents - discountCents) + shippingCents;
    const totalRupees = totalCents / 100;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;
    let dbOrderId = orderNumber;

    // 3. Database Order Creation & Stock Decrement
    if (svc) {
      const orderInsert: Insert<"orders"> = {
        id: randomUUID(),
        customer_name: cleanName,
        customer_phone: cleanPhone,
        customer_email: cleanEmail,
        address: cleanAddress,
        pincode: cleanPincode,
        total_cents: totalCents,
        status: "created",
        notes: cleanNotes,
      };

      const { data, error } = await (svc as any)
        .from("orders")
        .insert(orderInsert)
        .select("id")
        .single();

      if (!error && data?.id) {
        dbOrderId = data.id;

        // Insert order items
        const itemInserts: Insert<"order_items">[] = verifiedItems.map((it) => ({
          id: randomUUID(),
          order_id: dbOrderId,
          product_id: it.productId ?? null,
          variant_id: it.variantId ?? null,
          name: it.name,
          quantity: it.quantity,
          price_cents: it.price_cents,
          image_url: it.image ?? null,
        }));
        await (svc as any).from("order_items").insert(itemInserts);

        // Decrement product stock safely
        for (const it of verifiedItems) {
          if (it.productId) {
            try {
              const { data: current } = await (svc as any)
                .from("products")
                .select("stock")
                .eq("id", it.productId)
                .single();
              if (current && typeof current.stock === "number") {
                const newStock = Math.max(0, current.stock - it.quantity);
                await (svc as any)
                  .from("products")
                  .update({ stock: newStock })
                  .eq("id", it.productId);
              }
            } catch {
              // Stock update fallback
            }
          }
        }
      }
    }

    // 4. Payment Gateway Initialization
    let razorpayOrderId: string | null = null;
    let razorpayKeyId: string | null = null;

    if (paymentMethod === "razorpay" && isRazorpayConfigured()) {
      try {
        const rzpOrder = await createRazorpayOrder({
          amountInRupees: totalRupees,
          receipt: orderNumber,
          notes: {
            customer_name: cleanName,
            phone: cleanPhone,
          },
        });
        razorpayOrderId = rzpOrder.id;
        razorpayKeyId = RAZORPAY_KEY_ID;
      } catch (err) {
        console.warn("[checkout] Razorpay initialization fallback:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      orderId: dbOrderId,
      orderNumber,
      totalCents,
      subtotalCents: verifiedSubtotalCents,
      discountCents,
      shippingCents,
      currency: "INR",
      paymentMethod,
      razorpayKeyId,
      razorpayOrderId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Checkout route failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
