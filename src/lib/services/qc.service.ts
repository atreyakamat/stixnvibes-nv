import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";

export class QcService {
  async recordQcResult(productionJobId: string, operator: string, result: "passed" | "failed", failureReason?: string) {
    if (result !== "passed" && result !== "failed") {
      throw new ValidationError("QC result must be either 'passed' or 'failed'");
    }

    return prisma.$transaction(async (tx) => {
      const job = await tx.productionJob.findUnique({
        where: { id: productionJobId },
        include: { orderItem: true },
      });

      if (!job) {
        throw new NotFoundError(`Production job ${productionJobId} not found`);
      }

      const orderId = job.orderItem.orderId;
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundError(`Order ${orderId} not found`);
      }

      if (order.status !== "qc" && order.status !== "qc_failed" && order.status !== "printing") {
        throw new ValidationError(`Cannot perform QC on order in '${order.status}' status. Must be in 'qc' status.`);
      }

      const qc = await tx.qualityCheck.create({
        data: {
          productionJobId,
          operator: operator || "system_inspector",
          result,
          failureReason: result === "failed" ? failureReason ?? "QC inspection failed" : null,
        },
      });

      if (result === "failed") {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "qc_failed" },
        });
      } else if (result === "passed") {
        // Check if all production jobs for this order have passed QC
        const allItems = await tx.orderItem.findMany({
          where: { orderId },
          include: {
            productionJobs: {
              include: { qcInspections: true },
            },
          },
        });

        const allJobsPassed = allItems.every((item) =>
          item.productionJobs.length > 0 &&
          item.productionJobs.every((j) =>
            j.id === productionJobId
              ? true
              : j.qcInspections.some((q) => q.result === "passed")
          )
        );

        if (allJobsPassed) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "packing" },
          });
        }
      }

      return qc;
    });
  }
}

