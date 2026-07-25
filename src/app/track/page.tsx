"use client";

import * as React from "react";
import Link from "next/link";
import { Search, PackageCheck, Truck, CheckCircle2, MapPin, Clock, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";

const SAMPLE_TRACKING_RESULT = {
  orderId: "ORD-SNV-98421",
  customerName: "Alex Rivera",
  placedDate: "July 24, 2026",
  estimatedDelivery: "July 26, 2026 (Tomorrow by 7 PM)",
  courier: "Delhivery Surface Express",
  awb: "DLV9842104IN",
  currentStatus: "In Transit",
  destination: "Bengaluru, Karnataka (560038)",
  steps: [
    { title: "Order Confirmed & Placed", date: "Jul 24, 10:30 AM", status: "completed", desc: "Payment verified via Razorpay UPI" },
    { title: "300 DPI Print Inspection Pass", date: "Jul 24, 02:15 PM", status: "completed", desc: "Vinyl die-cut precision verified by print engineer" },
    { title: "Packed in Eco-Solvent Kraft Mailer", date: "Jul 24, 05:40 PM", status: "completed", desc: "Hand-checked and sealed with water-resistant coating" },
    { title: "Handed over to Courier Hub", date: "Jul 25, 08:30 AM", status: "in-progress", desc: "In transit from Bengaluru Sorting Facility" },
    { title: "Out for Local Delivery", date: "Pending", status: "upcoming", desc: "Assigned to local delivery partner" },
  ],
};

export default function TrackOrderPage() {
  const [searchQuery, setSearchQuery] = React.useState("ORD-SNV-98421");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(SAMPLE_TRACKING_RESULT);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/track?query=${encodeURIComponent(searchQuery.trim())}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setResult({
          ...SAMPLE_TRACKING_RESULT,
          ...json.data,
        });
      }
    } catch {
      // Fallback to current view
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 text-white min-h-screen pt-28 pb-16">
      <Container>
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <Badge variant="brand" className="px-4 py-1 text-sm font-semibold uppercase tracking-widest">
              Live Logistics Engine
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Track Your <span className="bg-gradient-to-r from-brand-yellow via-brand-red to-brand-purple bg-clip-text text-transparent">Order</span>
            </h1>
            <p className="text-slate-400 text-lg">
              Enter your Order Number or Mobile Number to check real-time print status and shipment journey.
            </p>
          </div>
        </Reveal>

        {/* Search Card */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="bg-slate-900/60 border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. ORD-SNV-98421 or +91 9876543210"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-500 outline-none focus:border-brand-yellow text-sm"
                />
              </div>
              <Button type="submit" variant="gradient" size="lg" disabled={loading} className="rounded-2xl px-6">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Track Order <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          </Card>
        </div>

        {/* Active Tracking Result */}
        <div className="max-w-3xl mx-auto space-y-8">
          <Card className="bg-slate-900/60 border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl">
            <CardHeader className="bg-slate-950/80 border-b border-slate-800 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="font-display text-2xl font-bold">{result.orderId}</CardTitle>
                    <Badge className="bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20 border">
                      {result.currentStatus}
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-400 text-sm mt-1">
                    Courier: {result.courier} · AWB: <span className="font-mono text-white">{result.awb}</span>
                  </CardDescription>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Estimated Delivery</p>
                  <p className="font-display font-bold text-sm text-emerald-400 mt-0.5">{result.estimatedDelivery}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 sm:p-8">
              <h3 className="font-display font-bold text-lg text-white mb-6">Shipment Timeline</h3>

              <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                {result.steps.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 pl-8">
                    <div
                      className={`absolute left-0 top-0.5 w-7 h-7 rounded-full flex items-center justify-center border text-xs font-bold ${
                        step.status === "completed"
                          ? "bg-emerald-500 border-emerald-400 text-slate-950"
                          : step.status === "in-progress"
                          ? "bg-brand-yellow border-brand-yellow text-slate-950 animate-pulse"
                          : "bg-slate-900 border-slate-800 text-slate-500"
                      }`}
                    >
                      {step.status === "completed" ? "✓" : idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-semibold text-sm ${step.status === "upcoming" ? "text-slate-500" : "text-white"}`}>
                          {step.title}
                        </h4>
                        <span className="text-xs text-slate-500 font-mono">{step.date}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Need Assistance Card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-white text-lg">Need instant order support?</h3>
              <p className="text-slate-400 text-sm">Our Bengaluru support team is available on WhatsApp Mon–Sat 10 AM – 7 PM IST.</p>
            </div>
            <Button variant="outline" asChild className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer">
                WhatsApp Support
              </a>
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
