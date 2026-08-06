import { CollectionRepository } from "@/lib/repositories/collection-repository";
import type { Database } from "@/types/supabase";

type CollectionInsert = Database["public"]["Tables"]["collections"]["Insert"];
type CollectionUpdate = Database["public"]["Tables"]["collections"]["Update"];

export class CollectionService {
  private repo = new CollectionRepository();

  async getCollections() {
    return this.repo.list();
  }

  async getCollectionById(id: string) {
    return this.repo.findById(id);
  }

  async createCollection(payload: CollectionInsert) {
    if (!payload.name) throw new Error("Collection name is required");
    const slug = payload.slug || payload.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    return this.repo.create({ ...payload, slug });
  }

  async updateCollection(id: string, payload: CollectionUpdate) {
    return this.repo.update(id, payload);
  }

  async deleteCollection(id: string) {
    return this.repo.delete(id);
  }
}
