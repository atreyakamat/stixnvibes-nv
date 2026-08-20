import { PageRepository } from "@/lib/repositories/page-repository";
import type { Database } from "@/types/supabase";

type PageInsert = Database["public"]["Tables"]["pages"]["Insert"];
type PageUpdate = Database["public"]["Tables"]["pages"]["Update"];

export class PageService {
  private repo = new PageRepository();

  async getPages() {
    return this.repo.list();
  }

  async getPageBySlug(slug: string) {
    return this.repo.findBySlug(slug);
  }

  async getPageById(id: string) {
    return this.repo.findById(id);
  }

  async createPage(payload: PageInsert) {
    if (!payload.title) throw new Error("Page title is required");
    const slug = payload.slug || payload.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    return this.repo.create({ ...payload, slug });
  }

  async updatePage(id: string, payload: PageUpdate) {
    return this.repo.update(id, payload);
  }

  async deletePage(id: string) {
    return this.repo.delete(id);
  }
}
