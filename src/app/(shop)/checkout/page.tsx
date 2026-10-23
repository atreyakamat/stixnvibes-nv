import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <section className="container-x pt-10 md:pt-16">
      <h1 className="display text-[clamp(3.2rem,10vw,7rem)]">Checkout</h1>
      <CheckoutForm />
    </section>
  );
}
