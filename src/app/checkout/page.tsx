"use client";

import { useCart } from "@/context/CartContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !pincode || !phone) {
      alert("Please fill all fields");
      return;
    }
    setLoading(true);
    const url = buildWhatsAppUrl({
      name,
      address,
      pincode,
      phone,
      items,
      totalRupees: total / 100,
    });
    // open WhatsApp in new tab/window
    window.open(url, "_blank");
    clearCart();
    setLoading(false);
  };

  if (items.length === 0) {
    return <p className="section-pad text-center">Your cart is empty.</p>;
  }

  return (
    <section className="section-pad">
      <h1 className="text-2xl font-bold mb-4">Checkout via WhatsApp</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} required />
        <Input placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} required />
        <Input placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <Button type="submit" disabled={loading}>
          {loading ? "Redirecting…" : "Place Order on WhatsApp"}
        </Button>
      </form>
    </section>
  );
}
