import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Send } from "lucide-react";
import { StatusBadge } from "@/components/admin/ui";
import { getOrderStatusConfig } from "../utils/status";
import type { OrderRecord } from "../types";

interface OrderDetailsDialogProps {
  order: OrderRecord | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => Promise<{ success: boolean; message?: string }>;
  onUpdateTracking: (id: string, tracking: string, courier: string) => Promise<{ success: boolean; message?: string }>;
  onUpdateNotes: (id: string, notes: string) => Promise<{ success: boolean; message?: string }>;
}

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

export function OrderDetailsDialog({
  order,
  onClose,
  onUpdateStatus,
  onUpdateTracking,
  onUpdateNotes
}: OrderDetailsDialogProps) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courier, setCourier] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (order) {
      setTrackingNumber(order.metadata?.tracking_number || "");
      setCourier(order.metadata?.courier || "");
      setNotes(order.notes || "");
      setMessage(null);
    }
  }, [order]);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleUpdateTracking = async () => {
    if (!order) return;
    const res = await onUpdateTracking(order.id, trackingNumber, courier);
    if (res.success) showMessage("Tracking info saved", "success");
    else showMessage(res.message || "Failed to save tracking", "error");
  };

  const handleUpdateNotes = async () => {
    if (!order) return;
    const res = await onUpdateNotes(order.id, notes);
    if (res.success) showMessage("Notes saved", "success");
    else showMessage(res.message || "Failed to save notes", "error");
  };

  const handleUpdateStatus = async (status: string) => {
    if (!order) return;
    const res = await onUpdateStatus(order.id, status);
    if (res.success) showMessage(`Status updated to ${status}`, "success");
    else showMessage(res.message || "Failed to update status", "error");
  };

  if (!order) return null;

  const statusConfig = getOrderStatusConfig(order.status);

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-border max-w-2xl max-h-[90vh] overflow-y-auto text-slate-50">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order #{order.id.slice(0, 8)}</span>
            <StatusBadge label={statusConfig.label} status={statusConfig.type} />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-xs mt-2 relative pb-8">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-950 p-3 space-y-1 border border-border/50">
              <h4 className="font-semibold text-slate-400 mb-2 uppercase text-[10px]">Customer Details</h4>
              <p className="font-semibold text-slate-200">{order.customer_name}</p>
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground">{order.customer_phone}</p>
                {order.whatsapp_url && (
                  <a href={order.whatsapp_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                    <Send className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-muted-foreground">{order.customer_email || "No email"}</p>
              <p className="text-slate-300 mt-2 pt-2 border-t border-slate-800">{order.address} {order.pincode ? "(" + order.pincode + ")" : ""}</p>
            </div>

            <div className="rounded-lg bg-slate-950 p-3 space-y-2 border border-border/50">
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
               <Button size="sm" variant="secondary" onClick={handleUpdateTracking} className="w-full mt-2 h-7 text-[10px]">
                 Save Tracking
               </Button>
            </div>
          </div>

          {order.metadata?.artwork_url || (order.order_items && order.order_items.some(i => i.metadata?.artwork_url)) ? (
            <div className="rounded-lg bg-slate-950 p-3 border border-border/50">
              <h4 className="font-semibold text-slate-400 mb-2 uppercase text-[10px]">Artwork Files</h4>
              <div className="flex flex-col gap-2">
                {order.metadata?.artwork_url && (
                  <a href={order.metadata.artwork_url} target="_blank" rel="noopener noreferrer" className="text-brand-yellow hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Order Artwork
                  </a>
                )}
                {order.order_items?.map((item, idx) => item.metadata?.artwork_url ? (
                  <a key={idx} href={item.metadata.artwork_url} target="_blank" rel="noopener noreferrer" className="text-brand-yellow hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {item.name} Artwork
                  </a>
                ) : null)}
              </div>
            </div>
          ) : null}

          {order.order_items && order.order_items.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-400 mb-2 uppercase text-[10px]">Order Line Items</h4>
              <div className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden">
                {order.order_items.map((item, idx) => (
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
            <span className="font-bold text-base text-brand-yellow">{formatINR(order.total_cents)}</span>
          </div>

          <div className="rounded-lg bg-slate-950 p-3 border border-border/50">
            <h4 className="font-semibold text-slate-400 mb-2 uppercase text-[10px]">Order Notes</h4>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white h-20 resize-none"
              placeholder="Internal notes about this order..."
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" variant="secondary" onClick={handleUpdateNotes} className="h-7 text-[10px]">
                Save Notes
              </Button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-400 block mb-1 uppercase text-[10px]">Update Order Status</label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("confirmed")}>Confirm</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("paid")}>Mark Paid</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("artwork_review")}>Send to Artwork Review</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("approved")} className="text-emerald-400 border-emerald-500/30">Approve Artwork</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("rejected")} className="text-red-400 border-red-500/30">Reject Artwork</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("production")}>Start Production</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("quality_check")}>Send to QC</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("packing")}>Send to Packing</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("dispatched")}>Dispatched</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("shipped")}>Ship Order</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("delivered")} className="text-emerald-400 border-emerald-500/30">Deliver</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("returned")} className="text-rose-400 border-rose-500/30">Returned</Button>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus("refunded")} className="text-slate-400 border-slate-500/30">Refunded</Button>
              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleUpdateStatus("cancelled")}>Cancel Order</Button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
             <p className="text-[10px] text-muted-foreground text-center">Last status update recorded at {formatDate(order.created_at)}</p>
          </div>

          {message && (
            <div className={`absolute bottom-0 left-0 right-0 p-2 text-center text-xs font-semibold rounded-b-lg ${
              message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
