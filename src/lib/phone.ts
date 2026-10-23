/**
 * Indian mobile numbers as 10 digits. Accepts what people actually type:
 * spaces, dashes, a leading 0, +91 or 91. Returns null for anything else.
 */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/** "98765 43210" for display. */
export const formatPhone = (p: string) => (p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p);

/** wa.me wants the country code. */
export const waNumber = (p: string) => (p.length === 10 ? `91${p}` : p);
