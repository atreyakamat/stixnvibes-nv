"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function UpiPanel({
  number,
  token,
  total,
  vpa,
  link,
  qrSvg,
  submittedUtr,
}: {
  number: string;
  token: string;
  total: string;
  vpa: string;
  link: string;
  qrSvg: string;
  submittedUtr: string | null;
}) {
  const router = useRouter();
  const [utr, setUtr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${number}/utr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, utr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't save that reference.");
      setUtr("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ice rounded-[1.5rem] border border-lemon/40 p-6 md:p-8">
      <h2 className="display text-4xl">Pay {total} with UPI</h2>
      <ol className="mt-6 grid gap-8 md:grid-cols-2">
        <li>
          <p className="label text-lemon">Step 1</p>
          <p className="mt-2 text-paper/80">
            <span className="md:hidden">Tap the button to open your UPI app. The amount and order number are filled in.</span>
            <span className="hidden md:inline">Scan with any UPI app. The amount and order number are filled in.</span>
          </p>
          <a href={link} className="btn btn-primary mt-4 md:hidden">
            Open UPI app
          </a>
          <div
            className="mt-4 hidden w-52 overflow-hidden rounded-2xl bg-paper p-2 md:block [&>svg]:h-auto [&>svg]:w-full"
            role="img"
            aria-label={`UPI QR code to pay ${total} to ${vpa}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="mt-4 text-sm text-mute">
            Or pay to UPI ID{" "}
            <button
              type="button"
              className="font-mono text-paper underline decoration-dotted underline-offset-4 hover:text-lemon"
              onClick={() => {
                navigator.clipboard?.writeText(vpa).then(() => setCopied(true));
              }}
            >
              {vpa}
            </button>
            {copied && <span className="ml-2 text-lemon">Copied</span>} and add <span className="font-mono text-paper">{number}</span> in the note.
          </p>
        </li>
        <li>
          <p className="label text-lemon">Step 2</p>
          {submittedUtr ? (
            <p className="mt-2 text-paper/80">
              Thanks! We got reference <span className="font-mono text-paper">{submittedUtr}</span> and are checking it. Sent the wrong
              one? Enter it again below.
            </p>
          ) : (
            <p className="mt-2 text-paper/80">
              After paying, enter the 12 digit UPI reference (UTR) from your app&apos;s payment details.
            </p>
          )}
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <label htmlFor="utr" className="sr-only">
              UPI reference number
            </label>
            <input
              id="utr"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 412345678901"
              className="field font-mono"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "utr-error" : undefined}
              required
            />
            {error && (
              <p id="utr-error" className="text-sm text-[#ff7a59]" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={busy || !utr.trim()}>
              {busy ? "Saving…" : "I've paid"}
            </button>
          </form>
        </li>
      </ol>
    </div>
  );
}
