import { CategoryRepository } from "@/lib/repositories/category-repository";
import type { Database } from "@/types/supabase";

type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export class CategoryService {
  private repo = new CategoryRepository();

  async getCategories() {
    return this.repo.listAll();
  }

  async getCategoryBySlug(slug: string) {
    return this.repo.getBySlug(slug);
  }

  async getCategoryById(id: string) {
    return this.repo.findById(id);
  }

  async getCategoryTree() {
    return this.repo.getTree();
  }

  async createCategory(payload: CategoryInsert) {
    if (!payload.name) throw new Error("Category name is required");
    const slug = payload.slug || payload.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    return this.repo.create({ ...payload, slug });
  }

  async updateCategory(id: string, payload: CategoryUpdate) {
    return this.repo.update(id, payload);
  }

  async deleteCategory(id: string) {
    return this.repo.delete(id);
  }
}
