import { NextResponse, type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";
import { createRazorpayOrder, isRazorpayConfigured, RAZORPAY_KEY_ID } from "@/lib/payment/razorpay";
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

    // Pincode validation: 6 digits for India
    if (!/^\d{6}$/.test(shippingAddress.pincode.trim())) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid 6-digit Indian PIN code" },
        { status: 400 }
      );
    }

    // 2. Pricing Calculations
    const subtotalCents = items.reduce(
      (sum, item) => sum + Math.max(0, item.price_cents) * Math.max(1, item.quantity),
      0
    );

    let discountCents = 0;
    if (couponCode && VALID_COUPONS[couponCode.trim().toUpperCase()]) {
      const discountPct = VALID_COUPONS[couponCode.trim().toUpperCase()];
      discountCents = Math.round(subtotalCents * discountPct);
    }

    const shippingThresholdCents = 49900; // Free shipping over ₹499
    const shippingCents = subtotalCents >= shippingThresholdCents ? 0 : 4900; // ₹49 shipping
    const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;
    const totalRupees = totalCents / 100;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;

    // 3. Database Order Creation (if Supabase configured)
    const svc = createService();
    let dbOrderId = orderNumber;

    if (svc) {
      const orderInsert: Insert<"orders"> = {
        customer_name: shippingAddress.name,
        customer_phone: shippingAddress.phone,
        customer_email: shippingAddress.email ?? null,
        address: shippingAddress.address,
        pincode: shippingAddress.pincode,
        total_cents: totalCents,
        status: "created",
        notes: shippingAddress.notes ?? null,
      };

      const { data, error } = await (svc as any)
        .from("orders")
        .insert(orderInsert)
        .select("id")
        .single();

      if (!error && data?.id) {
        dbOrderId = data.id;

        // Insert order items
        const itemInserts: Insert<"order_items">[] = items.map((it) => ({
          order_id: dbOrderId,
          product_id: it.productId ?? null,
          variant_id: it.variantId ?? null,
          name: it.name,
          quantity: it.quantity,
          price_cents: it.price_cents,
          image_url: it.image ?? null,
        }));
        await (svc as any).from("order_items").insert(itemInserts);
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
            customer_name: shippingAddress.name,
            phone: shippingAddress.phone,
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
      subtotalCents,
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
