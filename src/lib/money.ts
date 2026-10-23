const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatINR(paise: number): string {
  return inr.format(paise / 100);
}

/** Parses a rupee amount typed by a person ("149", "149.50", "1,299"). */
export function rupeesToPaise(input: string): number | null {
  const clean = input.replace(/[₹,\s]/g, "");
  if (clean === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return Number.NaN;
  return Math.round(Number(clean) * 100);
}

export function paiseToRupees(paise: number | null): string {
  if (paise === null) return "";
  return (paise / 100).toFixed(paise % 100 === 0 ? 0 : 2);
}
