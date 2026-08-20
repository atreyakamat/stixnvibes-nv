import { prisma } from "@/lib/prisma";
import type { Size } from "@prisma/client";

export class SizeRepository {
  async list(category?: string): Promise<Size[]> {
    return prisma.size.findMany({
      where: category && category !== "all" ? { category } : undefined,
      orderBy: { sortOrder: "asc" },
    });
  }

  async create(payload: any): Promise<Size> {
    return prisma.size.create({
      data: {
        id: payload.id,
        name: payload.name,
        slug: payload.slug,
        widthMm: payload.widthMm ?? payload.width_mm,
        heightMm: payload.heightMm ?? payload.height_mm,
        category: payload.category,
        isActive: payload.isActive ?? payload.is_active ?? true,
        sortOrder: payload.sortOrder ?? payload.sort_order ?? 0,
      },
    });
  }

  async findById(id: string): Promise<Size | null> {
    return prisma.size.findUnique({
      where: { id },
    });
  }

  async update(id: string, payload: any): Promise<Size> {
    return prisma.size.update({
      where: { id },
      data: {
        name: payload.name,
        slug: payload.slug,
        widthMm: payload.widthMm ?? payload.width_mm,
        heightMm: payload.heightMm ?? payload.height_mm,
        category: payload.category,
        isActive: payload.isActive ?? payload.is_active,
        sortOrder: payload.sortOrder ?? payload.sort_order,
      },
    });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.size.delete({
      where: { id },
    });
    return true;
  }
}
