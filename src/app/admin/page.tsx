"use client";

import { useEffect, useState } from "react";
import { createBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Simple admin dashboard – lists categories and products via the admin API.
export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowser();
    if (!supabase) return;
    // Listen to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    // Fetch admin data if logged in
    if (user) {
      fetchData();
    }
    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, [user]);

  const fetchData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch("/api/admin/categories"),
        fetch("/api/admin/products"),
      ]);
      const [catData, prodData] = await Promise.all([catRes.json(), prodRes.json()]);
      setCategories(catData);
      setProducts(prodData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const supabase = createBrowser();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  if (!user) {
    return (
      <section className="section-pad text-center">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <p className="mb-4">You need to sign in to access admin features.</p>
        <Button onClick={handleLogin}>Sign in with Google</Button>
      </section>
    );
  }

  return (
    <section className="section-pad">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      {loading ? (
        <p>Loading data…</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {/* Categories Card */}
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-2">Categories ({categories.length})</h2>
            <ul className="list-disc list-inside space-y-1">
              {categories.map((c) => (
                <li key={c.id}>{c.name} ({c.slug})</li>
              ))}
            </ul>
          </Card>

          {/* Products Card */}
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-2">Products ({products.length})</h2>
            <ul className="list-disc list-inside space-y-1 max-h-64 overflow-y-auto">
              {products.map((p) => (
                <li key={p.id}>{p.name} – {p.price_cents / 100} ₹ ({p.type})</li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </section>
  );
}
