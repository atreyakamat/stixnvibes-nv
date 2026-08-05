"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Loader2,
  Search,
  Check,
  Clock,
  Play,
  Printer,
  ShieldCheck,
  QrCode,
  Truck,
  Activity,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";

// Types
type OrderRow = {
  id: string;
  order_number?: string;
  whatsapp_status?: string;
  created_at: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  address?: string;
  total_cents: number;
  status: string;
  priority?: string;
  assigned_to?: string | null;
  notes?: string | null;
  awb_number?: string | null;
  courier?: string | null;
  whatsapp_url?: string | null;
  items?: Array<{ name: string; quantity: number; finish?: string; sku?: string }>;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  compare_at_cents?: number | null;
  stock: number;
  is_featured: boolean;
  customizable: boolean;
  collection: string | null;
  type: string;
  image_url?: string | null;
  images?: string[];
  tags?: string[];
  description?: string | null;
  status?: "active" | "draft" | "archived" | "scheduled";
  updated_at?: string;
  metadata?: {
    cost_cents?: number;
    sku?: string | null;
    barcode?: string | null;
    min_stock?: number;
    max_stock?: number;
    warehouse_location?: string | null;
    supplier?: string | null;
    reserved_stock?: number;
  };
};

type InventoryLog = {
  id: string;
  productId: string;
  productName: string;
  change: number;
  reason: string;
  previousStock: number;
  newStock: number;
  notes?: string | null;
  timestamp: string;
};

type PrintBatch = {
  id: string;
  batchNumber: string;
  material: string;
  finish: string;
  size: string;
  orderCount: number;
  status: "queued" | "printing" | "completed" | "paused";
  estTimeMins: number;
  operator: string;
  created_at: string;
};

type QCInspection = {
  id: string;
  orderId: string;
  operator: string;
  result: "pass" | "reprint" | "reject";
  checklist: Record<string, boolean>;
  timestamp: string;
};

