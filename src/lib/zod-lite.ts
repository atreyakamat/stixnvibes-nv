/**
 * Tiny zero-dep validator helpers used by API route handlers.
 * Avoids pulling in zod until the schema gets nontrivial.
 */

export const z = {
  email(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  },
  uuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  },
  slug(value: string): boolean {
    return /^[a-z0-9-]+$/.test(value);
  },
};
