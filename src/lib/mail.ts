import "server-only";
import { mailConfig } from "@/lib/env";

// Emails to the shop owner (new orders, custom design requests) through
// Resend's HTTP API. No SDK, no SMTP: one fetch. When RESEND_API_KEY isn't
// set, nothing is sent and everything still shows in admin.

export type Attachment = { filename: string; content: Buffer };
export type Mail = { subject: string; text: string; html: string; attachments?: Attachment[]; replyTo?: string };

/** Resend's limit is 40 MB per email after base64; stay well under it. */
const MAX_ATTACH_BYTES = 25 * 1024 * 1024;

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Sends to the owner. Returns false (and logs) on any failure; never throws. */
export async function mailOwner(m: Mail, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const cfg = mailConfig();
  if (!cfg) return false;
  let budget = MAX_ATTACH_BYTES;
  const attachments = (m.attachments ?? [])
    .filter((a) => (budget -= a.content.length) >= 0)
    .map((a) => ({ filename: a.filename, content: a.content.toString("base64") }));
  const skipped = (m.attachments?.length ?? 0) - attachments.length;
  const note = skipped > 0 ? `\n\n${skipped} file(s) were too big to attach. Open them in admin.` : "";
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: cfg.from,
        to: cfg.to,
        subject: m.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
        text: m.text + note,
        html: m.html + (note ? `<p>${escapeHtml(note.trim())}</p>` : ""),
        ...(m.replyTo ? { reply_to: m.replyTo } : {}),
        ...(attachments.length ? { attachments } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });
    if (!res.ok) {
      console.error("[mail] resend said", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mail]", err);
    return false;
  }
}
