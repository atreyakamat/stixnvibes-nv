import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createRazorpayOrder, isRazorpayConfigured, RAZORPAY_KEY_ID } from "@/lib/payment/razorpay";
import { products, type Product } from "@/lib/data/products";
import { prisma } from "@/lib/prisma";

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

    // 2. Server-Side Price Validation
    let verifiedSubtotalCents = 0;
    const verifiedItems: any[] = [];

    const productIds = items.map((i) => i.productId).filter(Boolean);
    let dbProductsMap: Record<string, number> = {};
    
    if (productIds.length > 0) {
      const dbProds = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, priceCents: true, stock: true },
      });
      dbProductsMap = Object.fromEntries(dbProds.map((p) => [p.id, p.priceCents]));
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
    const isWholesaleOrder = verifiedSubtotalCents >= 500000;

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

    const shippingThresholdCents = 49900;
    const shippingCents = verifiedSubtotalCents >= shippingThresholdCents ? 0 : 4900;
    const totalCents = Math.max(0, verifiedSubtotalCents - discountCents) + shippingCents;
    const totalRupees = totalCents / 100;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;
    const dbOrderId = randomUUID();

    // 3. Database Order Creation & Stock Decrement via Prisma Transaction
    try {
      await prisma.$transaction(async (tx) => {
        // Create Order
        await tx.order.create({
          data: {
            id: dbOrderId,
            metadata: { orderNumber },
            customerName: cleanName,
            customerPhone: cleanPhone,
            customerEmail: cleanEmail,
            address: cleanAddress,
            pincode: cleanPincode,
            totalCents: totalCents,
            notes: cleanNotes,
            status: "created",
          },
        });

        // Create Items & Update Stock
        for (const it of verifiedItems) {
          const itemId = randomUUID();
          await tx.orderItem.create({
            data: {
              id: itemId,
              orderId: dbOrderId,
              productId: it.productId || null,
              variantId: it.variantId || null,
              name: it.name,
              quantity: it.quantity,
              priceCents: it.price_cents,
              imageUrl: it.image || null,
            },
          });

          // Decrement stock if it's a real product
          if (it.productId && dbProductsMap[it.productId] !== undefined) {
            const product = await tx.product.findUnique({ where: { id: it.productId } });
            if (product && product.stock !== null) {
              if (product.stock < it.quantity) {
                throw new Error(`Insufficient stock for product ${it.name}`);
              }
              await tx.product.update({
                where: { id: it.productId },
                data: { stock: product.stock - it.quantity },
              });
            }
          }
        }
      });
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: "Order failed: " + err.message }, { status: 400 });
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
