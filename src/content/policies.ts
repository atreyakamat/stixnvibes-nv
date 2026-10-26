import type { Settings } from "@/lib/types";
import { site } from "./site";

// Policy copy. Anything in these pages is a promise to customers, so the
// owner should confirm each one before launch.

export type Policy = { slug: string; title: string; body: (s: Settings) => string[] };

export const policies: Policy[] = [
  {
    slug: "ordering",
    title: "How ordering works",
    body: (s) => [
      `Add what you like to your cart, fill in your name, phone number and address (or pick up at a stall), then tap "Place order". You get an order page to track it. Tap "Copy order & open Instagram" there and paste the order in a DM to ${site.contact.instagramHandle}. We reply to confirm it.`,
      s.orderNote,
      s.deliveryNote,
      s.freeShippingAbovePaise !== null ? `Shipping is free on orders above ₹${s.freeShippingAbovePaise / 100}. Below that, we share the delivery charge for your area on Instagram.` : "",
      s.bulkNote,
      "Offers and bulk prices are worked out in your cart automatically. On buy-X-get-Y deals, the cheapest items in each group are the free ones.",
    ].filter(Boolean),
  },
  {
    slug: "returns",
    title: "Returns and replacements",
    body: () => [
      "Stickers and prints are made for you, so we don't take returns for a change of mind.",
      "If your order arrives damaged, misprinted or wrong, message us within 7 days of delivery with your order ref and a photo. We'll replace it or refund you.",
      `Reach us on Instagram ${site.contact.instagramHandle}, or ${site.contact.email}.`,
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    body: () => [
      "When you order, we keep a copy of the order (items, options, your name, phone number, delivery address and note) so we can make and deliver it. We use these only for your orders and never sell or share them.",
      "Photos you upload for a music card or custom print are kept privately and used only to make your order.",
      "We count page views and button taps without cookies or personal data, to see which designs people like.",
      "Your cart is saved in your browser only. We don't use advertising trackers.",
      `To ask about or delete your data, email ${site.contact.email}.`,
    ],
  },
  {
    slug: "terms",
    title: "Terms",
    body: () => [
      `${site.name} is a student-led brand from Goa, India. These terms cover orders placed through this shop.`,
      "Prices are in Indian rupees. Your order is confirmed once we reply on Instagram and payment is received.",
      "If an item turns out to be unavailable we'll tell you on Instagram, and refund anything you've paid for it.",
      "Colours can look slightly different in print than on screen.",
      "Custom orders: only send photos and artwork you own or have permission to use. We may decline designs we can't legally print.",
    ],
  },
];
