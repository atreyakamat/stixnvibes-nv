"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, AlertCircle } from "lucide-react";

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
    low_stock: any[];
  };
};

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
        const res = await fetch("/api/admin/dashboard", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.ok) {
            setData(json.data);
          }
        }
      } catch {
        // Handled gracefully
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-slate-950 min-h-screen flex items-center justify-center text-slate-400">
        Loading analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-slate-950 min-h-screen flex items-center justify-center text-red-400">
        Failed to load analytics data.
      </div>
    );
  }

  const { revenue, orders, production_queue, products } = data;

  // Format currency
  const formatCurrency = (cents: number) => `₹${(cents / 100).toFixed(2)}`;

  // Status Breakdown Chart
  const statusEntries = Object.entries(orders.status_breakdown || {});
  const totalBreakdown = statusEntries.reduce((acc, [_, count]) => acc + count, 0);

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20 bg-slate-950 min-h-screen text-slate-50">
      <div>
        <h1 className="font-display text-2xl font-bold">Analytics & Reports</h1>
        <p className="text-xs text-muted-foreground mt-1">Detailed overview of business performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800 text-slate-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-slate-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">This Month</CardTitle>
            {revenue.growth_percent >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue.this_month)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className={revenue.growth_percent >= 0 ? "text-emerald-400" : "text-red-400"}>
                {revenue.growth_percent > 0 ? "+" : ""}{revenue.growth_percent}%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-slate-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Orders</CardTitle>
            <ShoppingCart className="w-4 h-4 text-brand-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.total}</div>
            <p className="text-xs text-muted-foreground mt-1">{orders.this_month} this month</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-slate-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Avg. Order Value</CardTitle>
            <TrendingUp className="w-4 h-4 text-brand-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue.avg_order_value)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800 text-slate-50">
          <CardHeader>
            <CardTitle className="text-base">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusEntries.length > 0 ? (
                statusEntries.map(([status, count]) => {
                  const percent = totalBreakdown > 0 ? Math.round((count / totalBreakdown) * 100) : 0;
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300 capitalize">{status.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">{count} ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-brand-yellow rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground">No orders data available.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-50">
            <CardHeader>
              <CardTitle className="text-base">Production Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-xs text-muted-foreground">Artwork Review</p>
                  <p className="text-xl font-bold mt-1">{production_queue.artwork_review}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-xs text-muted-foreground">Printing</p>
                  <p className="text-xl font-bold mt-1 text-emerald-400">{production_queue.printing}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-xs text-muted-foreground">Quality Check</p>
                  <p className="text-xl font-bold mt-1">{production_queue.qc}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-xs text-muted-foreground">Packing</p>
                  <p className="text-xl font-bold mt-1">{production_queue.packing}</p>
                </div>
              </div>
              {production_queue.delayed > 0 && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-400">Delayed Orders</p>
                    <p className="text-xs text-red-300/70">{production_queue.delayed} orders require attention.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-50">
            <CardHeader>
              <CardTitle className="text-base">Inventory Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">Active Products</span>
                </div>
                <span className="font-bold">{products.active}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-brand-yellow" />
                  <span className="text-sm text-slate-300">Low Stock</span>
                </div>
                <Badge className="bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20">
                  {products.low_stock?.length || 0} items
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-slate-300">Out of Stock</span>
                </div>
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                  {products.out_of_stock} items
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
