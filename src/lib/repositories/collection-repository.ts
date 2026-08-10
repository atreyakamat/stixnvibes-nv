import { prisma } from "@/lib/prisma";
import type { Collection } from "@prisma/client";

export class CollectionRepository {
  async list(): Promise<(Collection & { product_count?: number })[]> {
    const data = await prisma.collection.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          select: { id: true },
        },
      },
    });

    return data.map((c) => {
      const { products, ...rest } = c;
      return {
        ...rest,
        product_count: products.length,
      };
    });
  }

  async findById(id: string): Promise<Collection | null> {
    return prisma.collection.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<Collection | null> {
    return prisma.collection.findUnique({
      where: { slug },
    });
  }

  async create(payload: any): Promise<Collection> {
    return prisma.collection.create({
      data: payload,
    });
  }

  async update(id: string, payload: any): Promise<Collection> {
    return prisma.collection.update({
      where: { id },
      data: payload,
    });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.collection.delete({
      where: { id },
    });
    return true;
  }
}
