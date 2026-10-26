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
      "Got a code from a stall or a post? Type it under the total in your cart, or scan our QR and it's added for you. A code takes its discount off what's left after the offers.",
      "Want your own design made? Send it from the Custom page with what you'd like and how many. We reply with a price, usually within a day.",
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
      `Last updated 26 October 2026. ${site.name} is a student-led business in Goa, India. This page says what we collect, why, who else handles it, and how to reach us about it.`,
      "What we collect when you order: your name, phone number, delivery address (or that you'll pick up at a stall), your Instagram username if you give it, your note, and what you ordered. For a custom request we also keep the designs you upload. We use this only to make, deliver and support your order, and to keep the records the law asks of a business.",
      "How we contact you: on Instagram if you gave your username, otherwise on WhatsApp or by phone at the number you gave. We only message you about your order or request, never for marketing unless you ask us to.",
      "Photos and designs you upload are stored privately. Only we can open them, and we use them only to print your order. Please only send designs you made or have permission to use.",
      "Who else handles your data, only so the shop works: Supabase (our database and file storage), Netlify (hosts this website), Resend (sends order notifications to our own inbox), and Instagram (Meta) for the messages you send us there. We never sell or rent your data, and we don't use advertising trackers.",
      "Payments go from your UPI app straight to our UPI ID. We see the amount and the reference, never your bank or card details.",
      "Counting visits: we count page views, taps and visits without cookies, ad IDs or anything that identifies you. If you arrived from one of our stall QR codes or links, we note that (for example \"stall-wordsup\") so we know which events work.",
      "On your device: your cart, your saved checkout details, any code from a QR, and that source note are kept in your own browser's storage so you don't have to type them again. Clearing your browser data removes them.",
      "How long we keep it: order records are kept as long as Indian tax law requires (currently about 6 years for invoices). Custom requests that don't become an order, and their designs, are deleted within 12 months. You can ask us to delete anything we don't have to keep.",
      "Under 18? Please ask a parent or guardian before ordering or sending us your details.",
      `Your rights: you can ask what we hold about you, ask us to correct it, or ask us to delete it, under India's Digital Personal Data Protection Act. Email ${site.contact.email} or DM ${site.contact.instagramHandle}, and we'll reply within 7 days. If you're not happy with our reply, you can complain to the Data Protection Board of India.`,
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
      "Custom orders: only send photos and artwork you own or have permission to use. We may decline designs we can't legally print. A quote is confirmed once you agree to it and pay.",
      "Codes: one code per order, no cash value, and they can't be swapped for money. A code can have dates, a minimum order or a limited number of uses, and we may end a code early if it's misused.",
      "Stock: items with limited stock are held for you once we confirm your order. If two people order the last one at the same time, the first confirmed gets it and we refund the other.",
    ],
  },
];
