import { prisma } from "@/lib/prisma";
import type { Product } from "@prisma/client";

export interface ProductListParams {
  search?: string;
  type?: string;
  status?: string;
  visibility?: string;
  limit?: number;
  offset?: number;
  sort?: "name" | "price" | "stock" | "created_at";
  order?: "asc" | "desc";
}

export class ProductRepository {
  async list(params: ProductListParams = {}): Promise<{ data: Product[]; total: number }> {
    const limit = Math.min(params.limit ?? 100, 500);
    const offset = params.offset ?? 0;
    const sortField = params.sort ?? "createdAt"; // map created_at to createdAt
    const sortOrder = params.order ?? "desc";
    
    let where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { type: { equals: params.search as any } }
      ];
    }
    
    if (params.type && params.type !== "all") {
      where.type = params.type;
    }
    
    // Fallback sort field mapping
    let prismaSortField = sortField;
    if (sortField === "created_at") prismaSortField = "createdAt";
    if (sortField === "price") prismaSortField = "priceCents";
    
    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [prismaSortField]: sortOrder },
        include: {
          category: true,
          collection: true,
        }
      }),
      prisma.product.count({ where }),
    ]);
    
    return { data, total };
  }

  async findById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { slug } });
  }

  async create(payload: any): Promise<Product> {
    // Exclude invalid fields
    const { status, visibility, sku, ...data } = payload;
    return prisma.product.create({ data });
  }

  async update(id: string, payload: any): Promise<Product> {
    const { status, visibility, sku, ...data } = payload;
    return prisma.product.update({ where: { id }, data });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.product.delete({ where: { id } });
    return true;
  }

  async setVisibility(id: string, visibility: "visible" | "hidden" | "archived"): Promise<Product> {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new Error("Product not found");
    
    const metadata = (product.metadata as any) || {};
    metadata.visibility = visibility;
    
    return prisma.product.update({ where: { id }, data: { metadata } });
  }

  async bulkDelete(ids: string[]): Promise<number> {
    const { count } = await prisma.product.deleteMany({
      where: { id: { in: ids } }
    });
    return count;
  }

  async bulkUpdateStatus(ids: string[], status: string): Promise<number> {
    // We update status in metadata for now if status isn't a column
    // Wait, the products table doesn't have a status column. Let's update metadata.
    const products = await prisma.product.findMany({ where: { id: { in: ids } }});
    
    let updatedCount = 0;
    for (const product of products) {
      const metadata = (product.metadata as any) || {};
      metadata.status = status;
      await prisma.product.update({ where: { id: product.id }, data: { metadata }});
      updatedCount++;
    }
    return updatedCount;
  }
}
