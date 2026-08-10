import { prisma } from "@/lib/prisma";
import { Prisma, type Product, $Enums } from "@prisma/client";

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
    
    let where: Prisma.ProductWhereInput = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { sku: { contains: params.search, mode: 'insensitive' } },
        { type: { equals: params.search as any } }
      ];
    }
    
    if (params.status && params.status !== "all") {
      where.status = params.status;
    }

    if (params.visibility && params.visibility !== "all") {
      where.visibility = params.visibility;
    }
    
    if (params.type && params.type !== "all") {
      where.type = params.type as $Enums.product_type;
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

  async create(payload: Prisma.ProductUncheckedCreateInput): Promise<Product> {
    return prisma.product.create({ data: payload });
  }

  async update(id: string, payload: Prisma.ProductUncheckedUpdateInput): Promise<Product> {
    return prisma.product.update({ where: { id }, data: payload });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.product.delete({ where: { id } });
    return true;
  }

  async setVisibility(id: string, visibility: "visible" | "hidden" | "archived"): Promise<Product> {
    return prisma.product.update({ where: { id }, data: { visibility } });
  }

  async bulkDelete(ids: string[]): Promise<number> {
    const { count } = await prisma.product.deleteMany({
      where: { id: { in: ids } }
    });
    return count;
  }

  async bulkUpdateStatus(ids: string[], status: string): Promise<number> {
    const { count } = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status }
    });
    return count;
  }
}
