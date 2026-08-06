import { randomUUID } from "crypto";
import { createService } from "@/lib/supabase/service";
import type { Database } from "@/types/supabase";

type PrintBatchRow = Database["public"]["Tables"]["print_batches"]["Row"];
type QualityCheckRow = Database["public"]["Tables"]["quality_checks"]["Row"];

export class OperationsRepository {
  private getClient() {
    const service = createService();
    if (!service) throw new Error("Database service unavailable");
    return service;
  }

  async getPrintBatches(limit = 100): Promise<PrintBatchRow[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from("print_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as PrintBatchRow[];
  }

  async createPrintBatch(params: {
    material: string;
    finish: string;
    size: string;
    orderCount?: number;
    estTimeMins?: number;
    operator?: string;
  }): Promise<PrintBatchRow> {
    const client = this.getClient();
    const batchNumber = `BATCH-${Math.floor(1000 + Math.random() * 9000)}`;
    const payload = {
      id: randomUUID(),
      batch_number: batchNumber,
      material: params.material,
      finish: params.finish,
      size: params.size,
      order_count: params.orderCount || 1,
      status: "queued",
      est_time_mins: params.estTimeMins || 30,
      operator: params.operator || "Operator",
    };

    const { data, error } = await client
      .from("print_batches")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as PrintBatchRow;
  }

  async updateBatchStatus(batchId: string, status: string): Promise<PrintBatchRow> {
    const client = this.getClient();
    const { data, error } = await client
      .from("print_batches")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", batchId)
      .select()
      .single();

    if (error) throw error;
    return data as PrintBatchRow;
  }

  async getQualityChecks(limit = 100): Promise<QualityCheckRow[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from("quality_checks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as QualityCheckRow[];
  }

  async recordQualityCheck(params: {
    orderId?: string | null;
    productionJobId?: string | null;
    operator: string;
    result: string;
    checklist?: Record<string, boolean>;
  }): Promise<QualityCheckRow> {
    const client = this.getClient();
    const payload = {
      id: randomUUID(),
      order_id: params.orderId || null,
      production_job_id: params.productionJobId || null,
      operator: params.operator || "Operator",
      result: params.result,
      checklist: (params.checklist as any) || {},
    };

    const { data, error } = await client
      .from("quality_checks")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as QualityCheckRow;
  }
}
