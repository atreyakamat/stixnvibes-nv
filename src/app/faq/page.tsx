"use client";

export default function FAQPage() {
  const faqs = [
    { q: "What is the turnaround time for custom orders?", a: "Usually 3-5 business days after design approval." },
    { q: "Do you ship internationally?", a: "Yes, we ship worldwide with calculated shipping rates at checkout." },
    { q: "What materials are used for vinyl stickers?", a: "High‑quality waterproof vinyl with UV resistant laminate." },
    { q: "Can I return a custom product?", a: "Custom items are non‑returnable unless defective." },
  ];

  return (
    <section className="section-pad max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Frequently Asked Questions</h1>
      {faqs.map((item, i) => (
        <div key={i} className="mb-4">
          <h2 className="font-semibold text-lg">{item.q}</h2>
          <p className="text-muted-foreground">{item.a}</p>
        </div>
      ))}
    </section>
  );
}
