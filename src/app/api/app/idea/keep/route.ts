import { randomBytes } from "node:crypto";
import { handleError, json, readJson } from "@/lib/api";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { checkIdea, cleanSeed, IDEA_KINDS, ideaImageUrl, type IdeaKind } from "@/lib/idea";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { isImage } from "@/lib/upload-check";

// Keeps a generated idea as an upload so it can go into a custom request.
// The image URL is rebuilt from the idea, kind and seed; the client never
// chooses what the server fetches. The phone has usually just loaded the
// same picture, so Pollinations serves it from its cache.
export async function POST(req: Request) {
  if (!(await rateLimit("app-idea-keep", 10, 24 * 60 * 60_000))) return json({ error: "Too many saved ideas today. Send us the rest on Instagram." }, 429);
  const body = (await readJson(req)) as { idea?: unknown; kind?: unknown; seed?: unknown } | null;
  const check = checkIdea(body?.idea);
  if (!check.ok) return json({ error: check.error }, 400);
  if (typeof body?.seed !== "number") return json({ error: "Generate the idea first." }, 400);
  const kind: IdeaKind = (IDEA_KINDS as readonly unknown[]).includes(body.kind) ? (body.kind as IdeaKind) : "sticker";
  const url = ideaImageUrl(check.idea, kind, cleanSeed(body.seed));

  let bytes: Uint8Array<ArrayBuffer>;
  let type: string;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(9_000), redirect: "error" });
    type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
    if (!res.ok) throw new Error(`pollinations ${res.status}`);
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    console.error("[idea-keep]", err);
    return json({ error: "Couldn't save the picture. Try again in a moment." }, 502);
  }
  if (bytes.byteLength > MAX_UPLOAD_BYTES || !isImage(bytes.slice(0, 12), type)) return json({ error: "Couldn't save the picture. Try again in a moment." }, 502);

  try {
    const id = randomBytes(16).toString("hex");
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    await getStore().saveUpload(id, new File([bytes], `idea.${ext}`, { type }));
    return json({ id });
  } catch (err) {
    return handleError(err, "idea-keep");
  }
}
