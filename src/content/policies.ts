import type { Settings } from "@/lib/types";
import { site } from "./site";

// Policy copy. Anything in these pages is a promise to customers, so the
// owner should confirm each one (see the shop questionnaire) before launch.

export type Policy = { slug: string; title: string; body: (s: Settings | null) => string[] };

export const policies: Policy[] = [
  {
    slug: "shipping",
    title: "Shipping",
    body: (s) => [
      s?.shipsTo ? `We ship to: ${s.shipsTo}.` : "We ship within India.",
      s?.dispatchNote || "We dispatch within 2 days.",
      s && s.freeShippingAbovePaise !== null
        ? `Shipping is free on orders above ₹${s.freeShippingAbovePaise / 100}. Below that, the shipping fee is shown at checkout before you pay.`
        : "The shipping fee is shown at checkout before you pay.",
      s?.pickupEnabled ? `Free pickup: ${s.pickupNote || "collect your order from us in Goa"}.` : "",
      "Once your order ships we add the courier and tracking number to your order page.",
    ].filter(Boolean),
  },
  {
    slug: "returns",
    title: "Returns and replacements",
    body: () => [
      "Stickers and prints are made for you, so we don't take returns for a change of mind.",
      "If your order arrives damaged, misprinted or wrong, message us within 7 days of delivery with your order number and a photo. We'll replace it or refund you.",
      `Reach us on Instagram ${site.contact.instagramHandle}, WhatsApp, or ${site.contact.email}.`,
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    body: () => [
      "We collect only what we need to deliver your order: your name, phone number, delivery address and, if you give them, your email and Instagram handle.",
      "We use these details to process your order and to message you about it. We don't sell or share them, except with the courier delivering your order.",
      "Payments are made directly from your UPI app to our UPI ID. We never see or store your bank or card details.",
      "Your cart is saved in your browser only. We don't use advertising trackers.",
      `To ask about or delete your data, email ${site.contact.email}.`,
    ],
  },
  {
    slug: "terms",
    title: "Terms",
    body: () => [
      `${site.name} is a student-led brand from Goa, India. These terms cover orders placed on this shop.`,
      "Prices are in Indian rupees and include everything shown at checkout. The price you pay is the one on your order page.",
      "An order is confirmed once payment is verified, or for pay-at-pickup orders, once you collect and pay.",
      "We may cancel an order if an item turns out to be unavailable or payment can't be verified. If you already paid, we refund you in full.",
      "Colours can look slightly different in print than on screen.",
      "Custom orders: only send artwork you own or have permission to use. We may decline designs we can't legally print.",
    ],
  },
];
