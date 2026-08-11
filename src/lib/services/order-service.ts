import { OrderRepository, type OrderListParams } from "@/lib/repositories/order-repository";
import { validateStateTransition } from "@/lib/orders/state-machine";
import { $Enums } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";
import { products } from "@/lib/data/products";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { createService } from "@/lib/supabase/service";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/errors";

export class OrderService {
  private repo = new OrderRepository();

  async getOrders(params: OrderListParams) {
    return this.repo.list(params);
  }

  async getOrder(id: string) {
    return this.repo.findById(id);
  }

  async updateOrderStatus(id: string, nextStatus: $Enums.order_status) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Order not found");

    validateStateTransition(existing.status, nextStatus);

    return this.repo.updateStatus(id, nextStatus);
  }

  async updateOrderNotes(id: string, notes: string) {
    return this.repo.updateNotes(id, notes);
  }

  async updateTracking(id: string, tracking_number: string, courier: string) {
    return this.repo.updateTracking(id, tracking_number, courier);
  }

  async publicCreateOrder(payload: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string | null;
    address: string;
    pincode: string;
    notes?: string;
    items: Array<{
      product_id?: string;
      variant_id?: string | null;
      name: string;
      quantity?: number;
      price_cents: number;
      image_url?: string;
      variant_name?: string;
    }>;
  }) {
    const sanitize = (str: string) => str.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

    const cleanName = sanitize(payload.customer_name);
    const cleanPhone = sanitize(payload.customer_phone);
    const cleanAddress = sanitize(payload.address);
    const cleanPincode = sanitize(payload.pincode);
    const cleanNotes = payload.notes ? sanitize(payload.notes) : undefined;
    const cleanEmail = payload.customer_email ? sanitize(payload.customer_email) : null;

    const generatedId = randomUUID();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const seq = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-${dateStr}-${seq}`;

    const items = payload.items;
    const quantities = items.map((i: any) => (typeof i.quantity === "number" ? i.quantity : 1));

    const productIds = items.map((i) => i.product_id).filter(Boolean);
    let dbProductsMap: Record<string, any> = {};

    if (productIds.length > 0) {
      const validUUIDs = productIds.filter(id => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i.test(id!));
      const slugs = productIds.filter(id => !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i.test(id!));

      const orConditions = [];
      if (validUUIDs.length > 0) orConditions.push({ id: { in: validUUIDs as string[] } });
      if (slugs.length > 0) orConditions.push({ slug: { in: slugs as string[] } });

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

    const verifiedItems = [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const mockProd = products.find((p: any) => p.id === item.product_id || p.slug === item.product_id);
      const dbProd = dbProductsMap[item.product_id ?? ""];
      
      let verifiedPrice = 0;
      if (dbProd) {
        verifiedPrice = dbProd.priceCents;
      } else if (mockProd) {
        verifiedPrice = Math.round(mockProd.price * 100);
      } else if (item.product_id === "spotify_acrylic_card") {
        if (item.price_cents < 99900) throw new ValidationError("Invalid price for custom Spotify card");
        verifiedPrice = item.price_cents;
      } else if (item.product_id === "custom_sticker_studio") {
        if (item.price_cents < 4900) throw new ValidationError("Invalid price for custom sticker");
        verifiedPrice = item.price_cents;
      } else {
        throw new ValidationError(`Product ${item.product_id} not found in catalog.`);
      }

      verifiedItems.push({
        ...item,
        name: sanitize(item.name),
        quantity: quantities[idx],
        price_cents: verifiedPrice,
      });
    }

    const totalCents = verifiedItems.reduce((sum: number, item: any) => sum + item.price_cents * item.quantity, 0);

    const whatsappItems = verifiedItems.map((item: any, idx: number) => ({
      id: item.variant_id ?? item.product_id ?? `${item.name}-${idx}`,
      productId: item.product_id!,
      name: item.name,
      price_cents: item.price_cents,
      quantity: item.quantity,
      image: item.image_url,
      variantName: item.variant_name,
    }));

    const waUrl = buildWhatsAppUrl({
      orderId: generatedId,
      orderNumber,
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
          id: generatedId,
          order_number: orderNumber,
          whatsapp_status: "SENT",
          customer_name: cleanName,
          customer_phone: cleanPhone,
          customer_email: cleanEmail,
          address: cleanAddress,
          pincode: cleanPincode,
          total_cents: totalCents,
          status: "sent",
          whatsapp_url: waUrl,
          notes: cleanNotes ?? null,
          metadata: {
            order_number: orderNumber,
            whatsapp_status: "SENT",
            order_status: "WAITING_FOR_CONFIRMATION",
          },
        };
        const itemInserts = verifiedItems.map((i: any) => ({
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
          orderId = generatedId;
        }
      }
    } catch (e) {
      console.error("[api/orders/create] Unexpected:", e);
    }

    return {
      whatsappUrl: waUrl,
      orderId: generatedId,
      orderNumber,
      persisted: Boolean(orderId),
    };
  }

  async trackOrder(query: string) {
    const admin = createService();
    if (admin) {

    try {
      const { data, error } = await admin
        .from("orders")
        .select("id, created_at, customer_name, customer_phone, total_cents, status, address, pincode, whatsapp_url, order_items(*), shipments(*)")
        .or(`id.eq.${query},customer_phone.eq.${query}`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data && data.length > 0) {
        const primary = data[0];
        const shipment = primary.shipments && primary.shipments.length > 0 ? primary.shipments[0] : null;

        return {
          found: true,
          data: {
            orderId: primary.id,
            customerName: primary.customer_name,
            placedDate: new Date(primary.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
            estimatedDelivery: shipment ? "2-4 Business Days" : "Pending Dispatch",
            courier: shipment ? shipment.courier : "TBD",
            awb: shipment ? shipment.awb : "TBD",
            currentStatus: shipment ? shipment.status : primary.status,
            destination: `${primary.address} (${primary.pincode})`,
            items: primary.order_items || [],
          },
        };
      }
    } catch (err) {
      console.warn("[orders/track] Supabase lookup error:", err);
    }
    }

    throw new NotFoundError(`No order found matching "${query}". Please check your Order ID or registered mobile number. Tracking becomes available after the order is saved in the live system.`);
  }
}

