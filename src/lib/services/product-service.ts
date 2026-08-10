import { ProductRepository, type ProductListParams } from "@/lib/repositories/product-repository";
import type { Database } from "@/types/supabase";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export class ProductService {
  private repo = new ProductRepository();

  async getProducts(params: ProductListParams) {
    return this.repo.list(params);
  }

  async getProductBySlug(slug: string) {
    return this.repo.findBySlug(slug);
  }

  async getProductById(id: string) {
    return this.repo.findById(id);
  }

  async createProduct(payload: ProductInsert) {
    if (!payload.name) throw new Error("Product name is required");
    const slug = payload.slug || payload.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    return this.repo.create({
      ...payload,
      slug,
      status: payload.status || "active",
      visibility: payload.visibility || "visible",
    });
  }

  async updateProduct(id: string, payload: ProductUpdate) {
    return this.repo.update(id, payload);
  }

  async deleteProduct(id: string) {
    return this.repo.delete(id);
  }

  async toggleVisibility(id: string, visibility: "visible" | "hidden" | "archived") {
    return this.repo.setVisibility(id, visibility);
  }

  async bulkDeleteProducts(ids: string[]) {
    return this.repo.bulkDelete(ids);
  }

  async bulkUpdateProductStatus(ids: string[], status: string) {
    return this.repo.bulkUpdateStatus(ids, status);
  }
}
