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
      data: {
        id: payload.id,
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        properties: payload.properties ?? {},
        costPerUnitCents: payload.costPerUnitCents ?? payload.cost_per_unit_cents ?? 0,
        isActive: payload.isActive ?? payload.is_active ?? true,
        sortOrder: payload.sortOrder ?? payload.sort_order ?? 0,
      },
    });
  }

  async findById(id: string): Promise<Material | null> {
    return prisma.material.findUnique({
      where: { id },
    });
  }

  async update(id: string, payload: any): Promise<Material> {
    return prisma.material.update({
      where: { id },
      data: {
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        properties: payload.properties,
        costPerUnitCents: payload.costPerUnitCents ?? payload.cost_per_unit_cents,
        isActive: payload.isActive ?? payload.is_active,
        sortOrder: payload.sortOrder ?? payload.sort_order,
      },
    });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.material.delete({
      where: { id },
    });
    return true;
  }
}
