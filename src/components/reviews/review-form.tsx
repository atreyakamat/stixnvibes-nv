"use client";

import { useState } from "react";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { getSource } from "@/lib/track";
import { REVIEW_PHOTOS_MAX, REVIEW_TEXT_MAX } from "@/lib/types";

type PhotoState = { key: string; preview: string; id?: string; error?: string };

const lbl = "mb-1 block text-sm text-paper/70";

/**
 * Write a review with up to 3 photos. Photos upload as soon as they're
 * picked (same private storage as custom designs). Saved as pending; it
 * shows once the shop publishes it.
 */
export function ReviewForm({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [f, setF] = useState({ text: "", name: "", instagram: "", company: "" });
  const [photos, setPhotos] = useState<PhotoState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  async function addPhotos(list: FileList | null) {
    if (!list) return;
    for (const file of [...list].slice(0, REVIEW_PHOTOS_MAX - photos.length)) {
      const key = crypto.randomUUID();
      const bad = !["image/png", "image/jpeg", "image/webp"].includes(file.type) ? "Use PNG, JPG or WebP." : file.size > MAX_UPLOAD_BYTES ? "Up to 8 MB each." : undefined;
      setPhotos((x) => [...x, { key, preview: URL.createObjectURL(file), error: bad }]);
      if (bad) continue;
      const fd = new FormData();
      fd.set("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { id?: string; error?: string };
        if (!res.ok || !data.id) throw new Error(data.error ?? "Upload failed.");
        setPhotos((x) => x.map((y) => (y.key === key ? { ...y, id: data.id } : y)));
      } catch (err) {
        setPhotos((x) => x.map((y) => (y.key === key ? { ...y, error: (err as Error).message } : y)));
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!rating) return setError("Pick a star rating.");
    if (f.name.trim().length < 2) return setError("Add your name.");
    if (photos.some((p) => !p.id && !p.error)) return setError("Wait for your photos to finish uploading.");
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, text: f.text, name: f.name, instagram: f.instagram, photos: photos.filter((p) => p.id).map((p) => p.id), company: f.company, source: getSource() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't send your review.");
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <p className="rounded-2xl border border-lemon/40 p-5 text-paper/80" role="status">
        Thank you! We read every review. Yours shows here once we&apos;ve had a look, usually within a day.
      </p>
    );

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost">
        ★ Write a review
      </button>
    );

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-2xl bg-paper/5 p-5" noValidate>
      <fieldset>
        <legend className={lbl}>Your rating</legend>
        <div className="flex gap-1 text-3xl" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => setRating(n)} className={n <= rating ? "text-lemon" : "text-paper/25 hover:text-paper/50"}>
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className={lbl}>Your review (optional)</span>
        <textarea value={f.text} onChange={(e) => set({ text: e.target.value })} maxLength={REVIEW_TEXT_MAX} placeholder="How does it look? Where did you stick it?" className="field min-h-24 !py-2.5" />
      </label>
      <fieldset className="space-y-2">
        <legend className={lbl}>Photos (up to {REVIEW_PHOTOS_MAX})</legend>
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.key} className="relative size-20 overflow-hidden rounded-lg bg-paper/10">
              <img src={p.preview} alt="" className="size-full object-cover" />
              <span className={`absolute inset-x-0 bottom-0 bg-ink/70 text-center text-[10px] ${p.error ? "text-[#ff7a59]" : ""}`}>{p.error ?? (p.id ? "Uploaded" : "Uploading…")}</span>
              <button type="button" onClick={() => setPhotos((x) => x.filter((y) => y.key !== p.key))} className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-ink/80 text-xs" aria-label="Remove photo">
                ×
              </button>
            </div>
          ))}
          {photos.length < REVIEW_PHOTOS_MAX && (
            <label className="grid size-20 cursor-pointer place-items-center rounded-lg border border-dashed border-paper/30 text-xs hover:border-lemon">
              Add
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => (void addPhotos(e.target.files), (e.target.value = ""))} />
            </label>
          )}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={lbl}>Name (shown)</span>
          <input value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} autoComplete="given-name" className="field !py-2.5" />
        </label>
        <label className="block">
          <span className={lbl}>Instagram (optional, not shown)</span>
          <input value={f.instagram} onChange={(e) => set({ instagram: e.target.value })} maxLength={60} autoCapitalize="none" placeholder="@yourname" className="field !py-2.5" />
        </label>
      </div>
      <input value={f.company} onChange={(e) => set({ company: e.target.value })} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {error && (
        <p className="text-sm text-[#ff7a59]" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-50">
        {busy ? "Sending…" : "Post review"}
      </button>
    </form>
  );
}
