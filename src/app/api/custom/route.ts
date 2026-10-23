import { fieldErrors, handleError, json } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";
import { customRequestSchema, MAX_UPLOAD_BYTES, UPLOAD_TYPES } from "@/lib/validation";

export async function POST(req: Request) {
  if (!(await rateLimit("custom", 5, 30 * 60_000))) {
    return json({ error: "Too many requests. Try again later, or DM us on Instagram." }, 429);
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Invalid form." }, 400);
  }
  const parsed = customRequestSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return json({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) }, 400);

  const upload = form.get("file");
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  if (file && file.size > MAX_UPLOAD_BYTES) return json({ error: "Files can be up to 8 MB.", fields: { file: "Files can be up to 8 MB." } }, 400);
  if (file && !UPLOAD_TYPES.includes(file.type)) {
    return json({ error: "Upload a PNG, JPG, WebP or PDF.", fields: { file: "Upload a PNG, JPG, WebP or PDF." } }, 400);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { company, ...data } = parsed.data;
    await getStore().createCustomRequest(data, file);
    return json({ ok: true }, 201);
  } catch (err) {
    return handleError(err, "custom");
  }
}
