"use client";

import { useState } from "react";
import { dmLink } from "@/lib/instagram";

export const InstagramIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Instagram can't prefill a DM, so this copies the message first, then
 * opens the chat with the shop. If copying is blocked, the message is
 * shown so the customer can copy it by hand.
 */
export function CopyAndDm({
  handle,
  message,
  label = "Copy order & open Instagram",
  className = "btn btn-primary w-full justify-center",
  onSent,
}: {
  handle: string;
  message: string;
  label?: string;
  className?: string;
  onSent?: () => void;
}) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const href = dmLink(handle);

  async function go(e: React.MouseEvent<HTMLAnchorElement>) {
    // Open the tab inside the tap so pop-up blockers allow it, then copy.
    e.preventDefault();
    // ("noopener" would make window.open return null, so drop the opener by hand.)
    const tab = window.open(href, "_blank");
    if (tab) tab.opener = null;
    const ok = await copyText(message);
    setState(ok ? "copied" : "manual");
    onSent?.();
    // Blocked pop-up and nothing copied: keep the customer here with the text.
    if (!tab && ok) window.location.href = href;
  }

  return (
    <div className="space-y-2">
      <a href={href} target="_blank" rel="noopener" onClick={go} className={className} data-testid="copy-and-dm">
        <InstagramIcon />
        {label}
      </a>
      {state === "copied" && (
        <p className="text-sm text-lemon" role="status">
          Copied. Paste it in the chat with @{handle} and send.
        </p>
      )}
      {state === "manual" && (
        <div className="space-y-1" role="status">
          <p className="text-sm text-paper/70">Copy this and paste it in the chat with @{handle}:</p>
          <textarea readOnly value={message} onFocus={(e) => e.currentTarget.select()} className="field min-h-40 !py-2.5 font-mono text-xs" aria-label="Your order message" />
        </div>
      )}
    </div>
  );
}
