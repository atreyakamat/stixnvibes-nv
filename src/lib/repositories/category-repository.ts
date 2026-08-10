import { prisma } from "@/lib/prisma";
import type { Category } from "@prisma/client";

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export class CategoryRepository {
  async listAll(): Promise<Category[]> {
    return prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }

  async getBySlug(slug: string): Promise<Category | null> {
    return prisma.category.findUnique({
      where: { slug },
    });
  }

  async getTree(): Promise<{ flat: Category[]; tree: CategoryNode[] }> {
    const flat = await this.listAll();
    const map = new Map<string, CategoryNode>();
    const tree: CategoryNode[] = [];

    for (const cat of flat) {
      map.set(cat.id, { ...cat, children: [] });
    }
    for (const cat of flat) {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(node);
      } else {
        tree.push(node);
      }
    }

    return { flat, tree };
  }

  async create(payload: any): Promise<Category> {
    return prisma.category.create({
      data: payload,
    });
  }

  async update(id: string, payload: any): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data: payload,
    });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.category.delete({
      where: { id },
    });
    return true;
  }
}
