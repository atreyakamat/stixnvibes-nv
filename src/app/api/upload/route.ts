import { randomBytes } from "node:crypto";
import { handleError, json } from "@/lib/api";
import { MAX_UPLOAD_BYTES, UPLOAD_TYPES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { isImage } from "@/lib/upload-check";

// Customer photos for custom products. Returns an id the cart keeps; the
// order message links to /u/<id>, which only the shop owner needs to open.
export async function POST(req: Request) {
  if (!(await rateLimit("upload", 30, 10 * 60_000))) return json({ error: "Too many uploads. Try again in a few minutes." }, 429);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Choose a photo." }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ error: "Choose a photo." }, 400);
  if (!(UPLOAD_TYPES as readonly string[]).includes(file.type)) return json({ error: "Use a JPG, PNG or WebP photo." }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: "Photos can be up to 8 MB." }, 400);
  // The browser's type is only a claim: check the file really is that image.
  if (!isImage(new Uint8Array(await file.slice(0, 12).arrayBuffer()), file.type)) return json({ error: "Use a JPG, PNG or WebP photo." }, 400);
  try {
    const id = randomBytes(16).toString("hex");
    await getStore().saveUpload(id, file);
    return json({ id });
  } catch (err) {
    if (err instanceof Error && /limit/i.test(err.message)) return json({ error: err.message }, 400);
    return handleError(err, "upload");
  }
}
