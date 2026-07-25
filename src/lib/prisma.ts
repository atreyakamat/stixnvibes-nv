/**
 * Prisma client stub. The architecture uses Supabase + service role
 * (see `src/lib/supabase/service.ts`); this file is intentionally a no-op
 * so older imports keep compiling until they migrate.
 *
 * If you later add `@prisma/client` to dependencies you can replace this with
 * the real generated client.
 */

type AnyClient = any;

interface PrismaLike {
  [key: string]: any;
}

declare global {
  // eslint-disable-next-line no-var
  var __snvPrismaClient: PrismaLike | undefined;
}

export const prisma: PrismaLike =
  globalThis.__snvPrismaClient ??
  new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return undefined;
        if (typeof prop === "string") {
          throw new Error(
            `[prisma stub] Unexpected access to prisma.${String(
              prop
            )}. Use Supabase (src/lib/supabase) instead.`
          );
        }
        return undefined;
      },
    }
  ) as PrismaLike;

if (process.env.NODE_ENV !== "production") {
  globalThis.__snvPrismaClient = prisma;
}

// Backwards-compatible types — leaving the original imports intact.
export type PrismaClient<T = AnyClient> = T;
