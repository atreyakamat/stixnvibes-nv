import type { Coupon } from "@/lib/types";

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

const DAY_MS = 86_400_000;

/** Things worth a look on a live code: nobody using it, nearly used up, or ending soon. */
export function codeHeadsUp(c: Coupon, uses: number, now: number): string[] {
  if (!c.active || (c.endsAt && Date.parse(c.endsAt) <= now) || (c.startsAt && Date.parse(c.startsAt) > now)) return [];
  const out: string[] = [];
  const live = Math.max(now - Date.parse(c.startsAt ?? c.createdAt), 0);
  if (uses === 0 && live >= 3 * DAY_MS) out.push(`No orders in ${Math.floor(live / DAY_MS)} days. Is the QR or code reaching people?`);
  if (c.maxUses !== null && uses < c.maxUses && uses / c.maxUses >= 0.8) out.push(`${c.maxUses - uses} uses left of ${c.maxUses}.`);
  if (c.endsAt && Date.parse(c.endsAt) - now <= 3 * DAY_MS) out.push(`Ends ${day.format(new Date(c.endsAt))}.`);
  return out;
}

