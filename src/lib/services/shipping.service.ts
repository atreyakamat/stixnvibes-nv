import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

export class ShippingService {
  async createShipment(orderId: string, courier: string, awb: string) {
    if (!courier || !awb) {
      throw new ValidationError("Courier and AWB are required");
    }

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }

      // Check for existing shipment for this order
      const existingShipment = await tx.shipment.findUnique({ where: { orderId } });
      if (existingShipment) {
        throw new ConflictError(`Shipment already exists for order ${orderId} with AWB ${existingShipment.awb}`);
      }

      // Check AWB uniqueness
      const duplicateAwb = await tx.shipment.findUnique({ where: { awb } });
      if (duplicateAwb) {
        throw new ConflictError(`AWB ${awb} is already assigned to another shipment`);
      }

      // Validate order status — must be packing to move to shipped
      if (order.status !== "packing" && order.status !== "shipped") {
        throw new ValidationError(`Cannot ship order in '${order.status}' status. Order must be in 'packing' status.`);
      }

      const shipment = await tx.shipment.create({
        data: {
          orderId,
          courier,
          awb,
          status: "manifested",
        },
      });

      if (order.status !== "shipped") {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "shipped" },
        });
      }

      return shipment;
    });
  }

  async confirmDelivery(orderId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }

      if (order.status !== "shipped" && order.status !== "delivered") {
        throw new ValidationError(`Cannot deliver order in '${order.status}' status. Order must be in 'shipped' status.`);
      }

      const shipment = await tx.shipment.findUnique({ where: { orderId } });
      if (shipment) {
        await tx.shipment.update({
          where: { id: shipment.id },
          data: { status: "delivered" },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: "delivered" },
      });

      return updatedOrder;
    });
  }
}

