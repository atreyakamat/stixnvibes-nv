"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Package, ShoppingCart, DollarSign, Users, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
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
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatINR = (cents: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format((cents || 0) / 100);
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading dashboard...</div>;
  if (!data) return <div className="p-6 text-destructive">Failed to load dashboard data.</div>;

  const { revenue, orders, products, recent_orders } = data;

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-900/60 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(revenue?.total || 0)}</div>
            <div className="flex items-center mt-1 space-x-2">
              {revenue?.growth_percent >= 0 ? (
                <Badge variant="success" className="text-[10px]">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {revenue?.growth_percent || 0}%
                </Badge>
              ) : (
                <Badge variant="default" className="bg-red-500/15 text-red-500 border-red-500/25 text-[10px]">
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                  {Math.abs(revenue?.growth_percent || 0)}%
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(revenue?.today || 0)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Orders Today</CardTitle>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders?.today || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{orders?.pending || 0} pending</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg Order Value</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(revenue?.avg_order_value || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900/60 border-border/80">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recent_orders?.length > 0 ? recent_orders.map((order: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-slate-950/50">
                  <div>
                    <p className="text-sm font-medium">Order #{order.id?.substring(0,8) || order.id}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                    <p className="text-sm font-bold">{formatINR(order.total_amount || 0)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground">No recent orders.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-border/80">
          <CardHeader>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inventory Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Products</span>
                <span className="text-sm font-bold">{products?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Out of Stock</span>
                <span className="text-sm font-bold text-destructive">{products?.out_of_stock || 0}</span>
              </div>
              
              {products?.low_stock?.length > 0 && (
                <div className="pt-4 mt-4 border-t border-border/50">
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-3 flex items-center"><AlertTriangle className="w-3 h-3 mr-1 text-brand-yellow" /> Low Stock Items</h4>
                  {products.low_stock.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center mb-2">
                      <span className="text-xs">{item.name}</span>
                      <Badge variant="outline" className="text-[10px] text-brand-yellow border-brand-yellow/30">{item.stock} left</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
