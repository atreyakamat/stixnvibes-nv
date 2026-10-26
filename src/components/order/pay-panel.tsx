"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type PayPanelProps = {
  number: string;
  viewKey: string;
  /** "₹120.00": shown on the buttons. */
  amount: string;
  /** Online payment through YouPI is set up for this order. */
  online: boolean;
  /** Back from the gateway and not marked paid yet. */
  returning: boolean;
  /** The UPI QR fallback; null when no UPI ID is set. */
  qr: { svg: string; png: string; link: string; upiId: string; amountFixed: boolean } | null;
  /** wa.me link with the order ref filled in; null when no number is set. */
  whatsapp: string | null;
};

const CHECK_EVERY_MS = 4000;
const CHECK_FOR_MS = 90_000;

function Checking({ number, whatsapp }: { number: string; whatsapp: string | null }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > CHECK_FOR_MS) {
        clearInterval(t);
        setGaveUp(true);
      } else router.refresh();
    }, CHECK_EVERY_MS);
    return () => clearInterval(t);
  }, [router]);
  return (
    <p className="rounded-xl bg-lemon/10 px-4 py-3 text-sm text-lemon" role="status">
      {gaveUp ? (
        <>
          If you paid, it shows here once your bank confirms it, usually within minutes.{" "}
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener" className="underline underline-offset-2">
              Send us the screenshot on WhatsApp
            </a>
          ) : (
            "Send us the screenshot"
          )}{" "}
          if it doesn&apos;t, with your ref {number}.
        </>
      ) : (
        "Checking your payment… this page updates by itself."
      )}
    </p>
  );
}

export function PayPanel({ number, viewKey, amount, online, returning, qr, whatsapp }: PayPanelProps) {
  const [busy, setBusy] = useState(false);
  const [showQr, setShowQr] = useState(!online);
  const [down, setDown] = useState("");

  async function payNow() {
    setBusy(true);
    setDown("");
    try {
      const res = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number, key: viewKey }) });
      const body = (await res.json().catch(() => ({}))) as { url?: string; fallback?: boolean; error?: string };
      if (body.url) {
        window.location.assign(body.url);
        return;
      }
      const instead = qr ? "Pay with the UPI QR below instead." : "Try again in a few minutes, or message us.";
      setDown(body.fallback ? `Online payment isn't available right now. ${instead}` : (body.error ?? "Couldn't start the payment."));
      setShowQr(true);
    } catch {
      setDown(`Couldn't reach the payment page. ${qr ? "Pay with the UPI QR below instead." : "Try again in a few minutes, or message us."}`);
      setShowQr(true);
    }
    setBusy(false);
  }

  if (!online && !qr) return null;
  return (
    <div className="mt-6 space-y-5 rounded-[1.5rem] border border-line p-5 md:p-6">
      {returning && <Checking number={number} whatsapp={whatsapp} />}
      {online && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Pay online</h2>
          <p className="text-paper/80">Pay with any UPI app. Your order is marked paid as soon as it goes through.</p>
          <button type="button" className="btn btn-primary w-full justify-center" onClick={() => void payNow()} disabled={busy}>
            {busy ? "Opening payment…" : `Pay ${amount} now`}
          </button>
          {down && (
            <p className="text-sm text-[#ffb59f]" role="alert">
              {down}
            </p>
          )}
          {!showQr && qr && (
            <button type="button" className="text-sm text-mute underline underline-offset-2 hover:text-paper" onClick={() => setShowQr(true)}>
              Or pay with the UPI QR
            </button>
          )}
        </div>
      )}
      {showQr && qr && (
        <div className={`grid gap-5 md:grid-cols-[11rem_1fr] md:items-center ${online ? "border-t border-line pt-5" : ""}`}>
          <div className="mx-auto w-44 overflow-hidden rounded-2xl md:mx-0" role="img" aria-label="UPI QR code" dangerouslySetInnerHTML={{ __html: qr.svg }} />
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Pay with the UPI QR</h2>
            <p className="text-paper/80">
              {qr.amountFixed ? (
                <>
                  Scan with any UPI app, or tap below on your phone. Amount: <strong className="tabular-nums text-lemon">{amount}</strong>.
                </>
              ) : (
                <>
                  Items come to <strong className="tabular-nums">{amount}</strong>. We&apos;ll confirm the delivery charge first, then pay the total here.
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={qr.link} className="btn btn-primary !py-2.5 md:hidden">
                Pay with a UPI app
              </a>
              <a href={qr.png} download={`stixnvibes-${number}-upi-qr.png`} className="btn btn-ghost !py-2.5">
                Download QR
              </a>
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener" className="btn btn-ghost !py-2.5">
                  Send screenshot on WhatsApp
                </a>
              )}
            </div>
            <p className="text-xs text-mute">
              Paying to {qr.upiId}. After paying, send the screenshot{whatsapp ? " on WhatsApp" : ""} with your order ref {number}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
