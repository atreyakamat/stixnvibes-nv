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
      "Add what you like to your cart, then tap \"Checkout on WhatsApp\". Your order opens as a ready-to-send WhatsApp message to us.",
      s.orderNote,
      s.deliveryNote,
      s.freeShippingAbovePaise !== null ? `Shipping is free on orders above ₹${s.freeShippingAbovePaise / 100}. Below that, we share the delivery charge for your area on WhatsApp.` : "",
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
      `Reach us on WhatsApp, Instagram ${site.contact.instagramHandle}, or ${site.contact.email}.`,
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    body: () => [
      "When you order, we keep a copy of the order (items, options, the name and note you typed) so we can make it. Your phone number reaches us through WhatsApp, not this site.",
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
      "Prices are in Indian rupees. Your order is confirmed once we reply on WhatsApp and payment is received.",
      "If an item turns out to be unavailable we'll tell you on WhatsApp, and refund anything you've paid for it.",
      "Colours can look slightly different in print than on screen.",
      "Custom orders: only send photos and artwork you own or have permission to use. We may decline designs we can't legally print.",
    ],
  },
];
