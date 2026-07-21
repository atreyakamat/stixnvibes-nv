import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { FaqJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "FAQ — Stix N Vibes",
  description: "Answers about shipping, payments, returns, customisation, product care, frames, Spotify cards, stickers & more.",
  alternates: { canonical: "/faq" },
};

const faqs: { q: string; a: string }[] = [
  { q: "What's the difference between Normal and Vinyl stickers?", a: "Normal stickers are matte-finish paper; vinyl stickers are waterproof, UV-resistant, and last 2+ years outdoors. For laptops, helmets, water bottles — go vinyl." },
  { q: "How long does shipping take?", a: "We ship across India in 2-3 business days normally. Free shipping on orders over ₹499. International shipping is available on request." },
  { q: "How do Spotify Cards work?", a: "Paste a Spotify song link in the customizer, upload a photo, pick a theme — we print a premium 300 GSM card with a scannable QR that opens the song instantly." },
  { q: "Can I refund a custom product?", a: "Custom products (Spotify cards, custom posters, frames with your photo) cannot be returned unless there's a print defect. Pre-designed items have a 7-day easy-return window." },
  { q: "What's in a Mystery Pack?", a: "A mix of 10-12 surprise stickers + one rare holo. Themed packs guarantee items from that category (e.g. Anime Pack = 100% anime)." },
  { q: "Do you offer corporate / bulk orders?", a: "Yes! Check the 'Corporate / wholesale order' box at checkout for a 10% bulk discount, or contact us at hello@stixnvibes.com with your requirements." },
  { q: "How are stickers printed?", a: "Premium vinyl with latex eco-solvent inks; matte/glossy finish options. Fade-resistant up to 5+ years." },
  { q: "Are frames easy to mount?", a: "All frames come ready-to-hang with pre-installed brackets. Premium solid-wood frames ship with shatterproof acrylic and mounting hardware." },
  { q: "How do I track my order?", a: "Once your WhatsApp order is confirmed, our team will share a live tracking link. Most metro deliveries arrive next-day." },
  { q: "Is payment on delivery available?", a: "Yes — our WhatsApp flow defaults to pay-on-delivery. For pre-paid, we can invoice UPI/QR inside the chat too." },
];

export default function FAQPage() {
  return (
    <Container className="pt-28 pb-12 md:pt-36">
      <FaqJsonLd questions={faqs} />
      <div className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Frequently asked</h1>
        <p className="mt-2 text-muted-foreground">If your question isn't here, drop us a WhatsApp message — we usually reply within minutes.</p>
      </div>
      <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
        {faqs.map((item, i) => (
          <details key={i} className="group px-5 py-4">
            <summary className="flex cursor-pointer items-center justify-between gap-2 font-medium">
              <span>{item.q}</span>
              <span className="grid size-6 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45 group-open:text-foreground">
                <span className="text-xl leading-none">+</span>
              </span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </Container>
  );
}
