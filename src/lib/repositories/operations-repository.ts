import { prisma } from "@/lib/prisma";
import type { PrintBatch, QualityCheck } from "@prisma/client";

export class OperationsRepository {
  async getPrintBatches(limit = 100): Promise<PrintBatch[]> {
    return prisma.printBatch.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async createPrintBatch(params: {
    material: string;
    finish: string;
    size: string;
    orderCount?: number;
    estTimeMins?: number;
    operator?: string;
  }): Promise<PrintBatch> {
    const batchNumber = `BATCH-${Math.floor(1000 + Math.random() * 9000)}`;
    return prisma.printBatch.create({
      data: {
        batchNumber,
        material: params.material,
        finish: params.finish,
        size: params.size,
        orderCount: params.orderCount || 1,
        status: "queued",
        estTimeMins: params.estTimeMins || 30,
        operator: params.operator || "Operator",
      },
    });
  }

  async updateBatchStatus(batchId: string, status: string): Promise<PrintBatch> {
    return prisma.printBatch.update({
      where: { id: batchId },
      data: { status },
    });
  }

  async getQualityChecks(limit = 100): Promise<QualityCheck[]> {
    return prisma.qualityCheck.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async recordQualityCheck(params: {
    productionJobId: string;
    operator: string;
    result: string;
    checklist?: Record<string, boolean>;
  }): Promise<QualityCheck> {
    return prisma.qualityCheck.create({
      data: {
        productionJobId: params.productionJobId,
        operator: params.operator || "Operator",
        result: params.result,
        checklist: (params.checklist as any) || {},
      },
    });
  }
}
