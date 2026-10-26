import "server-only";
import { randomInt } from "node:crypto";
import { site } from "@/content/site";
import { addressText } from "@/lib/instagram";
import { escapeHtml, mailOwner, type Attachment } from "@/lib/mail";
import { formatINR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { getStore } from "@/lib/store";
import { kindLabel } from "@/lib/custom-kinds";
import type { CustomRequest, Order } from "@/lib/types";
import type { CustomRequestInput } from "@/lib/validation";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function customNumber(): string {
  let s = "CUS-";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}


const igLine = (h: string) => (h ? `Instagram: @${h} (https://instagram.com/${h})` : "");

/** Text + HTML from the same rows, so both email parts say the same thing. */
function build(title: string, rows: [string, string][], link: string) {
  const kept = rows.filter(([, v]) => v);
  const text = [title, "", ...kept.map(([k, v]) => `${k}: ${v}`), "", `Open in admin: ${link}`].join("\n");
  const html =
    `<h2 style="font-family:sans-serif">${escapeHtml(title)}</h2><table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">` +
    kept.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`).join("") +
    `</table><p style="font-family:sans-serif"><a href="${escapeHtml(link)}">Open in admin</a></p>`;
  return { text, html };
}

/** "New order SNV-…" to the owner. Best effort: never blocks or fails the order. */
export async function notifyNewOrder(order: Order) {
  const items = order.lines.map((l) => `${l.qty} × ${l.name}${l.options.length ? ` (${l.options.join(", ")})` : ""} = ${formatINR(l.lineTotalPaise)}`).join("\n");
  const { text, html } = build(
    `New order ${order.number}: ${formatINR(order.totalPaise)}`,
    [
      ["Customer", order.customerName],
      ["Phone", formatPhone(order.customerPhone)],
      ["Instagram", order.instagram ? `@${order.instagram}` : ""],
      ["Delivery", order.fulfilment === "pickup" ? "Pickup at a stall" : addressText(order.address)],
      ["Items", items],
      ["Code", order.couponCode],
      ["Came from", order.source],
      ["Note", order.customerNote],
      ["Next", "Confirm it in admin once their Instagram DM comes in."],
    ],
    `${site.url}/admin/orders/${order.number}`,
  );
  return mailOwner({ subject: `New order ${order.number} · ${formatINR(order.totalPaise)} · ${order.customerName}`, text, html });
}

/** The bytes of an upload, for email attachments. null when it can't be read. */
async function uploadBytes(id: string): Promise<Buffer | null> {
  const u = await getStore().readUpload(id);
  if (!u) return null;
  if ("body" in u) return u.body;
  try {
    // A short signed link to our own Supabase storage.
    const res = await fetch(u.url, { signal: AbortSignal.timeout(10_000), redirect: "error" });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

const EXT: Record<string, string> = { "89504e47": "png", ffd8ffe0: "jpg", ffd8ffe1: "jpg", ffd8ffdb: "jpg", "52494646": "webp" };
const extOf = (b: Buffer) => EXT[b.subarray(0, 4).toString("hex")] ?? (b[0] === 0xff && b[1] === 0xd8 ? "jpg" : "bin");

export async function notifyCustomRequest(c: CustomRequest) {
  const files: Attachment[] = [];
  for (const [i, id] of c.files.entries()) {
    const body = await uploadBytes(id);
    if (body) files.push({ filename: `${c.number}-design-${i + 1}.${extOf(body)}`, content: body });
  }
  const { text, html } = build(
    `Custom request ${c.number}: ${c.qty} × ${kindLabel(c.kind)}`,
    [
      ["Customer", c.customerName],
      ["Phone", formatPhone(c.customerPhone)],
      ["Instagram", igLine(c.instagram)],
      ["What", kindLabel(c.kind)],
      ["Size / cut", c.size],
      ["Quantity", String(c.qty)],
      ["Note", c.note],
      ["Designs", `${c.files.length} attached`],
      ["Came from", c.source],
    ],
    `${site.url}/admin/custom/${c.number}`,
  );
  return mailOwner({ subject: `Custom request ${c.number} · ${c.qty} × ${kindLabel(c.kind)} · ${c.customerName}`, text, html, attachments: files });
}

/** Saves a /custom request and emails it (with the designs) to the owner. */
export async function createCustomRequest(input: CustomRequestInput): Promise<CustomRequest> {
  const store = getStore();
  // The files must be uploads that exist, not ids someone made up.
  for (const id of input.files) if (!(await store.readUpload(id))) throw new Error("One of your designs didn't upload. Add it again.");
  let req: CustomRequest | null = null;
  for (let attempt = 0; attempt < 4 && !req; attempt++) {
    try {
      req = await store.createCustomRequest({
        number: customNumber(),
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        instagram: input.instagram,
        kind: input.kind,
        size: input.size,
        qty: input.qty,
        note: input.note,
        files: input.files,
        source: input.source,
      });
    } catch (err) {
      if (!/duplicate/i.test((err as Error).message) || attempt === 3) throw err;
    }
  }
  await notifyCustomRequest(req!);
  return req!;
}
