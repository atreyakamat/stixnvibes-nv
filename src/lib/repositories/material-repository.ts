import { prisma } from "@/lib/prisma";
import type { Material } from "@prisma/client";

export class MaterialRepository {
  async list(): Promise<Material[]> {
    return prisma.material.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }

  async create(payload: any): Promise<Material> {
    return prisma.material.create({
      data: payload,
    });
  }

  async update(id: string, payload: any): Promise<Material> {
    return prisma.material.update({
      where: { id },
      data: payload,
    });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.material.delete({
      where: { id },
    });
    return true;
  }
}
