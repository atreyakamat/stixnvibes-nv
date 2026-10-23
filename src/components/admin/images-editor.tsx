"use client";

import { useRef, useState } from "react";
import { uploadProductImageAction } from "@/app/admin/actions";

/** Upload, order and remove photos. The first photo is the main one. */
export function ImagesEditor({ images, onChange, max = 12 }: { images: string[]; onChange: (next: string[]) => void; max?: number }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [path, setPath] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    let next = images;
    for (const file of Array.from(files).slice(0, max - images.length)) {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadProductImageAction(fd);
      if (res.url) {
        next = [...next, res.url];
        onChange(next);
      } else setError(res.error ?? "Upload failed.");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((src, i) => (
            <li key={`${src.slice(0, 80)}-${i}`} className="space-y-2 rounded-xl bg-ink/40 p-2">
              <div className="grid aspect-square place-items-center">
                <img src={src} alt="" className="max-h-full w-auto object-contain" />
              </div>
              <div className="flex justify-between text-xs">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30" aria-label="Move earlier">
                  ←
                </button>
                <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} className="text-mute hover:text-[#ff7a59]">
                  Remove
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="disabled:opacity-30" aria-label="Move later">
                  →
                </button>
              </div>
              {i === 0 && <p className="label text-center text-lemon">Main</p>}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn btn-ghost cursor-pointer !py-2.5">
          {uploading ? "Uploading…" : "Upload photos"}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => upload(e.target.files)} disabled={uploading || images.length >= max} />
        </label>
        <span className="text-xs text-mute">PNG, JPG or WebP, up to 5 MB. Square, transparent PNG/WebP look best.</span>
      </div>
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Or add an image link</span>
          <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="Or paste an image link, e.g. /lofi/lofi-03.webp" className="field !py-2.5 text-sm" />
        </label>
        <button
          type="button"
          className="btn btn-ghost !py-2.5"
          onClick={() => {
            const p = path.trim();
            if (p && (p.startsWith("/") || p.startsWith("https://"))) {
              onChange([...images, p]);
              setPath("");
            }
          }}
        >
          Add
        </button>
      </div>
      {error && <p className="text-sm text-[#ff7a59]">{error}</p>}
    </div>
  );
}
