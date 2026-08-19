import { verifyWebhookSignature } from "@/lib/payment/razorpay";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/lib/state-machine/order-state-machine";

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
    }

    if (!verifyWebhookSignature(payload, signature)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    const event = JSON.parse(payload);
    
    // Check webhook idempotency
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId: event.id },
    });

    if (existingEvent) {
      return new Response(JSON.stringify({ message: "Event already processed", eventId: event.id }), { status: 200 });
    }

    // Persist event before processing
    await prisma.paymentWebhookEvent.create({
      data: {
        eventId: event.id,
        eventType: event.event,
        payload: event,
        status: "processing",
      },
    });

    // Handle payment.captured
    if (event.event === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const rpOrderId = paymentEntity?.order_id;
      const amountPaise = paymentEntity?.amount;
      
      if (!rpOrderId) {
        throw new Error("Missing order_id in payment entity");
      }

      const dbPayment = await prisma.payment.findFirst({
        where: { providerOrderId: rpOrderId },
      });

      if (dbPayment) {
        // Amount verification
        if (amountPaise !== undefined && amountPaise !== dbPayment.amountCents) {
          console.error(`[webhook] Amount mismatch for payment ${dbPayment.id}: expected ${dbPayment.amountCents}, received ${amountPaise}`);
          await prisma.paymentWebhookEvent.update({
            where: { eventId: event.id },
            data: { status: "failed", error: "Amount mismatch" },
          });
          return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: dbPayment.id },
            data: { 
              status: "paid", 
              providerPaymentId: paymentEntity.id,
              paidAt: new Date(),
            },
          });

          const order = await tx.order.findUnique({ where: { id: dbPayment.orderId } });
          
          if (order && order.status !== "cancelled" && order.status !== "refunded") {
            await tx.order.update({
              where: { id: order.id },
              data: { status: "paid" },
            });
            
            // Mark reservation as committed
            await tx.inventoryReservation.updateMany({
              where: { orderId: order.id, status: "active" },
              data: { status: "committed" },
            });
          }
        });
      }
    }

    // Handle payment.failed
    if (event.event === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity;
      const rpOrderId = paymentEntity?.order_id;
      const failureReason = paymentEntity?.error_description || "Payment failed";

      if (rpOrderId) {
        const dbPayment = await prisma.payment.findFirst({
          where: { providerOrderId: rpOrderId },
        });

        if (dbPayment) {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: dbPayment.id },
              data: {
                status: "failed",
                failureReason,
              },
            });

            const order = await tx.order.findUnique({ where: { id: dbPayment.orderId } });
            if (order && order.status !== "paid" && order.status !== "cancelled") {
              await tx.order.update({
                where: { id: order.id },
                data: { status: "payment_failed" },
              });
            }
          });
        }
      }
    }

    // Mark event processed
    await prisma.paymentWebhookEvent.update({
      where: { eventId: event.id },
      data: { status: "processed", processedAt: new Date() },
    });

    return new Response(JSON.stringify({ ok: true, eventId: event.id }), { status: 200 });
  } catch (error: any) {
    console.error("[webhook] Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

