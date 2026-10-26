import { CUSTOM_KINDS, PRODUCT_TYPES } from "@/lib/types";

export const kindLabel = (k: string) => PRODUCT_TYPES.find((t) => t.id === k)?.one ?? (k === "other" ? "Something else" : k);
export const CUSTOM_KIND_OPTIONS = CUSTOM_KINDS.map((k) => ({ id: k, label: kindLabel(k) }));
