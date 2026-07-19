"use client";

import { useCart } from "@/context/CartContext";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, total } = useCart();

  if (items.length === 0) {
    return (
      <section className="section-pad text-center">
        <p className="mb-4">Your cart is empty.</p>
        <Link href="/shop" className="text-primary underline">Continue shopping</Link>
      </section>
    );
  }

  return (
    <section className="section-pad">
      <h1 className="text-2xl font-bold mb-6">Cart</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="flex p-4 items-center">
            <Image src={item.image ?? "/placeholder.png"} alt={item.name} width={80} height={80} className="rounded" />
            <div className="ml-4 flex-1">
              <h2 className="font-medium">{item.name}</h2>
              <p className="text-sm text-muted-foreground">{formatPrice(item.price_cents / 100)}</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                className="w-16 border rounded px-1"
              />
              <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} aria-label="Remove">
                ✕
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex justify-between items-center">
        <p className="text-xl font-semibold">Total: {formatPrice(total / 100)}</p>
        <Link href="/checkout" className="px-6 py-2 bg-primary text-background rounded-md hover:opacity-90">
          Proceed to Checkout
        </Link>
      </div>
    </section>
  );
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents);
}
