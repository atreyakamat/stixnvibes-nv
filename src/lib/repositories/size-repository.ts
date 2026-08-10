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
      data: payload,
    });
  }

  async update(id: string, payload: any): Promise<Size> {
    return prisma.size.update({
      where: { id },
      data: payload,
    });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.size.delete({
      where: { id },
    });
    return true;
  }
}
