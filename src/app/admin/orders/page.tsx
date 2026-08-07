"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, Eye, ExternalLink, Send, CheckCircle2, XCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";

interface OrderRecord {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  address?: string;
  pincode?: string;
  total_cents: number;
  status: string;
  notes?: string | null;
  whatsapp_url?: string | null;
  created_at: string;
  order_items?: Array<{ name: string; quantity: number; price_cents: number; metadata?: any }>;
  metadata?: any;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courier, setCourier] = useState("");
  const [notes, setNotes] = useState("");

  const showToast = (text: string, type: "success" | "error") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchOrders = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const url = statusFilter !== "all" ? `/api/admin/orders?status=${statusFilter}` : "/api/admin/orders";
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok) setOrders(json.data || []);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch(`/api/admin/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        showToast(`Status updated to ${newStatus}`, "success");
      } else {
        showToast("Failed to update status", "error");
      }
    } catch {
      showToast("Error updating status", "error");
    }
  };

  const updateTracking = async () => {
    if (!selectedOrder) return;
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch(`/api/admin/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: selectedOrder.id, tracking_number: trackingNumber, courier }),
      });
      if (res.ok) {
        showToast("Tracking info saved", "success");
        const metadata = selectedOrder.metadata || {};
        metadata.tracking_number = trackingNumber;
        metadata.courier = courier;
        setSelectedOrder({ ...selectedOrder, metadata });
      } else {
        showToast("Failed to save tracking info", "error");
      }
    } catch {
      showToast("Error saving tracking info", "error");
    }
  };

  const updateNotes = async () => {
    if (!selectedOrder) return;
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch(`/api/admin/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: selectedOrder.id, notes }),
      });
      if (res.ok) {
        showToast("Notes saved", "success");
        setSelectedOrder({ ...selectedOrder, notes });
      } else {
        showToast("Failed to save notes", "error");
      }
    } catch {
      showToast("Error saving notes", "error");
    }
  };

  const openOrder = (order: OrderRecord) => {
    setSelectedOrder(order);
    setTrackingNumber(order.metadata?.tracking_number || "");
    setCourier(order.metadata?.courier || "");
    setNotes(order.notes || "");
  };

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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "created": return <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/20 text-[10px]">Created</Badge>;
      case "sent": return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px]">Sent</Badge>;
      case "confirmed": return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-[10px]">Confirmed</Badge>;
      case "paid": return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">Paid</Badge>;
      case "artwork_review": return <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/20 text-[10px]">Artwork Review</Badge>;
      case "approved": return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">Approved</Badge>;
      case "rejected": return <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px]">Rejected</Badge>;
      case "production": return <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/20 text-[10px]">Production</Badge>;
      case "print_queue": return <Badge className="bg-orange-600/15 text-orange-500 border-orange-600/20 text-[10px]">Print Queue</Badge>;
      case "printing": return <Badge className="bg-orange-400/15 text-orange-300 border-orange-400/20 text-[10px]">Printing</Badge>;
      case "quality_check": return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20 text-[10px]">Quality Check</Badge>;
      case "packing": return <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/20 text-[10px]">Packing</Badge>;
      case "ready_for_dispatch": return <Badge className="bg-blue-400/15 text-blue-300 border-blue-400/20 text-[10px]">Ready to Dispatch</Badge>;
      case "dispatched": return <Badge className="bg-blue-600/15 text-blue-500 border-blue-600/20 text-[10px]">Dispatched</Badge>;
      case "shipped": return <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/20 text-[10px]">Shipped</Badge>;
      case "delivered": return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Delivered</Badge>;
      case "cancelled": return <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px]">Cancelled</Badge>;
      case "returned": return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/20 text-[10px]">Returned</Badge>;
      case "refunded": return <Badge className="bg-slate-400/15 text-slate-300 border-slate-400/20 text-[10px]">Refunded</Badge>;
      default: return <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>;
    }
  };

  const columns: Column<OrderRecord>[] = [
    {
      header: "Order ID",
      cell: (row) => (
        <div>
          <span className="font-mono text-slate-100 font-bold">#{row.id.slice(0, 8)}</span>
          <p className="text-[10px] text-muted-foreground">{formatDate(row.created_at)}</p>
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-100">{row.customer_name || "Guest"}</p>
          <p className="text-[10px] text-muted-foreground">{row.customer_phone || "No phone"}</p>
        </div>
      ),
    },
    {
      header: "Total",
      cell: (row) => <span className="font-bold text-brand-yellow">{formatINR(row.total_cents)}</span>,
    },
    {
      header: "Status",
      cell: (row) => getStatusBadge(row.status),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openOrder(row)} className="h-8 w-8 p-0">
            <Eye className="w-4 h-4 text-slate-400 hover:text-white" />
          </Button>
          {row.whatsapp_url && (
            <a href={row.whatsapp_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300">
                <Send className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Orders Manager</h1>
          <p className="text-xs text-muted-foreground mt-1">Review, approve, and transition customer orders.</p>
        </div>
        <Badge variant="outline" className="text-xs bg-slate-900/60 px-3 py-1">
          <ShoppingBag className="w-3 h-3 mr-2" />
          {orders.length} Total Orders
        </Badge>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        searchPlaceholder="Search orders by customer, phone or ID..."
        pageSize={15}
        emptyText={loading ? "Loading orders..." : "No orders found."}
        actions={
          <select
            className="h-9 rounded-md border border-input bg-slate-950 px-3 py-1 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="created">Created</option>
            <option value="sent">Sent</option>
            <option value="confirmed">Confirmed</option>
            <option value="paid">Paid</option>
            <option value="artwork_review">Artwork Review</option>
            <option value="production">Production</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        }
      />

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="bg-slate-900 border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Order #{selectedOrder.id.slice(0, 8)}</span>
                {getStatusBadge(selectedOrder.status)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-xs mt-2 relative pb-8">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-950 p-3 space-y-1">
                  <h4 className="font-semibold text-slate-400 mb-2 uppercase text-[10px]">Customer Details</h4>
                  <p className="font-semibold text-slate-200">{selectedOrder.customer_name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">{selectedOrder.customer_phone}</p>
                    {selectedOrder.whatsapp_url && (
                      <a href={selectedOrder.whatsapp_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                        <Send className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-muted-foreground">{selectedOrder.customer_email || "No email"}</p>
                  <p className="text-slate-300 mt-2 pt-2 border-t border-slate-800">{selectedOrder.address} {selectedOrder.pincode ? "(" + selectedOrder.pincode + ")" : ""}</p>
                </div>

                <div className="rounded-lg bg-slate-950 p-3 space-y-2">
                   <h4 className="font-semibold text-slate-400 mb-2 uppercase text-[10px]">Shipping & Tracking</h4>
                   <div>
                     <label className="block text-[10px] text-muted-foreground mb-1">Courier</label>
                     <input 
                        type="text" 
                        value={courier} 
                        onChange={(e) => setCourier(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                        placeholder="e.g. BlueDart"
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] text-muted-foreground mb-1">Tracking Number</label>
                     <input 
                        type="text" 
                        value={trackingNumber} 
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                        placeholder="AWB / Tracking #"
                     />
                   </div>
                   <Button size="sm" variant="secondary" onClick={updateTracking} className="w-full mt-2 h-7 text-[10px]">
                     Save Tracking
                   </Button>
                </div>
              </div>

              {selectedOrder.metadata?.artwork_url || (selectedOrder.order_items && selectedOrder.order_items.some(i => i.metadata?.artwork_url)) ? (
                <div className="rounded-lg bg-slate-950 p-3">
                  <h4 className="font-semibold text-slate-400 mb-2 uppercase text-[10px]">Artwork Files</h4>
                  <div className="flex flex-col gap-2">
                    {selectedOrder.metadata?.artwork_url && (
                      <a href={selectedOrder.metadata.artwork_url} target="_blank" rel="noopener noreferrer" className="text-brand-yellow hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Order Artwork
                      </a>
                    )}
                    {selectedOrder.order_items?.map((item, idx) => item.metadata?.artwork_url ? (
                      <a key={idx} href={item.metadata.artwork_url} target="_blank" rel="noopener noreferrer" className="text-brand-yellow hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> {item.name} Artwork
                      </a>
                    ) : null)}
                  </div>
                </div>
              ) : null}

              {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-400 mb-2 uppercase text-[10px]">Order Line Items</h4>
                  <div className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden">
                    {selectedOrder.order_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between p-2.5 bg-slate-950/40">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="font-mono text-slate-300">{formatINR(item.price_cents * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <span className="font-semibold text-slate-400">Total Amount</span>
                <span className="font-bold text-base text-brand-yellow">{formatINR(selectedOrder.total_cents)}</span>
              </div>

              <div className="rounded-lg bg-slate-950 p-3">
                <h4 className="font-semibold text-slate-400 mb-2 uppercase text-[10px]">Order Notes</h4>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white h-20 resize-none"
                  placeholder="Internal notes about this order..."
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" variant="secondary" onClick={updateNotes} className="h-7 text-[10px]">
                    Save Notes
                  </Button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-400 block mb-1 uppercase text-[10px]">Update Order Status</label>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "confirmed")}>Confirm</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "paid")}>Mark Paid</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "artwork_review")}>Send to Artwork Review</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "approved")} className="text-emerald-400 border-emerald-500/30">Approve Artwork</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "rejected")} className="text-red-400 border-red-500/30">Reject Artwork</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "production")}>Start Production</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "quality_check")}>Send to QC</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "packing")}>Send to Packing</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "dispatched")}>Dispatched</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "shipped")}>Ship Order</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "delivered")} className="text-emerald-400 border-emerald-500/30">Deliver</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "returned")} className="text-rose-400 border-rose-500/30">Returned</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, "refunded")} className="text-slate-400 border-slate-500/30">Refunded</Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => updateStatus(selectedOrder.id, "cancelled")}>Cancel Order</Button>
                </div>
              </div>

              {/* Status History Placeholder - DB schema doesn't have an explicit history table, so we show last updated */}
              <div className="pt-2 border-t border-slate-800">
                 <p className="text-[10px] text-muted-foreground text-center">Last status update recorded at {formatDate(selectedOrder.created_at)}</p>
              </div>

              {toastMessage && (
                <div className={"absolute bottom-0 left-0 right-0 p-2 text-center text-xs font-semibold rounded-b-lg " + (toastMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                  {toastMessage.text}
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

