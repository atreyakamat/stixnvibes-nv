import { SizeRepository } from "@/lib/repositories/size-repository";
import type { Database } from "@/types/supabase";

type SizeInsert = Database["public"]["Tables"]["sizes"]["Insert"];
type SizeUpdate = Database["public"]["Tables"]["sizes"]["Update"];

export class SizeService {
  private repo = new SizeRepository();

  async getSizes(category?: string) {
    return this.repo.list(category);
  }

  async createSize(payload: SizeInsert) {
    if (!payload.name) throw new Error("Size name is required");
    const slug = payload.slug || payload.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    return this.repo.create({ ...payload, slug });
  }

  async updateSize(id: string, payload: SizeUpdate) {
    return this.repo.update(id, payload);
  }

  async deleteSize(id: string) {
    return this.repo.delete(id);
  }
}
