import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <section className="container-x pt-10 md:pt-16">
      <h1 className="display text-[clamp(3.2rem,10vw,7rem)]">Your cart</h1>
      <CartView />
    </section>
  );
}
