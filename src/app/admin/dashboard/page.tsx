"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownRight,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  AlertTriangle,
  Palette,
  Printer,
  ShieldCheck,
  Layers,
  Truck,
  Clock,
  Star,
  RefreshCw,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

type DashboardData = {
  revenue: {
    total: number;
    today: number;
    this_month: number;
    last_month: number;
    growth_percent: number;
    avg_order_value: number;
  };
  orders: {
    total: number;
    today: number;
    this_month: number;
    status_breakdown: Record<string, number>;
    pending: number;
    delayed: number;
  };
  production_queue: {
    artwork_review: number;
    printing: number;
    qc: number;
    packing: number;
    delayed: number;
  };
  products: {
    total: number;
    active: number;
    out_of_stock: number;
    low_stock: Array<{ id: string; name: string; stock: number; image_url?: string }>;
  };
  best_sellers: Array<{ id: string; name: string; image_url?: string; price_cents: number }>;
  recent_orders: Array<{
    id: string;
    order_number?: string;
    customer_name: string;
    total_cents: number;
    status: string;
    created_at: string;
  }>;
};

const formatINR = (cents: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);

const STATUS_COLORS: Record<string, string> = {
  created: "bg-slate-500/15 text-slate-400",
  sent: "bg-amber-500/15 text-amber-400",
  artwork_review: "bg-orange-500/15 text-orange-400",
  confirmed: "bg-blue-500/15 text-blue-400",
  paid: "bg-emerald-500/15 text-emerald-400",
  print_queue: "bg-cyan-500/15 text-cyan-400",
  printing: "bg-violet-500/15 text-violet-400",
  quality_check: "bg-purple-500/15 text-purple-400",
  packing: "bg-indigo-500/15 text-indigo-400",
  ready_for_dispatch: "bg-teal-500/15 text-teal-400",
  shipped: "bg-blue-500/15 text-blue-300",
  delivered: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-red-500/15 text-red-400",
  refunded: "bg-pink-500/15 text-pink-400",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) return;
    setRefreshing(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/dashboard", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok) setData(json.data || json);
      }
    } catch {
      // Handled gracefully
    } finally {
      setRefreshing(false);
    }
  }, []);

  const initialFetch = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/dashboard", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok) setData(json.data || json);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initialFetch();
    const interval = setInterval(() => fetchDashboard(true), 60000);
    return () => clearInterval(interval);
  }, [initialFetch, fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-brand-yellow border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your business...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-semibold">Could not load dashboard data.</p>
          <p className="text-xs text-muted-foreground mt-1">Check your Supabase connection.</p>
          <Button variant="outline" className="mt-4" onClick={initialFetch}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { revenue, orders, production_queue, products, best_sellers, recent_orders } = data;
  const totalActionItems =
    (production_queue?.artwork_review || 0) +
    (production_queue?.qc || 0) +
    (production_queue?.packing || 0) +
    (orders?.delayed || 0);

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Good morning{" "}
            <span className="text-brand-yellow">Stix N Vibes</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Action Required Alert */}
      {totalActionItems > 0 && (
        <div className="rounded-2xl border border-brand-yellow/40 bg-brand-yellow/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-brand-yellow shrink-0" />
            <div>
              <p className="text-sm font-bold text-brand-yellow">
                {totalActionItems} item{totalActionItems !== 1 ? "s" : ""} require your attention
              </p>
              <p className="text-[11px] text-muted-foreground">
                {production_queue?.artwork_review || 0} artwork reviews ·{" "}
                {production_queue?.qc || 0} QC inspections ·{" "}
                {production_queue?.packing || 0} packing ·{" "}
                {orders?.delayed || 0} delayed orders
              </p>
            </div>
          </div>
          <Button variant="gradient" size="sm" asChild>
            <a href="/admin/orders?status=artwork_review">Review Now →</a>
          </Button>
        </div>
      )}

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Today's Revenue
            </CardTitle>
            <DollarSign className="w-4 h-4 text-brand-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-yellow">
              {formatINR(revenue?.today || 0)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {orders?.today || 0} orders today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              This Month
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(revenue?.this_month || 0)}</div>
            <div className="flex items-center mt-1 gap-1">
              {(revenue?.growth_percent ?? 0) >= 0 ? (
                <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400 border-0">
                  <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                  {revenue?.growth_percent || 0}%
                </Badge>
              ) : (
                <Badge className="text-[9px] bg-red-500/15 text-red-400 border-0">
                  <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />
                  {Math.abs(revenue?.growth_percent || 0)}%
                </Badge>
              )}
              <span className="text-[9px] text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders?.total || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {orders?.this_month || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Avg Order Value
            </CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(revenue?.avg_order_value || 0)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {products?.total || 0} active products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Production Pipeline */}
      <div className="rounded-2xl border border-brand-yellow/20 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-yellow flex items-center gap-2">
            <Package className="w-4 h-4" /> Production Pipeline
          </h2>
          <span className="text-[10px] text-muted-foreground">Real-time · Click to filter</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <a
            href="/admin/orders?status=artwork_review"
            className="group p-3 rounded-xl bg-slate-950/60 border border-orange-500/20 hover:border-orange-500/60 transition-all block"
          >
            <div className="flex items-center justify-between mb-2">
              <Palette className="w-4 h-4 text-orange-400" />
              <span className="text-xl font-bold text-orange-400">
                {production_queue?.artwork_review || 0}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-orange-400">Artwork Review</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Needs approval</p>
          </a>

          <a
            href="/admin?module=ops_print_queue"
            className="group p-3 rounded-xl bg-slate-950/60 border border-violet-500/20 hover:border-violet-500/60 transition-all block"
          >
            <div className="flex items-center justify-between mb-2">
              <Printer className="w-4 h-4 text-violet-400" />
              <span className="text-xl font-bold text-violet-400">
                {production_queue?.printing || 0}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-violet-400">Printing</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">In print queue</p>
          </a>

          <a
            href="/admin?module=ops_qc"
            className="group p-3 rounded-xl bg-slate-950/60 border border-purple-500/20 hover:border-purple-500/60 transition-all block"
          >
            <div className="flex items-center justify-between mb-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="text-xl font-bold text-purple-400">
                {production_queue?.qc || 0}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-purple-400">Quality Check</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Inspection</p>
          </a>

          <a
            href="/admin?module=ops_packing"
            className="group p-3 rounded-xl bg-slate-950/60 border border-indigo-500/20 hover:border-indigo-500/60 transition-all block"
          >
            <div className="flex items-center justify-between mb-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-xl font-bold text-indigo-400">
                {production_queue?.packing || 0}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-indigo-400">Packing</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Ready to ship</p>
          </a>

          <a
            href="/admin/orders?status=shipped"
            className="group p-3 rounded-xl bg-slate-950/60 border border-red-500/20 hover:border-red-500/60 transition-all block"
          >
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-4 h-4 text-red-400" />
              <span className="text-xl font-bold text-red-400">
                {production_queue?.delayed || 0}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-red-400">Delayed</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">&gt;48h pending</p>
          </a>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 bg-slate-900/60 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Recent Orders
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-[10px] h-7" asChild>
              <a href="/admin/orders">
                View All <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recent_orders?.length > 0 ? (
                recent_orders.map((order) => (
                  <a
                    key={order.id}
                    href={`/admin/orders?id=${order.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-slate-950/40 hover:bg-slate-900/60 hover:border-border/80 transition-all group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-100 group-hover:text-brand-yellow transition-colors">
                        {order.customer_name || "Guest"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        #{order.id?.substring(0, 8)} ·{" "}
                        {new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          STATUS_COLORS[order.status] || "bg-slate-500/15 text-slate-400"
                        }`}
                      >
                        {order.status?.replace(/_/g, " ") || "pending"}
                      </span>
                      <span className="text-sm font-bold text-brand-yellow">
                        {formatINR(order.total_cents || 0)}
                      </span>
                    </div>
                  </a>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No orders yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Inventory Alerts */}
          <Card className="bg-slate-900/60 border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-brand-yellow" /> Inventory
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-[10px] h-7" asChild>
                <a href="/admin/products">Manage</a>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Out of Stock</span>
                <span className="text-sm font-bold text-red-400">
                  {products?.out_of_stock || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Low Stock (&lt;10)</span>
                <span className="text-sm font-bold text-brand-yellow">
                  {products?.low_stock?.length || 0}
                </span>
              </div>
              {products?.low_stock?.length > 0 && (
                <div className="pt-2 border-t border-border/40 space-y-2">
                  {products.low_stock.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span className="text-[11px] text-slate-300 truncate flex-1 mr-2">
                        {item.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] text-brand-yellow border-brand-yellow/30 shrink-0"
                      >
                        {item.stock} left
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Best Sellers */}
          {best_sellers && best_sellers.length > 0 && (
            <Card className="bg-slate-900/60 border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-brand-yellow" /> Featured Products
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {best_sellers.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-border/60 overflow-hidden shrink-0">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-4 h-4 m-2 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatINR(p.price_cents)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <Card className="bg-slate-900/60 border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { href: "/admin/products", label: "Add Product", icon: Package },
                { href: "/admin/orders", label: "View Orders", icon: ShoppingCart },
                { href: "/admin/customers", label: "Customers", icon: Users },
                { href: "/admin/media", label: "Upload Media", icon: Truck },
              ].map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border/50 bg-slate-950/40 hover:border-brand-yellow/40 hover:bg-slate-900/60 transition-all text-center"
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
