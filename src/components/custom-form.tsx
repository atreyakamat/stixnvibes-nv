"use client";

import { useState, type FormEvent } from "react";
import { CUSTOM_CUTS, MAX_UPLOAD_BYTES } from "@/lib/constants";

export function CustomForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (file instanceof File && file.size > MAX_UPLOAD_BYTES) {
      setErrors({ file: "Files can be up to 8 MB." });
      return;
    }
    setBusy(true);
    setErrors({});
    setFormError("");
    try {
      const res = await fetch("/api/custom", { method: "POST", body: data });
      const body = await res.json();
      if (!res.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? "Couldn't send your request.");
        return;
      }
      form.reset();
      setDone(true);
    } catch {
      setFormError("Network problem. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="ice h-fit rounded-[1.5rem] border border-lemon/40 p-8" role="status">
        <h2 className="display text-4xl">Got it!</h2>
        <p className="mt-4 text-paper/75">We&apos;ll get back to you with a quote soon.</p>
        <button type="button" className="btn btn-ghost mt-6" onClick={() => setDone(false)}>
          Send another
        </button>
      </div>
    );
  }

  const field = (name: string) => ({
    id: `c-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `c-${name}-error` : undefined,
  });
  const err = (name: string) =>
    errors[name] && (
      <p id={`c-${name}-error`} className="mt-1.5 text-sm text-[#ff7a59]">
        {errors[name]}
      </p>
    );
  const lbl = "mb-2 block text-sm text-paper/80";

  return (
    <form onSubmit={onSubmit} noValidate className="ice h-fit space-y-4 rounded-[1.5rem] border border-line p-6 md:p-8">
      <div>
        <label htmlFor="c-name" className={lbl}>
          Name
        </label>
        <input {...field("name")} className="field" autoComplete="name" required />
        {err("name")}
      </div>
      <div>
        <label htmlFor="c-contact" className={lbl}>
          Phone, email or Instagram
        </label>
        <input {...field("contact")} className="field" required />
        {err("contact")}
      </div>
      <div>
        <label htmlFor="c-description" className={lbl}>
          What do you want?
        </label>
        <textarea {...field("description")} className="field min-h-28" placeholder="50 logo stickers for our college fest…" required />
        {err("description")}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="c-cut" className={lbl}>
            Cut
          </label>
          <select {...field("cut")} className="field" defaultValue="Not sure">
            {CUSTOM_CUTS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="c-size" className={lbl}>
            Size
          </label>
          <input {...field("size")} className="field" placeholder='e.g. 3"' />
        </div>
        <div>
          <label htmlFor="c-quantity" className={lbl}>
            Quantity
          </label>
          <input {...field("quantity")} type="number" min={1} defaultValue={10} className="field" required />
          {err("quantity")}
        </div>
      </div>
      <div>
        <label htmlFor="c-file" className={lbl}>
          Artwork (optional, up to 8 MB)
        </label>
        <input
          {...field("file")}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="block w-full text-sm text-mute file:mr-4 file:rounded-full file:border-0 file:bg-paper file:px-4 file:py-2 file:text-ink hover:file:bg-lemon"
        />
        {err("file")}
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {formError && (
        <p className="text-sm text-[#ff7a59]" role="alert">
          {formError}
        </p>
      )}
      <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={busy}>
        {busy ? "Sending…" : "Ask for a quote"}
      </button>
    </form>
  );
}
