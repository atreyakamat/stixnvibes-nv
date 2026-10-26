import { getAdmin } from "@/lib/admin/session";
import { UPLOAD_ID_RE } from "@/lib/constants";
import { supabaseConfig } from "@/lib/env";
import { getStoreOrNull } from "@/lib/store";

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Same-origin copy of a product photo or customer upload, for the Cricut
 * sheet maker: a canvas can only export images it was allowed to read.
 * Admin only, and only our own storage, so it can't fetch arbitrary URLs.
 */
export async function GET(req: Request) {
  if (!(await getAdmin())) return new Response("Not allowed", { status: 401 });
  const src = new URL(req.url).searchParams.get("src") ?? "";
  const headers = { "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" };

  const upload = /^\/u\/([a-z0-9]+)$/.exec(src)?.[1];
  if (upload && UPLOAD_ID_RE.test(upload)) {
    const u = await getStoreOrNull()?.readUpload(upload);
    if (!u) return new Response("Not found", { status: 404 });
    if ("body" in u) return new Response(new Uint8Array(u.body), { headers: { ...headers, "Content-Type": u.contentType } });
    return relay(u.url, headers);
  }

  const cfg = supabaseConfig();
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return new Response("Bad source", { status: 400 });
  }
  if (!cfg || url.protocol !== "https:" || url.host !== new URL(cfg.url).host || !url.pathname.startsWith("/storage/v1/object/public/product-images/")) {
    return new Response("Bad source", { status: 400 });
  }
  return relay(url.toString(), headers);
}

async function relay(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15_000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpeg|webp)$/.test(type)) return new Response("Not found", { status: 404 });
    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_BYTES) return new Response("Too big", { status: 413 });
    return new Response(body, { headers: { ...headers, "Content-Type": type } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
