import { MaterialRepository } from "@/lib/repositories/material-repository";
import type { Database } from "@/types/supabase";

type MaterialInsert = Database["public"]["Tables"]["materials"]["Insert"];
type MaterialUpdate = Database["public"]["Tables"]["materials"]["Update"];

export class MaterialService {
  private repo = new MaterialRepository();

  async getMaterials() {
    return this.repo.list();
  }

  async createMaterial(payload: MaterialInsert) {
    if (!payload.name) throw new Error("Material name is required");
    const slug = payload.slug || payload.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    return this.repo.create({ ...payload, slug });
  }

  async updateMaterial(id: string, payload: MaterialUpdate) {
    return this.repo.update(id, payload);
  }

  async deleteMaterial(id: string) {
    return this.repo.delete(id);
  }
}
