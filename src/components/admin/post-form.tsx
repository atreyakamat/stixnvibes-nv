"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/admin/actions";
import { savePostAction } from "@/app/admin/content-actions";
import { Markdown } from "@/components/markdown";
import type { BlogPost, PostStatus } from "@/lib/types";
import { ImagesEditor } from "./images-editor";
import { slugify } from "./product-form";

const HELP = "## Heading · **bold** · *italic* · [link](/shop) · - list item · > quote · ![photo caption](image link)";

export function PostForm({ post }: { post?: BlogPost }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePostAction, {});
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [cover, setCover] = useState(post?.cover ?? "");
  const [tags, setTags] = useState(post?.tags.join(", ") ?? "");
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "draft");
  const [preview, setPreview] = useState(false);
  const [inline, setInline] = useState<string[]>([]);
  const payload = JSON.stringify({ title, slug, excerpt, body, cover, tags, status });
  const lbl = "mb-1.5 block text-sm text-paper/70";

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <input type="hidden" name="payload" value={payload} />
      {post && <input type="hidden" name="id" value={post.id} />}
      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-line p-5">
          <label className="block">
            <span className={lbl}>Title</span>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className="field text-lg"
              required
              maxLength={160}
            />
          </label>
          <label className="block">
            <span className={lbl}>Link name</span>
            <span className="flex items-center gap-1 text-sm text-mute">
              /blog/
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                className="field font-mono"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                required
              />
            </span>
          </label>
          <label className="block">
            <span className={lbl}>Short summary (shows on the blog page and in Google)</span>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={300} className="field min-h-20" />
          </label>
        </section>

        <section className="space-y-3 rounded-2xl border border-line p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-medium">Post</h2>
            <div className="flex gap-1 rounded-full bg-paper/5 p-1 text-sm">
              {[false, true].map((p) => (
                <button key={String(p)} type="button" onClick={() => setPreview(p)} className={`rounded-full px-3 py-1 ${preview === p ? "bg-lemon text-ink" : ""}`}>
                  {p ? "Preview" : "Write"}
                </button>
              ))}
            </div>
          </div>
          {preview ? (
            <div className="min-h-80 rounded-xl bg-ink/40 p-5">
              <Markdown source={body || "_Nothing written yet._"} />
            </div>
          ) : (
            <>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} className="field min-h-96 font-mono text-sm" maxLength={60_000} aria-label="Post body" />
              <p className="text-xs text-mute">{HELP}</p>
              <details className="text-sm">
                <summary className="cursor-pointer text-paper/70">Photos for inside the post</summary>
                <div className="mt-3 space-y-2">
                  <ImagesEditor images={inline} onChange={setInline} max={12} />
                  {inline.length > 0 && <p className="text-xs text-mute">Copy a line into the post where the photo goes:</p>}
                  <ul className="space-y-1">
                    {inline
                      .filter((src) => !src.startsWith("data:"))
                      .map((src) => (
                        <li key={src} className="select-all break-all font-mono text-xs">{`![](${src})`}</li>
                      ))}
                  </ul>
                </div>
              </details>
            </>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-line p-5">
          <label className="block">
            <span className={lbl}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as PostStatus)} className="field">
              <option value="draft">Draft (only you see it)</option>
              <option value="published">Published</option>
            </select>
          </label>
          <label className="block">
            <span className={lbl}>Tags, comma separated</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className="field" placeholder="stalls, care, behind the scenes" />
          </label>
          <div>
            <span className={lbl}>Cover photo</span>
            <ImagesEditor images={cover ? [cover] : []} onChange={(imgs) => setCover(imgs[imgs.length - 1] ?? "")} max={1} />
          </div>
          <button type="submit" className="btn btn-primary w-full justify-center disabled:opacity-50" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          <p role="status" className="text-sm">
            {state.error ? <span className="text-[#ff7a59]">{state.error}</span> : <span className="text-lemon">{state.message}</span>}
          </p>
          {post?.status === "published" && (
            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener" className="block text-sm text-lemon underline underline-offset-2">
              View on the shop ↗
            </a>
          )}
        </section>
      </aside>
    </form>
  );
}
