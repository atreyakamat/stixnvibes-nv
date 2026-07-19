import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amountInRupees: number, opts: {currency?: "INR" | "USD"} = {}) {
  const currency = opts.currency ?? "INR";
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return formatter.format(amountInRupees);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "\u2026";
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
