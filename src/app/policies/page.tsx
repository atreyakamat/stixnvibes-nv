"use client";

export default function PoliciesPage(){
  return(
    <section className="section-pad max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Policies</h1>
      <h2 className="text-2xl font-semibold mb-2">Privacy Policy</h2>
      <p className="mb-4 text-muted-foreground">Your privacy is important to us. We collect only necessary information … (placeholder).</p>
      <h2 className="text-2xl font-semibold mb-2">Refund Policy</h2>
      <p className="mb-4 text-muted-foreground">Custom products are non‑returnable unless defective. Standard items may be returned within 30 days … (placeholder).</p>
      <h2 className="text-2xl font-semibold mb-2">Shipping Policy</h2>
      <p className="mb-4 text-muted-foreground">We ship worldwide. Delivery times vary by location – see checkout for estimates.</p>
    </section>
  );
}
