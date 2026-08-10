import { prisma } from "@/lib/prisma";
import type { StoreSetting } from "@prisma/client";

export class SettingsRepository {
  async get<T = unknown>(key: string): Promise<T | null> {
    const setting = await prisma.storeSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    return (setting?.value as T) ?? null;
  }

  async list(category?: string): Promise<StoreSetting[]> {
    return prisma.storeSetting.findMany({
      where: category ? { category } : undefined,
    });
  }

  async set(key: string, value: unknown, category = "general", description?: string): Promise<StoreSetting> {
    return prisma.storeSetting.upsert({
      where: { key },
      update: {
        value: value as any,
        category,
        description: description || null,
      },
      create: {
        key,
        value: value as any,
        category,
        description: description || null,
      },
    });
  }

  async delete(key: string): Promise<boolean> {
    await prisma.storeSetting.delete({
      where: { key },
    });
    return true;
  }
}
