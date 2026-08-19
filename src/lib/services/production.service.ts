import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";

export class ProductionService {
  async completeProductionJob(jobId: string) {
    return prisma.$transaction(async (tx) => {
      const existingJob = await tx.productionJob.findUnique({
        where: { id: jobId },
        include: { orderItem: true },
      });

      if (!existingJob) {
        throw new NotFoundError(`Production job ${jobId} not found`);
      }

      if (existingJob.status === "completed") {
        return existingJob; // Idempotent
      }

      const job = await tx.productionJob.update({
        where: { id: jobId },
        data: { status: "completed" },
        include: { orderItem: true },
      });

      // Check if all jobs for the order are completed
      const orderId = job.orderItem.orderId;
      const allItems = await tx.orderItem.findMany({
        where: { orderId },
        include: { productionJobs: true },
      });

      const allCompleted = allItems.every((item) =>
        item.productionJobs.length > 0 &&
        item.productionJobs.every((j) =>
          j.id === jobId ? true : j.status === "completed"
        )
      );

      if (allCompleted) {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (order && (order.status === "production" || order.status === "printing")) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "qc" },
          });
        }
      }

      return job;
    });
  }
}

