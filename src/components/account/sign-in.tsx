"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DETAILS_KEY } from "@/components/cart/order-panel";
import type { Account } from "@/lib/types";

// Two steps on one card: email, then the 6-digit code. Accounts are optional,
// so the copy says what they're for and that ordering works without one.

type Step = "email" | "code";

async function post<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return res.ok ? { ok: true, data } : { ok: false, error: data.error ?? "Something went wrong. Try again." };
  } catch {
    return { ok: false, error: "No connection. Check your internet and try again." };
  }
}

function CodeBoxes({ value, onChange, onDone, disabled, invalid }: { value: string; onChange: (v: string) => void; onDone: (v: string) => void; disabled: boolean; invalid: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // The code is the only thing to do on this step, so start in the first box.
  useEffect(() => refs.current[0]?.focus(), []);
  const set = (next: string) => {
    onChange(next);
    if (next.length === 6) onDone(next);
  };
  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit code">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="field !px-0 text-center text-2xl font-semibold tabular-nums"
          style={{ width: "100%", maxWidth: "3.4rem", aspectRatio: "3 / 4" }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={value[i] ?? ""}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "");
            if (!d) return;
            set((value.slice(0, i) + d + value.slice(i + 1)).slice(0, 6));
            refs.current[Math.min(i + 1, 5)]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              set(value.slice(0, i) + value.slice(i + 1));
              refs.current[Math.max(i - (value[i] ? 0 : 1), 0)]?.focus();
            } else if (e.key === "ArrowLeft") refs.current[Math.max(i - 1, 0)]?.focus();
            else if (e.key === "ArrowRight") refs.current[Math.min(i + 1, 5)]?.focus();
          }}
          onPaste={(e) => {
            const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!d) return;
            e.preventDefault();
            set(d);
            refs.current[Math.min(d.length, 5)]?.focus();
          }}
        />
      ))}
    </div>
  );
}

export function SignIn() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const r = await post<{ demoCode?: string }>("/api/app/account/code", { email: email.trim() });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDemoCode(r.data.demoCode ?? "");
    setCode("");
    setWait(45);
    setStep("code");
  }

  async function verify(value: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    const r = await post<{ account: Account; isNew: boolean }>("/api/app/account/verify", { email: email.trim(), code: value, name: name.trim(), web: true });
    if (!r.ok) {
      setBusy(false);
      setCode("");
      return setError(r.error);
    }
    // Checkout on this device fills in from the account.
    const d = r.data.account.data.details;
    if (d.name) {
      try {
        window.localStorage.setItem(DETAILS_KEY, JSON.stringify({ ...d, note: "" }));
      } catch {
        // Nothing to prefill; fine.
      }
    }
    router.refresh();
  }

  const slide = reduce ? {} : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { type: "spring" as const, stiffness: 420, damping: 36 } };

  return (
    <motion.div
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8"
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-lemon/20 blur-3xl" />
      <AnimatePresence mode="wait" initial={false}>
        {step === "email" ? (
          <motion.form key="email" onSubmit={sendCode} className="relative space-y-5" {...slide}>
            <div className="space-y-2">
              <p className="label text-lemon">Your account</p>
              <h2 className="display text-4xl">Hop in.</h2>
              <p className="text-paper/70">Keep your details, wishlist and orders on every phone. No password: we email you a code. You can still order without an account.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor="acc-email" className="label mb-2 block text-mute">
                  Email
                </label>
                <input id="acc-email" className="field" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="acc-name" className="label mb-2 block text-mute">
                  First name <span className="text-mute/70">(new here?)</span>
                </label>
                <input id="acc-name" className="field" autoComplete="given-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Riya" />
              </div>
            </div>
            {error && (
              <p role="alert" className="text-sm text-[#ff7a59]">
                {error}
              </p>
            )}
            <motion.button whileTap={reduce ? undefined : { scale: 0.97 }} className="btn btn-primary w-full" disabled={busy || !email.trim()}>
              {busy ? "Sending…" : "Email me a code"}
            </motion.button>
          </motion.form>
        ) : (
          <motion.div key="code" className="relative space-y-5" {...slide}>
            <div className="space-y-2">
              <p className="label text-lemon">Check your inbox</p>
              <h2 className="display text-4xl">Type the code.</h2>
              <p className="text-paper/70">
                We sent 6 digits to <span className="text-paper">{email.trim()}</span>. It works for 10 minutes.
              </p>
            </div>
            <CodeBoxes value={code} onChange={setCode} onDone={(v) => void verify(v)} disabled={busy} invalid={!!error} />
            {demoCode && (
              <button type="button" className="w-full rounded-xl bg-lemon/10 px-3 py-2 text-left text-sm text-lemon" onClick={() => { setCode(demoCode); void verify(demoCode); }}>
                Preview mode: no email is sent. Tap to use code {demoCode}.
              </button>
            )}
            <div aria-live="polite" className="min-h-5">
              {busy ? <p className="text-sm text-mute">Checking…</p> : error ? <p role="alert" className="text-sm text-[#ff7a59]">{error}</p> : null}
            </div>
            <div className="flex items-center justify-between text-sm">
              <button type="button" className="text-paper/70 underline-offset-4 hover:text-lemon hover:underline" onClick={() => { setStep("email"); setError(""); }}>
                Wrong email?
              </button>
              <button type="button" className="text-paper/70 underline-offset-4 hover:text-lemon hover:underline disabled:opacity-50 disabled:no-underline" disabled={wait > 0 || busy} onClick={() => void sendCode()}>
                {wait > 0 ? `Send again in ${wait}s` : "Send again"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
