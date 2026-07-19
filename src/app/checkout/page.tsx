"use client";

import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createRazorpayOrder } from "@/lib/payment/razorpay";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const receipt = `order-${Date.now()}`;
      const order = await createRazorpayOrder({
        amountInRupees: total / 100,
        receipt,
      });
      setOrderId(order.id);
      // Load Razorpay script and open checkout (client side)
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: "Stix N Vibes",
          description: "Order " + receipt,
          order_id: order.id,
          handler: async function (response: any) {
            // In real app you would verify on server.
            alert("Payment successful! Payment ID: " + response.razorpay_payment_id);
            clearCart();
          },
          prefill: {},
          theme: { color: "#F37254" },
        } as any;
        // @ts-ignore
        const rzp = new window.Razorpay(options);
        rzp.open();
      };
    } catch (e) {
      console.error(e);
      alert("Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return <p className="section-pad text-center">Your cart is empty.</p>;
  }

  return (
    <section className="section-pad">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <p className="mb-2">Total: {formatPrice(total / 100)}</p>
      <Button onClick={handleCheckout} disabled={loading}>
        {loading ? "Processing…" : "Pay with Razorpay"}
      </Button>
    </section>
  );
}

function formatPrice(rupees: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}
