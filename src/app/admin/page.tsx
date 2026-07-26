"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShoppingCart, Package, Tag, LogOut, Sparkles, RefreshCw, Loader2, Download, AlertTriangle, Layers } from "lucide-react";

type OrderRow = {
  id: string;
  created_at: string;
  customer_name: string;
  total_cents: number;
  status: string;
  whatsapp_url: string | null;
};
type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  stock: number;
  is_featured: boolean;
  collection: string | null;
  type: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [fetching, setFetching] = React.useState(false);

  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
    if (!token) {
      router.replace("/login?redirect=/admin");
      return;
    }
    setAuthed(true);
    setLoading(false);
    void loadAll();
  }, [router]);

  async function loadAll() {
    setFetching(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [o, p] = await Promise.all([
        fetch("/api/admin/orders", { headers }).then(r => r.json()),
        fetch("/api/admin/products", { headers }).then(r => r.json())
      ]);
      if (o?.ok) setOrders((o.data ?? []) as OrderRow[]);
      if (p?.ok) setProducts((p.data ?? []) as ProductRow[]);
    } finally {
      setFetching(false);
    }
  }

  function logout() {
    localStorage.removeItem("snv.admin.accessToken");
    router.replace("/login");
  }

  type CategoryAgg = { key: string; count: number; featured: number };
  const categoryAgg: CategoryAgg[] = React.useMemo(() => {
    const m = new Map<string, CategoryAgg>();
    for (const p of products) {
      const key = (p.collection || p.type || "Other") as string;
      const prev = m.get(key) ?? { key, count: 0, featured: 0 };
      prev.count += 1;
      if (p.is_featured) prev.featured += 1;
      m.set(key, prev);
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [products]);
  const topCategories = categoryAgg.slice(0, 5);
  const totalCatalog = categoryAgg.reduce((s, c) => s + c.count, 0) || 1;
  const lowStock = products.filter(p => typeof p.stock === "number" && p.stock > 0 && p.stock <= 5).slice(0, 6);
  const outOfStock = products.filter(p => typeof p.stock === "number" && p.stock <= 0).length;

  if (loading) {
    return (
      <Container className="grid min-h-[80vh] place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading admin...
        </div>
      </Container>
    );
  }
  if (!authed) return null;

  const totalSalesRupees = orders.reduce((s, o) => s + (o.status === "paid" || o.status === "confirmed" ? Number(o.total_cents) || 0 : 0), 0) / 100;
  const aov = orders.length ? totalSalesRupees / orders.filter(o => o.status === "paid" || o.status === "confirmed").length : 0;

  function fmt(cents: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents / 100);
  }

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
            <ShieldCheck className="size-7 text-brand-yellow" /> Admin
          </h1>
          <p className="text-sm text-muted-foreground">Stix N Vibes back-office · demo dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadAll()} disabled={fetching}>
            {fetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={<ShoppingCart className="size-5 text-brand-yellow" />} label="Orders" value={orders.length.toLocaleString()} />
        <KpiCard icon={<Sparkles className="size-5 text-brand-orange" />} label="Total sales" value={fmt(totalSalesRupees * 100)} />
        <KpiCard icon={<Tag className="size-5 text-brand-purple" />} label="AVG order" value={Number.isFinite(aov) && aov > 0 ? fmt(aov * 100) : "—"} />
      </div>

      {/* Recent orders */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShoppingCart className="size-4" /> Recent orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <EmptyState text="No orders yet — they'll appear here once WhatsApp checkout is used." />
          ) : (
            <div className="divide-y divide-border">
              {orders.slice(0, 10).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{o.customer_name}
                      <span className="ml-2 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{o.id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={o.status === "paid" || o.status === "confirmed" ? "success" : "outline"}>{o.status}</Badge>
                    <span className="font-medium tabular-nums">{fmt(o.total_cents)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catalog snapshot */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Package className="size-4" /> Catalog snapshot</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <EmptyState text="No products in Supabase. Insert rows via Supabase Studio or POST /api/admin/products." />
          ) : (
            <div className="divide-y divide-border">
              {products.slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.slug}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.is_featured ? <Badge variant="brand" size="sm">Featured</Badge> : null}
                    <Badge variant={p.stock <= 5 ? "accent" : "outline"} size="sm">{p.stock} in stock</Badge>
                    <span className="font-medium tabular-nums">{fmt(p.price_cents)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Top categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4" /> Top categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategories.length === 0 ? (
              <EmptyState text="Category data appears once products are catalogued in Supabase." />
            ) : (
              topCategories.map((c) => {
                const pct = Math.round((c.count / totalCatalog) * 100);
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.key}</span>
                      <span className="text-muted-foreground tabular-nums">{c.count} SKUs · {pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-brand-gradient"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Low stock + exports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4" /> Low stock alerts
              {outOfStock > 0 && (
                <Badge variant="accent" size="sm" className="ml-auto bg-red-500/20 text-red-400 border-red-500/30">
                  {outOfStock} out
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.length === 0 && outOfStock === 0 ? (
              <EmptyState text="All clear — every SKU has more than 5 units in stock." />
            ) : (
              <ul className="divide-y divide-border">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span className="truncate">{p.name}</span>
                    <Badge variant="accent" size="sm">{p.stock} left</Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button asChild variant="outline" size="sm">
                <a href="/api/admin/inventory/forecast?days=30&buffer=0.2" target="_blank" rel="noreferrer">
                  <Download className="size-4" /> CSV · 30-day forecast
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a href="/api/admin/inventory/forecast?days=90&buffer=0.3" target="_blank" rel="noreferrer">
                  90-day forecast
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">← Back to store</Link>
        <span>·</span>
        <span>For full CRUD use Supabase Studio.</span>
      </div>
    </Container>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid place-items-center p-10 text-center">
      <Sparkles className="size-7 text-muted-foreground/40" />
      <p className="mt-3 max-w-md text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
