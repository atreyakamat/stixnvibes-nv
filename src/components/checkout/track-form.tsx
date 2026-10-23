"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function TrackForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: f.get("number"), phone: f.get("phone") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't find that order.");
      router.push(data.url);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="number" className="mb-2 block text-sm text-paper/80">
          Order number
        </label>
        <input id="number" name="number" className="field font-mono uppercase" placeholder="SNV-AB12CD" autoCapitalize="characters" required />
      </div>
      <div>
        <label htmlFor="phone" className="mb-2 block text-sm text-paper/80">
          Phone number
        </label>
        <input id="phone" name="phone" type="tel" inputMode="tel" className="field" autoComplete="tel-national" required />
      </div>
      {error && (
        <p className="text-sm text-[#ff7a59] sm:col-span-2" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-fit disabled:opacity-50" disabled={busy}>
        {busy ? "Looking…" : "Find my order"}
      </button>
    </form>
  );
}
