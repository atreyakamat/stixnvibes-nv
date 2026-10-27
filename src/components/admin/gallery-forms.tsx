"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/admin/actions";
import { addGalleryAction, saveGalleryItemAction } from "@/app/admin/content-actions";
import type { GalleryItem } from "@/lib/types";
import { ImagesEditor } from "./images-editor";

type Option = { id: string; name: string };

function Links({ stallId, setStallId, collegeId, setCollegeId, stalls, colleges }: { stallId: string; setStallId: (v: string) => void; collegeId: string; setCollegeId: (v: string) => void; stalls: Option[]; colleges: Option[] }) {
  const lbl = "mb-1 block text-xs text-paper/60";
  return (
    <>
      <label className="block">
        <span className={lbl}>Stall</span>
        <select value={stallId} onChange={(e) => setStallId(e.target.value)} className="field !py-2 text-sm">
          <option value="">None</option>
          {stalls.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={lbl}>College</span>
        <select value={collegeId} onChange={(e) => setCollegeId(e.target.value)} className="field !py-2 text-sm">
          <option value="">None</option>
          {colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

/** Upload a batch of photos that share a stall, college, caption and tags. */
export function AddPhotosForm({ stalls, colleges, stallId: initialStall, collegeId: initialCollege }: { stalls: (Option & { collegeId: string | null })[]; colleges: Option[]; stallId?: string; collegeId?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addGalleryAction, {});
  const [images, setImages] = useState<string[]>([]);
  const [stallId, setStallId] = useState(initialStall ?? "");
  const [collegeId, setCollegeId] = useState(initialCollege ?? stalls.find((s) => s.id === initialStall)?.collegeId ?? "");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [takenOn, setTakenOn] = useState("");
  // Clear the uploads once they're in the library (adjusted during render, not in an effect).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.ok) setImages([]);
  }
  const payload = JSON.stringify({ images, stallId, collegeId, caption, tags, takenOn, visible: true, sortOrder: 0 });
  const lbl = "mb-1 block text-xs text-paper/60";
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="payload" value={payload} />
      <ImagesEditor images={images} onChange={setImages} max={60} />
      <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
        <Links
          stallId={stallId}
          setStallId={(v) => {
            setStallId(v);
            const c = stalls.find((s) => s.id === v)?.collegeId;
            if (c) setCollegeId(c);
          }}
          collegeId={collegeId}
          setCollegeId={setCollegeId}
          stalls={stalls}
          colleges={colleges}
        />
        <label className="block">
          <span className={lbl}>Date taken (optional)</span>
          <input type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} className="field !py-2 text-sm" />
        </label>
        <label className="block">
          <span className={lbl}>Tags, comma separated</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="field !py-2 text-sm" placeholder="custom, laptop" />
        </label>
        <label className="block sm:col-span-4">
          <span className={lbl}>Caption for all of them (optional)</span>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} className="field !py-2 text-sm" placeholder="Our table at WordsUp" />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary !py-2 text-sm disabled:opacity-50" disabled={pending || !images.length}>
          {pending ? "Adding…" : `Add ${images.length || ""} to the library`}
        </button>
        <span role="status" className="text-sm">
          {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : <span className="text-lemon">{state.message}</span>}
        </span>
      </div>
    </form>
  );
}

export function GalleryItemForm({ item, stalls, colleges }: { item: GalleryItem; stalls: Option[]; colleges: Option[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveGalleryItemAction, {});
  const [caption, setCaption] = useState(item.caption);
  const [stallId, setStallId] = useState(item.stallId ?? "");
  const [collegeId, setCollegeId] = useState(item.collegeId ?? "");
  const [visible, setVisible] = useState(item.visible);
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));
  const payload = JSON.stringify({ id: item.id, image: item.image, caption, stallId, collegeId, tags: item.tags.join(", "), takenOn: item.takenOn ?? "", visible, sortOrder });
  return (
    <form action={action} className="space-y-2 text-sm">
      <input type="hidden" name="payload" value={payload} />
      <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} className="field !py-1.5 text-sm" placeholder="Caption" aria-label="Caption" />
      <div className="grid grid-cols-2 gap-2">
        <Links stallId={stallId} setStallId={setStallId} collegeId={collegeId} setCollegeId={setCollegeId} stalls={stalls} colleges={colleges} />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-4 accent-lemon" />
          Show
        </label>
        <label className="flex items-center gap-1.5 text-mute">
          Order
          <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" className="field w-14 !py-1 text-sm" />
        </label>
        <button type="submit" className="ml-auto text-lemon underline underline-offset-2 disabled:opacity-50" disabled={pending}>
          Save
        </button>
      </div>
      {(state.error || state.message) && <p className={state.error ? "text-[#ff7a59]" : "text-lemon"}>{state.error ?? state.message}</p>}
    </form>
  );
}
