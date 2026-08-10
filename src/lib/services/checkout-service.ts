import { randomUUID } from "crypto";
import { createRazorpayOrder, isRazorpayConfigured, RAZORPAY_KEY_ID } from "@/lib/payment/razorpay";
import { products, type Product } from "@/lib/data/products";
import { prisma } from "@/lib/prisma";

export interface CheckoutRequestBody {
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

export class CheckoutService {
  async processCheckout(body: CheckoutRequestBody) {
    const { items, shippingAddress, couponCode, paymentMethod = "razorpay" } = body;

    const cleanPincode = shippingAddress.pincode.trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      throw new Error("Please enter a valid 6-digit Indian PIN code");
    }

    const cleanName = sanitize(shippingAddress.name);
    const cleanPhone = sanitize(shippingAddress.phone);
    const cleanAddress = sanitize(shippingAddress.address);
    const cleanNotes = shippingAddress.notes ? sanitize(shippingAddress.notes) : null;
    const cleanEmail = shippingAddress.email ? sanitize(shippingAddress.email) : null;

    let verifiedSubtotalCents = 0;
    const verifiedItems: any[] = [];

    const productIds = items.map((i) => i.productId).filter(Boolean);
    let dbProductsMap: Record<string, any> = {};
    
    if (productIds.length > 0) {
      const validUUIDs = productIds.filter(id => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i.test(id));
      const slugs = productIds.filter(id => !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i.test(id));

      const orConditions = [];
      if (validUUIDs.length > 0) orConditions.push({ id: { in: validUUIDs } });
      if (slugs.length > 0) orConditions.push({ slug: { in: slugs } });

      if (orConditions.length > 0) {
        const dbProds = await prisma.product.findMany({
          where: { OR: orConditions },
          select: { id: true, slug: true, priceCents: true, stock: true },
        });
        dbProds.forEach(p => {
          dbProductsMap[p.id] = { priceCents: p.priceCents, stock: p.stock, id: p.id };
          if (p.slug) {
            dbProductsMap[p.slug] = { priceCents: p.priceCents, stock: p.stock, id: p.id };
          }
        });
      }
    }

    for (const item of items) {
      const qty = Math.max(1, Math.min(99, item.quantity));
      const mockProd = products.find((p: Product) => p.id === item.productId || p.slug === item.productId);
      const dbProd = dbProductsMap[item.productId];
      const verifiedPriceCents =
        dbProd ? dbProd.priceCents :
        (mockProd ? Math.round(mockProd.price * 100) : Math.max(0, item.price_cents));

      verifiedSubtotalCents += verifiedPriceCents * qty;
      verifiedItems.push({
        ...item,
        productId: dbProd ? dbProd.id : item.productId,
        quantity: qty,
        price_cents: verifiedPriceCents,
      });
    }

    let discountCents = 0;
    const cleanCoupon = couponCode ? couponCode.trim().toUpperCase() : null;
    const isWholesaleOrder = verifiedSubtotalCents >= 500000;

    if (cleanCoupon && VALID_COUPONS[cleanCoupon]) {
      if (isWholesaleOrder) {
        throw new Error("Promo coupon codes cannot be stacked with corporate wholesale discounts.");
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

    await prisma.$transaction(async (tx) => {
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

      const orderItemsData = verifiedItems.map(it => ({
        id: randomUUID(),
        orderId: dbOrderId,
        productId: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i.test(it.productId || "") ? it.productId : null,
        variantId: it.variantId || null,
        name: it.name,
        quantity: it.quantity,
        priceCents: it.price_cents,
        imageUrl: it.image || null,
      }));

      await tx.orderItem.createMany({
        data: orderItemsData,
      });

      const stockUpdates = [];
      for (const it of verifiedItems) {
        const isValidUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i.test(it.productId || "");
        
        if (isValidUUID && dbProductsMap[it.productId] !== undefined) {
          const currentStock = dbProductsMap[it.productId].stock;
          if (currentStock !== null && currentStock < it.quantity) {
            throw new Error(`Insufficient stock for product ${it.name}`);
          }
          
          stockUpdates.push(
            tx.product.update({
              where: { id: it.productId },
              data: { stock: { decrement: it.quantity } },
            })
          );
        }
      }

      if (stockUpdates.length > 0) {
        await Promise.all(stockUpdates);
      }
    });

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

    return {
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
    };
  }
}
