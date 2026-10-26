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
import { cleanSource } from "@/lib/validation";

export const metadata: Metadata = { title: "QR card" };

/** A printable card for a stall: QR to the shop with the source and code. */
export default async function QrCard({ searchParams }: PageProps<"/admin/coupons/card">) {
  await requireAdmin();
  const sp = await searchParams;
  const code = normalizeCode(typeof sp.code === "string" ? sp.code : "");
  const coupon = code && COUPON_CODE_RE.test(code) ? await getStore().getCoupon(code) : null;
  if (code && !coupon) notFound();
  const source = coupon?.source || cleanSource(typeof sp.src === "string" ? sp.src : "") || `qr-${code.toLowerCase()}` || "qr";
  const link = qrLink(source, coupon?.code);
  const svg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b0b0a", light: "#ffffff" } });
  const deal = coupon ? (coupon.percent !== null ? `${coupon.percent}% off` : `${formatINR(coupon.amountPaise!)} off`) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2 print:hidden">
        <Link href="/admin/coupons" className="text-sm text-mute hover:text-lemon">
          ← Codes &amp; QR
        </Link>
        <p className="text-sm text-paper/70">
          Print this (A6 or bigger), or screenshot it for a stall sign. The QR opens <span className="break-all font-mono text-xs">{link}</span>
        </p>
        <PrintButton />
      </div>
      <article className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-3xl bg-white p-8 text-center text-[#0b0b0a] print:max-w-none print:rounded-none">
        <Wordmark className="text-3xl text-[#0b0b0a]" />
        {deal ? (
          <p className="display text-4xl leading-none">
            {deal}
            <span className="block text-lg font-normal">on the online shop</span>
          </p>
        ) : (
          <p className="display text-3xl leading-none">Shop the stall online</p>
        )}
        <div className="w-56" role="img" aria-label="QR code" dangerouslySetInnerHTML={{ __html: svg }} />
        {coupon && (
          <p className="text-sm">
            Code <strong className="font-mono text-base">{coupon.code}</strong>
            {coupon.minOrderPaise > 0 && ` · orders over ${formatINR(coupon.minOrderPaise)}`}
          </p>
        )}
        <p className="text-sm">Scan, pick your stickers, DM us the order. @stixnvibes</p>
      </article>
    </div>
  );
}
