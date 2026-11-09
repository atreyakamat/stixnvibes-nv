import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PrintButton } from "@/components/admin/print-button";
import { Wordmark } from "@/components/wordmark";
import { requireAdmin } from "@/lib/admin/session";
import { formatINR } from "@/lib/money";
import { COUPON_CODE_RE, normalizeCode } from "@/lib/pricing";
import { qrLink } from "@/lib/qr-link";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Stall sign" };

/** A big A5 stall sign for an app code: what the customer gets, and one QR to scan. */
export default async function StallSign({ searchParams }: PageProps<"/admin/coupons/sign">) {
  await requireAdmin();
  const sp = await searchParams;
  const code = normalizeCode(typeof sp.code === "string" ? sp.code : "");
  if (!COUPON_CODE_RE.test(code)) notFound();
  const coupon = await getStore().getCoupon(code);
  if (!coupon) notFound();
  const link = qrLink(coupon.source || "app-qr", coupon.code, "/app");
  const svg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b0b0a", light: "#ffffff" } });
  const perks = [
    coupon.percent !== null ? `${coupon.percent}% off your order` : `${formatINR(coupon.amountPaise ?? 0)} off your order`,
    coupon.freeStickers > 0 ? `${coupon.freeStickers} free stickers` : null,
    coupon.bonusAbovePaise && coupon.bonusStickers > 0 ? `${coupon.bonusStickers} more free stickers over ${formatINR(coupon.bonusAbovePaise)}` : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <div className="space-y-6">
      <div className="space-y-2 print:hidden">
        <Link href="/admin/coupons" className="text-sm text-mute hover:text-lemon">
          ← Codes &amp; QR
        </Link>
        <p className="text-sm text-paper/70">Print on A5 (or A4 scaled). The QR opens the app page with the code filled in.</p>
        <PrintButton />
      </div>
      <article className="mx-auto flex aspect-[148/210] w-full max-w-md flex-col items-center justify-between gap-4 rounded-3xl bg-white p-8 text-center text-[#0b0b0a] print:max-w-none print:rounded-none">
        <Wordmark className="text-3xl text-[#0b0b0a]" />
        <p className="display text-4xl leading-none">Get the app, get stuff free</p>
        <ul className="space-y-1 text-lg font-semibold">
          {perks.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <div className="w-60" role="img" aria-label="QR code" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="text-sm">
          Scan, install, order in the app{coupon.minOrderPaise > 0 ? ` (orders over ${formatINR(coupon.minOrderPaise)})` : ""}.
          {coupon.firstOrderOnly ? " First order only." : ""} Code <strong className="font-mono">{coupon.code}</strong> applies by itself.
        </p>
      </article>
    </div>
  );
}
