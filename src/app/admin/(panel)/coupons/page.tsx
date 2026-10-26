import type { Metadata } from "next";
import Link from "next/link";
import { deleteCouponAction } from "@/app/admin/actions";
import { CouponForm } from "@/components/admin/coupon-form";
import { ConfirmSubmit } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/session";
import { formatINR } from "@/lib/money";
import { getStore } from "@/lib/store";
import type { Coupon } from "@/lib/types";

export const metadata: Metadata = { title: "Codes & QR" };

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

function state(c: Coupon, uses: number, now: number) {
  if (!c.active) return "Off";
  if (c.endsAt && Date.parse(c.endsAt) <= now) return "Ended";
  if (c.startsAt && Date.parse(c.startsAt) > now) return `Starts ${day.format(new Date(c.startsAt))}`;
  if (c.maxUses !== null && uses >= c.maxUses) return "Used up";
  return c.endsAt ? `Running till ${day.format(new Date(c.endsAt))}` : "Running";
}

export default async function CouponsPage() {
  await requireAdmin();
  const store = getStore();
  const coupons = await store.listCoupons();
  const uses = await Promise.all(coupons.map((c) => store.couponUses(c.code)));
  const now = new Date().getTime();

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-3">
        <h1 className="display text-5xl">Codes &amp; QR</h1>
        <p className="text-paper/70">
          A code takes % or ₹ off what&apos;s left after your offers. Each one gets a printable QR card: scanning it opens the shop with the code already applied, and
          Analytics shows how many visits and sales it brought. Make one per stall or event, like <span className="font-mono">WORDSUP10</span>.
        </p>
        <p className="text-sm text-mute">
          Just want to count a stall without a discount?{" "}
          <Link href="/admin/coupons/card?src=stall" className="text-lemon underline underline-offset-2">
            Make a plain QR card
          </Link>{" "}
          and change the name in its link.
        </p>
      </div>

      <section id="new-code" className="space-y-3 rounded-2xl border border-lemon/40 p-5">
        <h2 className="font-medium">New code</h2>
        <CouponForm />
      </section>

      {coupons.length > 0 && (
        <ul className="space-y-4">
          {coupons.map((c, i) => (
            <li key={c.code} className="space-y-3 rounded-2xl border border-line p-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="rounded-full bg-paper/5 px-2.5 py-1 text-xs font-medium">{state(c, uses[i], now)}</span>
                <span className="text-mute">
                  Used {uses[i]}
                  {c.maxUses !== null && ` of ${c.maxUses}`} {uses[i] === 1 ? "time" : "times"}
                  {c.minOrderPaise > 0 && ` · min order ${formatINR(c.minOrderPaise)}`}
                </span>
                <Link href={`/admin/coupons/card?code=${c.code}`} className="ml-auto text-lemon underline underline-offset-2">
                  QR card
                </Link>
              </div>
              <CouponForm coupon={c} />
              <form action={deleteCouponAction}>
                <input type="hidden" name="code" value={c.code} />
                <ConfirmSubmit message={`Delete ${c.code}? Past orders keep it.`} className="text-xs text-mute hover:text-[#ff7a59]">
                  Delete code
                </ConfirmSubmit>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
