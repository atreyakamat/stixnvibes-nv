"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Package, Clock, CheckCircle2, Truck, ExternalLink, ArrowLeft } from "lucide-react";

type TrackedOrder = {
  id: string;
  created_at: string;
  customer_name: string;
  status: string;
  total_cents: number;
  awb_number?: string | null;
  courier?: string | null;
  items?: Array<{ name: string; quantity: number }>;
};

const STAGE_PROGRESS = [
  { key: "pending", label: "Order Placed" },
  { key: "paid", label: "Payment Confirmed" },
  { key: "print_queue", label: "Print Queue" },
  { key: "printing", label: "Printing & Laminating" },
  { key: "quality_check", label: "QC Inspection" },
  { key: "packing", label: "Packing Station" },
  { key: "shipped", label: "Shipped & Dispatched" },
  { key: "delivered", label: "Out for Delivery" },
];

export default function TrackOrderPage() {
  return (
    <React.Suspense fallback={null}>
      <TrackOrderClient />
    </React.Suspense>
  );
}

function TrackOrderClient() {
  const sp = useSearchParams();
  const initialQuery = sp.get("id") || sp.get("awb") || "";
  const [searchId, setSearchId] = React.useState(initialQuery);
  const [loading, setLoading] = React.useState(false);
  const [trackedOrder, setTrackedOrder] = React.useState<TrackedOrder | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    if (initialQuery) {
      void handleSearch(initialQuery);
    }
  }, [initialQuery]);

  async function handleSearch(query: string) {
    if (!query.trim()) return;
    setLoading(true);
    setNotFound(false);
    setTrackedOrder(null);

    try {
      const res = await fetch(`/api/admin/orders`);
      const json = await res.json();
      if (res.ok && json.ok && Array.isArray(json.data)) {
        const found = json.data.find(
          (o: TrackedOrder) =>
            o.id.toLowerCase() === query.trim().toLowerCase() ||
            o.id.toLowerCase().includes(query.trim().toLowerCase()) ||
            (o.awb_number && o.awb_number.toLowerCase() === query.trim().toLowerCase())
        );
        if (found) {
          setTrackedOrder(found);
        } else {
          setNotFound(true);
        }
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  function getStageIndex(status: string) {
    const idx = STAGE_PROGRESS.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 1;
  }

  return (
    <div className="bg-slate-950 text-white min-h-screen pt-28 pb-16">
      <Container className="max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-brand-yellow">
            <ArrowLeft className="size-4 mr-1" /> Back to Storefront
          </Link>
          <Badge variant="outline" className="text-xs border-brand-yellow/30 text-brand-yellow">
            Live Production Tracker
          </Badge>
        </div>

        <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Track Your Order Status</h1>
          <p className="text-slate-400 text-sm">
            Enter your Order ID or AWB Tracking Number to check real-time print, packing, and dispatch progress.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSearch(searchId);
            }}
            className="flex gap-2 pt-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 size-4 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. ORD-98421 or AWB number..."
                className="w-full h-11 rounded-xl border border-slate-800 bg-slate-900 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-yellow"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
            </div>
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? "Searching..." : "Track"}
            </Button>
          </form>
        </div>

        {notFound && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center space-y-2">
            <p className="font-bold text-red-400">Order Not Found</p>
            <p className="text-xs text-slate-400">
              No order matches "{searchId}". Please check your order confirmation email or WhatsApp message.
            </p>
          </div>
        )}

        {trackedOrder && (
          <Card className="bg-slate-900/80 border-slate-800 rounded-3xl p-6 space-y-6">
            <CardHeader className="p-0 border-b border-slate-800 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl font-bold font-display text-white">
                    Order #{trackedOrder.id.slice(0, 8).toUpperCase()}
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-1">
                    Customer: {trackedOrder.customer_name} · Date: {new Date(trackedOrder.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="success" className="capitalize text-sm px-3 py-1">
                  Stage: {trackedOrder.status.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 space-y-6">
              {/* Production Progress Bar Timeline */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Production Progress Timeline</p>
                <div className="space-y-3">
                  {STAGE_PROGRESS.map((stage, idx) => {
                    const currentIdx = getStageIndex(trackedOrder.status);
                    const isCompleted = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div key={stage.key} className="flex items-center gap-4 text-xs">
                        <div
                          className={`grid size-7 shrink-0 place-items-center rounded-full font-bold transition-all ${
                            isCurrent
                              ? "bg-brand-yellow text-slate-950 shadow-glow ring-2 ring-brand-yellow/50"
                              : isCompleted
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-800 text-slate-500 border border-slate-700"
                          }`}
                        >
                          {isCompleted ? "✓" : idx + 1}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className={`font-semibold ${isCurrent ? "text-brand-yellow font-bold text-sm" : isCompleted ? "text-white" : "text-slate-500"}`}>
                            {stage.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow px-2 py-0.5 rounded-full font-mono">
                              Active Stage
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Courier Tracking Info */}
              {trackedOrder.awb_number && (
                <div className="rounded-2xl border border-brand-yellow/30 bg-brand-yellow/5 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Courier Partner AWB Number</p>
                    <p className="font-mono font-bold text-brand-yellow text-base">{trackedOrder.awb_number}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="border-brand-yellow/40 text-brand-yellow">
                    <a href={`https://track.stixnvibes.com/?awb=${trackedOrder.awb_number}`} target="_blank" rel="noreferrer">
                      Official Courier Tracking ↗
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </Container>
    </div>
  );
}
