import { prisma } from "@/lib/prisma";
import type { Page } from "@prisma/client";

export class PageRepository {
  async list(): Promise<Page[]> {
    return prisma.page.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }

  async findBySlug(slug: string): Promise<Page | null> {
    return prisma.page.findUnique({
      where: { slug },
    });
  }

  async findById(id: string): Promise<Page | null> {
    return prisma.page.findUnique({
      where: { id },
    });
  }

  async create(payload: any): Promise<Page> {
    return prisma.page.create({
      data: payload,
    });
  }

  async update(id: string, payload: any): Promise<Page> {
    return prisma.page.update({
      where: { id },
      data: payload,
    });
  }

  async delete(id: string): Promise<boolean> {
    await prisma.page.delete({
      where: { id },
    });
    return true;
  }
}
