"use client";

import { useEffect, useState } from "react";
import { CopyAndDm } from "@/components/copy-and-dm";
import { MAX_CUSTOM_FILES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";
import { getSource } from "@/lib/track";

type FileState = { key: string; name: string; preview: string; id?: string; error?: string };
type Option = { id: string; label: string };

const DETAILS_KEY = "snv-details-v1";

/**
 * Customer's own designs for a quote. Each file uploads as soon as it's
 * picked (same private storage as music card photos); the request only
 * sends their ids.
 */
export function CustomForm({ kinds, handle }: { kinds: Option[]; handle: string }) {
  const [files, setFiles] = useState<FileState[]>([]);
  const [f, setF] = useState({ name: "", phone: "", instagram: "", kind: "sticker", size: "", qty: "50", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    // Same saved details as the cart, so returning customers type less.
    try {
      const saved = JSON.parse(window.localStorage.getItem(DETAILS_KEY) ?? "null") as { name?: string; phone?: string; instagram?: string } | null;
      if (saved) setF((x) => ({ ...x, name: saved.name ?? "", phone: saved.phone ?? "", instagram: saved.instagram ?? "" }));
    } catch {
      // Nothing saved.
    }
  }, []);

  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const room = MAX_CUSTOM_FILES - files.length;
    for (const file of [...list].slice(0, room)) {
      const key = crypto.randomUUID();
      const tooBig = file.size > MAX_UPLOAD_BYTES;
      const badType = !["image/png", "image/jpeg", "image/webp"].includes(file.type);
      setFiles((x) => [
        ...x,
        { key, name: file.name, preview: URL.createObjectURL(file), error: badType ? "Use PNG, JPG or WebP." : tooBig ? "Up to 8 MB each." : undefined },
      ]);
      if (tooBig || badType) continue;
      const fd = new FormData();
      fd.set("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { id?: string; error?: string };
        if (!res.ok || !data.id) throw new Error(data.error ?? "Upload failed.");
        setFiles((x) => x.map((y) => (y.key === key ? { ...y, id: data.id } : y)));
      } catch (err) {
        setFiles((x) => x.map((y) => (y.key === key ? { ...y, error: (err as Error).message } : y)));
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (f.name.trim().length < 2) return setError("Add your name.");
    if (!normalizePhone(f.phone)) return setError("Add a 10-digit mobile number.");
    if (files.some((x) => !x.id && !x.error)) return setError("Wait for your designs to finish uploading.");
    const ids = files.filter((x) => x.id).map((x) => x.id!);
    if (!ids.length) return setError("Add at least one design.");
    setBusy(true);
    try {
      const res = await fetch("/api/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: f.name,
          customerPhone: f.phone,
          instagram: f.instagram,
          kind: f.kind,
          size: f.size,
          qty: Number(f.qty) || 0,
          note: f.note,
          files: ids,
          source: getSource(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { number?: string; error?: string };
      if (!res.ok || !data.number) throw new Error(data.error ?? "Couldn't send it. Try again, or DM us on Instagram.");
      setDone(data.number);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="space-y-4 rounded-[1.5rem] border border-lemon/40 p-6" role="status">
        <p className="label text-mute">Request sent</p>
        <p className="display font-mono text-5xl">{done}</p>
        <p className="text-paper/80">We&apos;ve got your designs. We&apos;ll reply with a price, usually within a day. To hear back faster, DM us the ref on Instagram.</p>
        <CopyAndDm handle={handle} message={`Hi Stix N Vibes! I just sent custom request ${done} (${f.qty} × ${kinds.find((k) => k.id === f.kind)?.label ?? f.kind}).`} label="Copy ref & open Instagram" />
      </div>
    );
  }

  const lbl = "mb-1 block text-sm text-paper/70";
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <fieldset className="space-y-3">
        <legend className="label mb-3 text-mute">Your designs</legend>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {files.map((x) => (
            <li key={x.key} className="relative">
              <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-paper/5 p-1.5">
                <img src={x.preview} alt={x.name} className="max-h-full w-auto object-contain" />
              </div>
              <p className={`mt-1 truncate text-xs ${x.error ? "text-[#ff7a59]" : "text-mute"}`}>{x.error ?? (x.id ? "Uploaded" : "Uploading…")}</p>
              <button
                type="button"
                aria-label={`Remove ${x.name}`}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-ink/80 text-xs"
                onClick={() => setFiles((list) => list.filter((y) => y.key !== x.key))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        {files.length < MAX_CUSTOM_FILES && (
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-dashed border-paper/30 p-6 text-center hover:border-lemon">
            <span className="font-medium">Add designs</span>
            <span className="text-xs text-mute">PNG, JPG or WebP, up to 8 MB each, {MAX_CUSTOM_FILES} at most. A PDF or AI file? Send it on Instagram after this.</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => (void addFiles(e.target.files), (e.target.value = ""))} />
          </label>
        )}
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="label mb-3 text-mute">What to make</legend>
        <label className="block">
          <span className={lbl}>Make it as</span>
          <select value={f.kind} onChange={(e) => set({ kind: e.target.value })} className="field !py-2.5">
            {kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Quantity</span>
          <input value={f.qty} onChange={(e) => set({ qty: e.target.value.replace(/\D/g, "").slice(0, 5) })} inputMode="numeric" className="field !py-2.5 tabular-nums" />
        </label>
        <label className="block">
          <span className={lbl}>Size and cut (optional)</span>
          <input value={f.size} onChange={(e) => set({ size: e.target.value })} maxLength={80} placeholder="5 cm, die cut" className="field !py-2.5" />
        </label>
        <label className="block sm:col-span-3">
          <span className={lbl}>Anything else (optional)</span>
          <textarea value={f.note} onChange={(e) => set({ note: e.target.value })} maxLength={1500} placeholder="Finish, colours, deadline, event…" className="field min-h-20 !py-2.5" />
        </label>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="label mb-3 text-mute">How we reach you</legend>
        <label className="block">
          <span className={lbl}>Name</span>
          <input value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} autoComplete="name" className="field !py-2.5" />
        </label>
        <label className="block">
          <span className={lbl}>Phone (WhatsApp)</span>
          <input value={f.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={16} inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" className="field !py-2.5" />
        </label>
        <label className="block">
          <span className={lbl}>Instagram (optional)</span>
          <input value={f.instagram} onChange={(e) => set({ instagram: e.target.value })} maxLength={60} autoCapitalize="none" placeholder="@yourname" className="field !py-2.5" />
        </label>
      </fieldset>

      <p className="text-xs text-mute">Only send designs you made or have permission to print. We keep them private and use them only for your order.</p>
      {error && (
        <p className="text-sm text-[#ff7a59]" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn btn-primary w-full justify-center disabled:opacity-50 sm:w-auto">
        {busy ? "Sending…" : "Send for a quote"}
      </button>
    </form>
  );
}
