"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Send,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Package,
  Truck,
  CreditCard,
  Layers,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/ui";
import { getOrderStatusConfig } from "../utils/status";
import type { OrderRecord } from "../types";

interface OrderDetailsDialogProps {
  order: OrderRecord | null;
  onClose: () => void;
  onRefresh?: () => void;
}

const formatINR = (cents: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
};

const formatDate = (dateString: string | Date | undefined) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function OrderDetailsDialog({ order: initialOrder, onClose, onRefresh }: OrderDetailsDialogProps) {
  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    targetStatus: string;
    requiresRelease: boolean;
  } | null>(null);

  // Form states for tracking / notes
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courier, setCourier] = useState("BlueDart");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchOrderDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (res.ok) {
        const json = await res.json();
        setDetailData(json.data || json);
        setNotes(json.data?.notes || json.notes || "");
        if (json.data?.shipment || json.shipment) {
          setTrackingNumber(json.data?.shipment?.awb || json.shipment?.awb || "");
          setCourier(json.data?.shipment?.courier || json.shipment?.courier || "BlueDart");
        }
      }
    } catch (e) {
      console.error("Failed to fetch order details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrder?.id) {
      fetchOrderDetail(initialOrder.id);
      setMessage(null);
    } else {
      setDetailData(null);
    }
  }, [initialOrder?.id]);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleExecuteTransition = async (nextStatus: string) => {
    if (!initialOrder?.id) return;
    setTransitioning(true);
    setConfirmModal(null);
    try {
      const res = await fetch(`/api/orders/${initialOrder.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        showMessage(`Successfully transitioned order to '${nextStatus}'`, "success");
        await fetchOrderDetail(initialOrder.id);
        onRefresh?.();
      } else {
        const err = await res.json();
        showMessage(err.error || `Failed to transition to '${nextStatus}'`, "error");
        await fetchOrderDetail(initialOrder.id); // Refresh state on conflict
      }
    } catch (e: any) {
      showMessage(e.message || "Network error", "error");
    } finally {
      setTransitioning(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!initialOrder?.id || !trackingNumber || !courier) {
      showMessage("Please enter both Carrier and Tracking AWB number", "error");
      return;
    }
    setTransitioning(true);
    try {
      const res = await fetch("/api/admin/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_shipment",
          orderId: initialOrder.id,
          courier,
          awb: trackingNumber,
        }),
      });

      if (res.ok) {
        showMessage("Shipment created and order marked as shipped!", "success");
        await fetchOrderDetail(initialOrder.id);
        onRefresh?.();
      } else {
        const err = await res.json();
        showMessage(err.error || "Failed to create shipment", "error");
      }
    } catch (e: any) {
      showMessage(e.message || "Network error", "error");
    } finally {
      setTransitioning(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!initialOrder?.id) return;
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: initialOrder.id,
          notes,
        }),
      });
      if (res.ok) {
        showMessage("Internal notes saved successfully", "success");
        await fetchOrderDetail(initialOrder.id);
      } else {
        showMessage("Failed to save notes", "error");
      }
    } catch (e) {
      showMessage("Error saving notes", "error");
    }
  };

  if (!initialOrder) return null;

  const currentOrder = detailData || initialOrder;
  const statusConfig = getOrderStatusConfig(currentOrder.status);
  const validNextActions: string[] = detailData?.validNextActions || [];
  const actionsRequiringRelease: string[] = detailData?.actionsRequiringRelease || [];

  return (
    <>
      <Dialog open={!!initialOrder} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-slate-950 border-slate-800 max-w-4xl max-h-[92vh] overflow-y-auto text-slate-50 p-6">
          <DialogHeader className="border-b border-slate-800 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold font-mono text-white">
                    Order #{currentOrder.id.slice(0, 8)}
                  </DialogTitle>
                  <StatusBadge label={statusConfig.label} status={statusConfig.type} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Placed on {formatDate(currentOrder.created_at || currentOrder.createdAt)}
                  {currentOrder.metadata?.orderNumber && ` • Ref: ${currentOrder.metadata.orderNumber}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Value</p>
                <p className="text-2xl font-bold font-mono text-brand-yellow">
                  {formatINR(currentOrder.total_cents || currentOrder.totalCents)}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Banner notification */}
          {message && (
            <div
              className={`p-3 text-xs font-semibold rounded-lg flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {/* Section A: Customer Details */}
            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <FileText className="w-3.5 h-3.5 text-brand-yellow" />
                Customer
              </div>
              <p className="font-semibold text-sm text-slate-100">{currentOrder.customer_name || currentOrder.customerName}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{currentOrder.customer_phone || currentOrder.customerPhone}</p>
                {currentOrder.whatsapp_url && (
                  <a href={currentOrder.whatsapp_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                    <Send className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{currentOrder.customer_email || currentOrder.customerEmail || "No email provided"}</p>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                <p className="font-medium text-slate-400 text-[10px] uppercase">Delivery Address</p>
                <p>{currentOrder.address}</p>
                <p className="font-mono text-slate-400">{currentOrder.pincode}</p>
              </div>
            </div>

            {/* Section D & E: Payment & Reservations */}
            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <CreditCard className="w-3.5 h-3.5 text-brand-yellow" />
                Payment & Inventory
              </div>
              
              {/* Payment Details */}
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gateway:</span>
                  <span className="font-semibold uppercase">{detailData?.payments?.[0]?.provider || "Razorpay / Direct"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <Badge variant="outline" className="text-[10px] py-0">
                    {detailData?.payments?.[0]?.status || (currentOrder.status === "paid" ? "Captured" : "Pending")}
                  </Badge>
                </div>
                {detailData?.payments?.[0]?.providerOrderId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider Ref:</span>
                    <span className="font-mono text-[10px] text-slate-300">{detailData.payments[0].providerOrderId.slice(0, 16)}</span>
                  </div>
                )}
              </div>

              {/* Reservation Status */}
              <div className="pt-2 border-t border-slate-800/80 text-xs space-y-1">
                <p className="font-medium text-slate-400 text-[10px] uppercase flex items-center gap-1">
                  <Layers className="w-3 h-3 text-brand-yellow" /> Stock Reservation
                </p>
                {detailData?.reservations && detailData.reservations.length > 0 ? (
                  detailData.reservations.map((r: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-[11px]">
                      <span>{r.quantity} unit(s) reserved</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          r.status === "committed"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : r.status === "released"
                            ? "bg-slate-800 text-slate-400 border-slate-700"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground">Standard catalog reservation</p>
                )}
              </div>
            </div>

            {/* Section F & H: Shipment & Courier */}
            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <Truck className="w-3.5 h-3.5 text-brand-yellow" />
                Fulfillment & Courier
              </div>
              
              {detailData?.shipment ? (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carrier:</span>
                    <span className="font-semibold text-slate-200">{detailData.shipment.courier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AWB Tracking:</span>
                    <span className="font-mono text-brand-yellow font-bold">{detailData.shipment.awb}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipment State:</span>
                    <Badge variant="outline" className="text-[10px] py-0 text-emerald-400 border-emerald-500/30">
                      {detailData.shipment.status}
                    </Badge>
                  </div>
                </div>
              ) : currentOrder.status === "packing" ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-0.5">Courier Partner</label>
                    <select
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="BlueDart">BlueDart</option>
                      <option value="Delhivery">Delhivery</option>
                      <option value="DTDC">DTDC</option>
                      <option value="India Post">India Post</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-0.5">AWB Tracking Number</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. AWB-99887766"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCreateShipment}
                    disabled={transitioning || !trackingNumber}
                    className="w-full bg-brand-yellow text-slate-950 hover:bg-yellow-400 font-semibold h-7 text-xs"
                  >
                    Manifest & Ship Order
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Shipment generation becomes available when order reaches <strong className="text-slate-200">packing</strong> stage.
                </p>
              )}
            </div>
          </div>

          {/* Section B & C: Line Items with Authoritative Price Snapshots */}
          <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-brand-yellow" />
              Order Items & Authoritative Price Snapshots
            </h4>
            <div className="divide-y divide-slate-800/80 border border-slate-800/80 rounded-lg overflow-hidden">
              {(detailData?.items || currentOrder.order_items || []).map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-slate-200">
                      {item.productNameSnapshot || item.name}
                      {item.variantNameSnapshot && <span className="text-muted-foreground font-normal"> ({item.variantNameSnapshot})</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Quantity: {item.quantity} × Snapshot Unit Price: {formatINR(item.unitPriceCents || item.price_cents || item.priceCents)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-100">
                      {formatINR(item.lineTotalCents || (item.price_cents || item.priceCents || 0) * (item.quantity || 1))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section I: Operational Audit Timeline */}
          {detailData?.timeline && detailData.timeline.length > 0 && (
            <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-brand-yellow" />
                Chronological Operational Audit Trail
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {detailData.timeline.map((event: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <div className="mt-1 w-2 h-2 rounded-full bg-brand-yellow flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{event.title}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{formatDate(event.timestamp)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section H: Authoritative Action Center (Only Valid Transitions from Domain) */}
          <div className="rounded-xl bg-slate-900 p-4 border border-brand-yellow/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 uppercase flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-yellow" />
                Domain Authorized Operational Actions
              </h4>
              <span className="text-[10px] text-muted-foreground">
                Current Status: <strong className="text-brand-yellow">{currentOrder.status}</strong>
              </span>
            </div>

            {validNextActions.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {validNextActions.map((nextStatus) => {
                  const isDestructive = nextStatus === "cancelled" || nextStatus === "qc_failed" || nextStatus === "refunded";
                  const requiresRelease = actionsRequiringRelease.includes(nextStatus);

                  return (
                    <Button
                      key={nextStatus}
                      size="sm"
                      variant={isDestructive ? "destructive" : "outline"}
                      disabled={transitioning}
                      onClick={() => {
                        if (isDestructive || requiresRelease) {
                          setConfirmModal({ targetStatus: nextStatus, requiresRelease });
                        } else {
                          handleExecuteTransition(nextStatus);
                        }
                      }}
                      className={`text-xs font-semibold ${
                        !isDestructive ? "border-slate-700 bg-slate-950 hover:bg-slate-800 hover:text-white" : ""
                      }`}
                    >
                      {nextStatus === "production" && "Start Production"}
                      {nextStatus === "printing" && "Move to Printing"}
                      {nextStatus === "qc" && "Send to Quality Check"}
                      {nextStatus === "qc_failed" && "Record QC Failure / Rework"}
                      {nextStatus === "packing" && "Approve & Move to Packing"}
                      {nextStatus === "shipped" && "Dispatch & Ship"}
                      {nextStatus === "delivered" && "Confirm Final Delivery"}
                      {nextStatus === "paid" && "Confirm Payment"}
                      {nextStatus === "cancelled" && "Cancel Order (Release Stock)"}
                      {nextStatus === "refunded" && "Record Refund"}
                      {!["production", "printing", "qc", "qc_failed", "packing", "shipped", "delivered", "paid", "cancelled", "refunded"].includes(nextStatus) &&
                        `Transition to ${nextStatus}`}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                This order is in a terminal state ({currentOrder.status}). No further status transitions are permitted.
              </p>
            )}
          </div>

          {/* Internal Notes */}
          <div className="rounded-xl bg-slate-900/80 p-4 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase">Internal Merchant Notes</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-white h-16 resize-none"
              placeholder="Internal operator comments, customer requests, or packaging notes..."
            />
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={handleSaveNotes} className="h-7 text-xs">
                Save Notes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Section 4: Confirmation Dialog for Destructive Actions */}
      {confirmModal && (
        <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
          <DialogContent className="bg-slate-950 border-red-500/40 text-slate-50 max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Confirm Destructive Action
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs py-2">
              <p className="text-slate-300">
                Are you sure you want to transition this order from <strong className="text-brand-yellow font-mono">{currentOrder.status}</strong> to{" "}
                <strong className="text-red-400 font-mono">{confirmModal.targetStatus}</strong>?
              </p>
              <div className="rounded-lg bg-red-950/30 border border-red-900/50 p-3 text-red-200 text-[11px] space-y-1">
                <p className="font-semibold">This action will:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  <li>Update canonical order state to <strong>{confirmModal.targetStatus}</strong></li>
                  {confirmModal.requiresRelease && (
                    <li className="text-amber-300 font-semibold">
                      Automatically release reserved stock back into available catalog inventory
                    </li>
                  )}
                  <li>Record an immutable timestamped event in the audit trail</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setConfirmModal(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleExecuteTransition(confirmModal.targetStatus)}
                disabled={transitioning}
              >
                {transitioning ? "Executing..." : "Confirm Transition"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
