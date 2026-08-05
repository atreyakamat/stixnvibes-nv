"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, ChevronRight } from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch(`/api/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data || json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch(`/api/admin/orders`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatINR = (cents: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format((cents || 0) / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "created": return <Badge className="bg-gray-500/15 text-gray-400 border-gray-500/20 text-[10px]">Created</Badge>;
      case "sent": return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20 text-[10px]">Sent</Badge>;
      case "confirmed": return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-[10px]">Confirmed</Badge>;
      case "paid": return <Badge variant="success" className="text-[10px]">Paid</Badge>;
      case "fulfilled": return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">Fulfilled</Badge>;
      case "cancelled": return <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px]">Cancelled</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id?.includes(search) || o.customer?.name?.toLowerCase().includes(search.toLowerCase()) || o.customer?.phone?.includes(search);
    const matchesStatus = statusFilter === "all" || o.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Orders</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage and update customer orders.</p>
        </div>
      </div>

      <Card className="bg-slate-900/60 border-border/80">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID, name, phone..." 
              className="pl-9 bg-slate-950/50 border-border/50 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full md:w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="created">Created</option>
            <option value="sent">Sent</option>
            <option value="confirmed">Confirmed</option>
            <option value="paid">Paid</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-slate-950/30">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Order ID</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">Loading...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">No orders found.</td></tr>
              ) : (
                filteredOrders.map((o, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-xs">{o.id?.substring(0, 8) || "N/A"}</td>
                    <td className="p-4">
                      <div className="font-medium text-sm">{o.customer?.name || "Unknown"}</div>
                      <div className="text-[10px] text-muted-foreground">{o.customer?.phone}</div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-sm text-brand-yellow">{formatINR(o.total_amount)}</td>
                    <td className="p-4">{getStatusBadge(o.status)}</td>
                    <td className="p-4 text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(o)} className="h-8 px-3 text-xs">
                            View <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Order Details</DialogTitle>
                          </DialogHeader>
                          {selectedOrder && (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center border-b border-border/50 pb-4">
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Order ID</p>
                                  <p className="font-mono text-sm">{selectedOrder.id}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                                  {getStatusBadge(selectedOrder.status)}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Update Status</p>
                                <div className="flex flex-wrap gap-2">
                                  {["created", "sent", "confirmed", "paid", "fulfilled", "cancelled"].map(s => (
                                    <Button 
                                      key={s} 
                                      variant={selectedOrder.status === s ? "default" : "outline"} 
                                      size="sm" 
                                      className="text-[10px] h-7 px-3 capitalize"
                                      onClick={() => updateStatus(selectedOrder.id, s)}
                                    >
                                      {s}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </td>
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
