import { formatINR } from "./money";
import type { AppliedOffer, OrderLine } from "./types";

export const DEFAULT_WHATSAPP = "917744020601";

export function waLink(number: string, text?: string) {
  const digits = number.replace(/\D/g, "") || DEFAULT_WHATSAPP;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export type MessageInput = {
  number?: string | null;
  lines: Pick<OrderLine, "name" | "options" | "custom" | "qty" | "unitPricePaise" | "lineTotalPaise">[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  offers: Pick<AppliedOffer, "name" | "discountPaise">[];
  customerName?: string;
  customerNote?: string;
};

/** The order as a WhatsApp message the customer sends to the shop. */
export function orderMessage(o: MessageInput): string {
  const out: string[] = ["Hi Stix N Vibes! I'd like to order:", ""];
  o.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name} × ${l.qty} = ${formatINR(l.lineTotalPaise)}`);
    for (const opt of l.options) out.push(`   ${opt}`);
    for (const c of l.custom) out.push(`   ${c.label}: ${c.value}`);
  });
  out.push("");
  if (o.discountPaise > 0) {
    out.push(`Subtotal: ${formatINR(o.subtotalPaise)}`);
    for (const a of o.offers) out.push(`${a.name}: −${formatINR(a.discountPaise)}`);
  }
  out.push(`Total: ${formatINR(o.totalPaise)}`);
  if (o.customerName) out.push("", `Name: ${o.customerName}`);
  if (o.customerNote) out.push(`Note: ${o.customerNote}`);
  if (o.number) out.push("", `Order ref: ${o.number}`);
  return out.join("\n");
}

/** A question about one product that has no online price, or is upcoming. */
export function askMessage(name: string, url: string) {
  return `Hi Stix N Vibes! I'm interested in "${name}". ${url}`;
}