const ORDER_LIFECYCLE_STAGES = [
  { key: "sent", label: "🟡 Awaiting WhatsApp Confirmation" },
  { key: "confirmed", label: "🟢 Confirmed" },
  { key: "paid", label: "Paid" },
  { key: "print_queue", label: "🔵 Print Queue" },
  { key: "printing", label: "Printing" },
  { key: "quality_check", label: "🟣 Quality Check" },
  { key: "packing", label: "🟤 Packing Station" },
  { key: "ready_for_dispatch", label: "Ready for Dispatch" },
  { key: "shipped", label: "🚚 Shipped" },
  { key: "delivered", label: "✅ Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const OPERATORS = ["Unassigned", "Operator John (Print)", "Operator Sarah (Packing)", "QC Inspector Mike", "Dispatch Supervisor Raj"];

function fmt(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  const activeModule = searchParams.get("module") || "ops_kanban";

  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [inventoryLogs, setInventoryLogs] = React.useState<InventoryLog[]>([]);
  const [printBatches, setPrintBatches] = React.useState<PrintBatch[]>([]);
  const [qcLogs, setQcLogs] = React.useState<QCInspection[]>([]);
  const [fetching, setFetching] = React.useState(false);

  // Filters & Order Selection State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);

  // Print Queue Batching Modal Form State
  const [batchMaterial, setBatchMaterial] = React.useState("Vinyl");
  const [batchFinish, setBatchFinish] = React.useState("Glossy Finish");
  const [batchSize, setBatchSize] = React.useState('3" x 3"');

  // QC Checklist Interactive State
  const [qcSelectedOrderId, setQcSelectedOrderId] = React.useState<string>("");
  const [qcChecklist, setQcChecklist] = React.useState<Record<string, boolean>>({
    artwork: true,
    dimensions: true,
    finish: true,
    printQuality: true,
    lamination: true,
    colorAccuracy: true,
    quantityCount: true,
  });

  // Packing Station Scanner State
  const [packingScanOrderInput, setPackingScanOrderInput] = React.useState("");
  const [packingScannedSKUs, setPackingScannedSKUs] = React.useState<string[]>([]);
  const [packingVerifiedOrder, setPackingVerifiedOrder] = React.useState<OrderRow | null>(null);
  const [packingStatusMsg, setPackingStatusMsg] = React.useState<string | null>(null);

  // Shipping Integration State
  const [selectedCourier, setSelectedCourier] = React.useState("Delhivery");
  const [generatedAWB, setGeneratedAWB] = React.useState<{ awbNumber: string; trackingUrl: string } | null>(null);

  React.useEffect(() => {
    setLoading(false);
    void loadAll();
  }, []);

  async function loadAll() {
    setFetching(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [o, p, inv, ops] = await Promise.all([
        fetch("/api/admin/orders", { headers }).then((r) => r.json()),
        fetch("/api/admin/products", { headers }).then((r) => r.json()),
        fetch("/api/admin/inventory", { headers }).then((r) => r.json()),
        fetch("/api/admin/operations?mode=batches", { headers }).then((r) => r.json()),
      ]);

      if (o?.ok) setOrders((o.data ?? []) as OrderRow[]);
      if (p?.ok) setProducts((p.data ?? []) as ProductRow[]);
      if (inv?.ok) setInventoryLogs((inv.logs ?? []) as InventoryLog[]);
      if (ops?.ok) setPrintBatches((ops.printBatches ?? []) as PrintBatch[]);
    } finally {
      setFetching(false);
    }
  }

  // 1. Order Lifecycle Transition Handler
  async function updateOrderStatus(id: string, newStatus: string) {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({ id, status: newStatus }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
        );
      } else {
        alert(json?.error ?? "Failed to update order stage");
      }
    } catch {
      alert("Error updating order status");
    }
  }

  // Assign Staff Operator to Order
  async function assignStaffToOrder(id: string, operatorName: string) {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({ id, assignedTo: operatorName }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, assigned_to: operatorName } : o))
        );
      }
    } catch {
      // ignore error
    }
  }

  // 2. Print Queue Batching Operations
  async function handleCreatePrintBatch() {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/operations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create_batch",
          material: batchMaterial,
          finish: batchFinish,
          size: batchSize,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setPrintBatches((prev) => [json.batch, ...prev]);
      }
    } catch {
      alert("Failed to generate print batch");
    }
  }

  async function updateBatchStatus(batchId: string, status: "queued" | "printing" | "completed" | "paused") {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/operations", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "update_batch_status", batchId, status }),
      });
      if (res.ok) {
        setPrintBatches((prev) =>
          prev.map((b) => (b.id === batchId ? { ...b, status } : b))
        );
      }
    } catch {
      // ignore
    }
  }

  // 3. QC Inspection Handler
  async function submitQCResult(result: "pass" | "reprint" | "reject") {
    if (!qcSelectedOrderId) {
      alert("Please select or scan an order ID for QC inspection");
      return;
    }

    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/operations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "qc_inspection",
          orderId: qcSelectedOrderId,
          result,
          checklist: qcChecklist,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        if (result === "pass") {
          await updateOrderStatus(qcSelectedOrderId, "packing");
          alert("✓ Order Passed QC! Stage advanced to Packing Station.");
        } else if (result === "reprint") {
          await updateOrderStatus(qcSelectedOrderId, "print_queue");
          alert("🔄 Reprint Flagged! Order returned to Print Queue.");
        }
        setQcSelectedOrderId("");
      }
    } catch {
      alert("Failed to submit QC result");
    }
  }

  // 4. Packing Station Scan & Validation
  function handlePackingOrderScan() {
    const found = orders.find((o) => o.id.toLowerCase().includes(packingScanOrderInput.toLowerCase()));
    if (found) {
      setPackingVerifiedOrder(found);
      setPackingStatusMsg(`✓ Order Found: ${found.customer_name} (${found.items?.length || 1} items)`);
    } else {
      setPackingVerifiedOrder(null);
      setPackingStatusMsg("❌ Order Barcode Not Found");
    }
  }

  // 5. Generate Shipping AWB
  async function handleGenerateShippingAWB(orderId: string) {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/operations", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "generate_awb", orderId, courier: selectedCourier }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setGeneratedAWB({ awbNumber: json.awbNumber, trackingUrl: json.trackingUrl });
        await updateOrderStatus(orderId, "shipped");
      }
    } catch {
      alert("Failed to generate courier AWB");
    }
  }

  // Filtered Orders Memo
  const filteredOrders = React.useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customer_phone && o.customer_phone.includes(searchQuery));

      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || o.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [orders, searchQuery, statusFilter, priorityFilter]);

  if (loading) {
    return (
      <Container className="grid min-h-[80vh] place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
          <Loader2 className="size-5 animate-spin text-brand-yellow" /> Loading Operations Platform...
        </div>
      </Container>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Top Operational Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight capitalize">
          {activeModule === "ops_dashboard" && "Production Real-Time Dashboard"}
          {activeModule === "ops_kanban" && "Order Management Engine (OMS)"}
          {activeModule === "ops_print_queue" && "Automated Print Queue Engine"}
          {activeModule === "ops_qc" && "Quality Control Inspection Station"}
          {activeModule === "ops_packing" && "Dispatch Packing Station"}
          {activeModule === "ops_shipping" && "Shipping & Courier Integration"}
          {activeModule === "ops_analytics" && "Operations Analytics & SLA KPIs"}
        </h1>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void loadAll()} disabled={fetching}>
            {fetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODULE 1: ORDER MANAGEMENT ENGINE (KANBAN WORKFLOW) */}
      {/* ============================================================ */}
      {activeModule === "ops_kanban" && (
        <div className="space-y-6">
          {/* Filter Matrix */}
          <div className="rounded-2xl border border-border bg-slate-900/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[280px] flex-1">
                <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search Orders by Customer Name, Phone, or ID..."
                  className="pl-10 h-9 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Stages ({orders.length})</option>
                {ORDER_LIFECYCLE_STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kanban Pipeline Swimlanes */}
          <div className="flex items-start gap-4 overflow-x-auto pb-4">
            {ORDER_LIFECYCLE_STAGES.slice(0, 8).map((stage) => {
              const stageOrders = filteredOrders.filter((o) => o.status === stage.key);
              return (
                <div key={stage.key} className="rounded-2xl border border-border/80 bg-slate-900/80 p-3 w-[260px] shrink-0 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-bold uppercase">{stage.label}</span>
                    <Badge variant="outline" size="sm">{stageOrders.length}</Badge>
                  </div>

                  <div className="space-y-2">
                    {stageOrders.map((o) => (
                      <div key={o.id} className="rounded-xl border border-border p-3 bg-slate-950 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold truncate">{o.customer_name}</span>
                          <span className="font-bold text-brand-yellow">{fmt(o.total_cents)}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>ID: {o.id.slice(0, 8)}</span>
                          <span className="flex items-center gap-1"><Clock className="size-3" /> SLA 2h</span>
                        </div>

                        {/* Operator Assignment Dropdown */}
                        <select
                          className="w-full h-7 rounded-lg border border-border bg-background px-2 text-[10px] font-semibold"
                          value={o.assigned_to || "Unassigned"}
                          onChange={(e) => assignStaffToOrder(o.id, e.target.value)}
                        >
                          {OPERATORS.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>

                        {/* Advance Stage Control */}
                        <div className="flex gap-1 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[10px]"
                            onClick={() => {
                              const idx = ORDER_LIFECYCLE_STAGES.findIndex((s) => s.key === o.status);
                              if (idx >= 0 && idx < ORDER_LIFECYCLE_STAGES.length - 1) {
                                updateOrderStatus(o.id, ORDER_LIFECYCLE_STAGES[idx + 1].key);
                              }
                            }}
                          >
                            Advance Stage ➔
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODULE 2: PRINT QUEUE ENGINE */}
      {/* ============================================================ */}
      {activeModule === "ops_print_queue" && (
        <div className="space-y-6">
          {/* Batch Generator Control */}
          <Card className="border-border/80 bg-slate-900/60">
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Printer className="size-4 text-brand-purple" /> Automated Batch Optimization Generator
              </CardTitle>
              <Button variant="gradient" size="sm" onClick={handleCreatePrintBatch}>
                ⚡ Generate New Print Batch
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Material Type</label>
                <select
                  className="w-full h-8 rounded-xl border border-border bg-background px-2 text-xs font-semibold"
                  value={batchMaterial}
                  onChange={(e) => setBatchMaterial(e.target.value)}
                >
                  <option value="Vinyl">Vinyl (Premium Waterproof)</option>
                  <option value="Holographic Film">Holographic Metallic Film</option>
                  <option value="Transparent Film">Clear Transparent Film</option>
                  <option value="Paper">Glossy Poster Paper</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Finish Type</label>
                <select
                  className="w-full h-8 rounded-xl border border-border bg-background px-2 text-xs font-semibold"
                  value={batchFinish}
                  onChange={(e) => setBatchFinish(e.target.value)}
                >
                  <option value="Glossy Finish">Glossy Lamination</option>
                  <option value="Matte Finish">Matte Anti-Glare</option>
                  <option value="Holographic Sheen">Holographic Rainbow Sheen</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Sticker Dimension Size</label>
                <select
                  className="w-full h-8 rounded-xl border border-border bg-background px-2 text-xs font-semibold"
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                >
                  <option value='3" x 3"'>3" x 3" Die-Cut</option>
                  <option value='4" x 4"'>4" x 4" Die-Cut</option>
                  <option value='A4 Poster'>A4 Poster Frame</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Print Batches Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {printBatches.map((b) => (
              <Card key={b.id} className="border-border/80 bg-slate-900/60">
                <CardHeader className="py-3 flex flex-row items-center justify-between border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-purple font-mono">{b.batchNumber}</span>
                    <Badge variant={b.status === "printing" ? "success" : "outline"} size="sm" className="capitalize">
                      {b.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{b.estTimeMins} mins est</span>
                </CardHeader>
                <CardContent className="py-3 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <p>Material: <strong className="text-foreground">{b.material}</strong></p>
                    <p>Finish: <strong className="text-foreground">{b.finish}</strong></p>
                    <p>Jobs Included: <strong className="text-foreground">{b.orderCount} orders</strong></p>
                    <p>Operator: <strong className="text-foreground">{b.operator}</strong></p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                    {b.status === "queued" && (
                      <Button variant="gradient" size="sm" onClick={() => updateBatchStatus(b.id, "printing")}>
                        <Play className="size-3" /> Start Printing
                      </Button>
                    )}
                    {b.status === "printing" && (
                      <Button variant="outline" size="sm" onClick={() => updateBatchStatus(b.id, "completed")}>
                        <Check className="size-3 text-emerald-400" /> Mark Batch Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODULE 4: QUALITY CONTROL (QC) STATION */}
      {/* ============================================================ */}
      {activeModule === "ops_qc" && (
        <div className="space-y-6">
          <Card className="border-border/80 bg-slate-900/60">
            <CardHeader className="py-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand-yellow" /> Quality Control (QC) Inspection Station
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Scan or Select Order ID *</label>
                  <select
                    className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                    value={qcSelectedOrderId}
                    onChange={(e) => setQcSelectedOrderId(e.target.value)}
                  >
                    <option value="">Select Order for Inspection...</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id.slice(0, 8)} - {o.customer_name} ({o.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 7-Point QC Checklist */}
              <div className="rounded-xl border border-border bg-slate-950 p-4 space-y-2 text-xs">
                <p className="font-bold uppercase text-brand-yellow">7-Point Physical Print Inspection Checklist</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {[
                    { key: "artwork", label: "1. Artwork & Vector Registration" },
                    { key: "dimensions", label: "2. Die-Cut Size & Dimensions" },
                    { key: "finish", label: "3. Specified Laminate Finish" },
                    { key: "printQuality", label: "4. DPI Crispness & No Banding" },
                    { key: "lamination", label: "5. Lamination Adhesion" },
                    { key: "colorAccuracy", label: "6. CMYK Color Accuracy" },
                    { key: "quantityCount", label: "7. Quantity Count Verification" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(qcChecklist[item.key])}
                        onChange={(e) =>
                          setQcChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))
                        }
                        className="size-4 rounded accent-brand-yellow"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Decision Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="gradient" size="sm" onClick={() => submitQCResult("pass")}>
                  <CheckCircle2 className="size-4 text-emerald-400" /> ✓ PASS (Advance to Packing)
                </Button>
                <Button variant="outline" size="sm" onClick={() => submitQCResult("reprint")}>
                  <RotateCcw className="size-4 text-amber-400" /> 🔄 REPRINT REQUIRED
                </Button>
                <Button variant="destructive" size="sm" onClick={() => submitQCResult("reject")}>
                  <XCircle className="size-4" /> ❌ REJECT (Scrap Order)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODULE 5: PACKING STATION */}
      {/* ============================================================ */}
      {activeModule === "ops_packing" && (
        <div className="space-y-6">
          <Card className="border-border/80 bg-slate-900/60">
            <CardHeader className="py-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <QrCode className="size-4 text-cyan-400" /> Barcode Verification Packing Station
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex gap-2">
                <Input
                  placeholder="Scan order barcode or enter order ID..."
                  value={packingScanOrderInput}
                  onChange={(e) => setPackingScanOrderInput(e.target.value)}
                />
                <Button variant="gradient" size="sm" onClick={handlePackingOrderScan}>
                  Scan Order
                </Button>
              </div>

              {packingStatusMsg && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 font-semibold text-cyan-400">
                  {packingStatusMsg}
                </div>
              )}

              {packingVerifiedOrder && (
                <div className="rounded-xl border border-border bg-slate-950 p-4 space-y-3">
                  <p className="font-bold text-sm">Packing Order #{packingVerifiedOrder.id.slice(0, 8)}</p>
                  <p className="text-muted-foreground">Customer: {packingVerifiedOrder.customer_name}</p>

                  <div className="border-t border-border pt-2">
                    <Button
                      variant="gradient"
                      size="sm"
                      onClick={() => handleGenerateShippingAWB(packingVerifiedOrder.id)}
                    >
                      ✓ Pack Verified &amp; Generate Courier Shipping AWB
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODULE 6: SHIPPING INTEGRATION */}
      {/* ============================================================ */}
      {activeModule === "ops_shipping" && (
        <div className="space-y-6">
          <Card className="border-border/80 bg-slate-900/60">
            <CardHeader className="py-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Truck className="size-4 text-brand-yellow" /> Multi-Courier Integration Aggregator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold uppercase text-muted-foreground">Selected Courier Partner</label>
                  <select
                    className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
                    value={selectedCourier}
                    onChange={(e) => setSelectedCourier(e.target.value)}
                  >
                    <option value="Delhivery">Delhivery Express</option>
                    <option value="Blue Dart">Blue Dart Air</option>
                    <option value="XpressBees">XpressBees Surface</option>
                  </select>
                </div>
              </div>

              {generatedAWB && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
                  <p className="font-bold text-emerald-400">✓ AWB Generated Successfully!</p>
                  <p className="font-mono text-sm">AWB: {generatedAWB.awbNumber}</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={generatedAWB.trackingUrl} target="_blank" rel="noreferrer">
                      Open Tracking URL ↗
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODULE 7: OPERATIONS ANALYTICS & SLA KPIS */}
      {/* ============================================================ */}
      {activeModule === "ops_analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <KpiCard icon={<Activity className="size-4 text-brand-yellow" />} label="Active Queue Size" value={orders.filter((o) => o.status !== "shipped" && o.status !== "delivered").length.toString()} />
            <KpiCard icon={<Printer className="size-4 text-brand-purple" />} label="Batches Printing" value={printBatches.filter((b) => b.status === "printing").length.toString()} />
            <KpiCard icon={<ShieldCheck className="size-4 text-emerald-400" />} label="QC Pass Rate" value="98.4%" />
            <KpiCard icon={<Truck className="size-4 text-blue-400" />} label="Avg Dispatch Time" value="1.8 hours" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <React.Suspense fallback={<div className="p-6">Loading operations...</div>}>
      <AdminPageContent />
    </React.Suspense>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-slate-900/80 p-3 shadow-soft">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
