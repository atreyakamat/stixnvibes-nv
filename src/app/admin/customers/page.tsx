"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, User, ShoppingBag } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("total_spent");

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch(`/api/admin/customers?search=${search}&sort=${sort}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setCustomers(json.data || json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, sort]);

  const formatINR = (cents: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format((cents || 0) / 100);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Customers</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage and view customer data.</p>
        </div>
        <Badge variant="outline" className="text-xs bg-slate-900/60 px-3 py-1">
          <User className="w-3 h-3 mr-2" />
          {customers.length} Total Customers
        </Badge>
      </div>

      <Card className="bg-slate-900/60 border-border/80">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search customers..." 
              className="pl-9 bg-slate-950/50 border-border/50 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-auto md:ml-4">Sort By</span>
            <select 
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="total_spent">Total Spent</option>
              <option value="total_orders">Total Orders</option>
              <option value="last_order_at">Last Order (Recency)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-slate-950/30">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Orders</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Spent</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">First Order</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">No customers found.</td></tr>
              ) : (
                customers.map((c, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-sm">{c.name || "Anonymous"}</div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      <div>{c.email}</div>
                      <div>{c.phone}</div>
                    </td>
                    <td className="p-4 text-sm">
                      <Badge variant="outline" className="text-[10px]"><ShoppingBag className="w-3 h-3 mr-1"/>{c.total_orders || 0}</Badge>
                    </td>
                    <td className="p-4 font-bold text-sm text-brand-yellow">
                      {formatINR(c.total_spent)}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">{formatDate(c.first_order_at)}</td>
                    <td className="p-4 text-xs text-muted-foreground">{formatDate(c.last_order_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
