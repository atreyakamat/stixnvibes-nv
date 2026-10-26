import { UPLOAD_ID_RE } from "@/lib/constants";
import { getStoreOrNull } from "@/lib/store";

// Opens a customer's uploaded photo. Ids are 128-bit random, so a link can't
// be guessed; the file itself sits in a private bucket behind a 5 minute link.
export async function GET(_req: Request, ctx: RouteContext<"/u/[id]">) {
  const { id } = await ctx.params;
  if (!UPLOAD_ID_RE.test(id)) return new Response("Not found", { status: 404 });
  const upload = await getStoreOrNull()?.readUpload(id);
  if (!upload) return new Response("Not found", { status: 404 });
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff" };
  if ("url" in upload) return Response.redirect(upload.url, 302);
  return new Response(new Uint8Array(upload.body), { headers: { ...headers, "Content-Type": upload.contentType } });
}
