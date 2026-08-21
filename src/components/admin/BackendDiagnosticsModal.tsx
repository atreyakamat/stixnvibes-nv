"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  ShieldCheck,
  Package,
  ShoppingBag,
  Sliders,
  Server,
  Zap,
} from "lucide-react";

type DiagnosticResult = {
  id: string;
  name: string;
  category: string;
  status: "pending" | "running" | "healthy" | "degraded" | "failed";
  latencyMs?: number;
  message?: string;
  details?: any;
};

export function BackendDiagnosticsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [running, setRunning] = React.useState(false);
  const [results, setResults] = React.useState<DiagnosticResult[]>([
    { id: "db", name: "PostgreSQL Database", category: "Infrastructure", status: "pending" },
    { id: "auth", name: "Admin Token & Authentication", category: "Security", status: "pending" },
    { id: "products", name: "Product Catalog Engine", category: "API", status: "pending" },
    { id: "orders", name: "Orders & State Machine", category: "Operations", status: "pending" },
    { id: "settings", name: "Settings & Feature Flags", category: "Configuration", status: "pending" },
  ]);
  const [lastTestedAt, setLastTestedAt] = React.useState<string | null>(null);

  const runDiagnostics = React.useCallback(async () => {
    setRunning(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const updated: DiagnosticResult[] = [
      { id: "db", name: "PostgreSQL Database", category: "Infrastructure", status: "running" },
      { id: "auth", name: "Admin Token & Authentication", category: "Security", status: "running" },
      { id: "products", name: "Product Catalog Engine", category: "API", status: "running" },
      { id: "orders", name: "Orders & State Machine", category: "Operations", status: "running" },
      { id: "settings", name: "Settings & Feature Flags", category: "Configuration", status: "running" },
    ];
    setResults([...updated]);

    // 1. Health check (Database)
    try {
      const start = Date.now();
      const res = await fetch("/api/health");
      const latency = Date.now() - start;
      const json = await res.json();
      if (res.ok && json.status === "healthy") {
        updated[0] = {
          id: "db",
          name: "PostgreSQL Database",
          category: "Infrastructure",
          status: "healthy",
          latencyMs: json.checks?.database?.latencyMs ?? latency,
          message: `Connected (${json.checks?.database?.latencyMs ?? latency}ms latency)`,
          details: json,
        };
      } else {
        updated[0] = {
          id: "db",
          name: "PostgreSQL Database",
          category: "Infrastructure",
          status: "failed",
          latencyMs: latency,
          message: "Database check failed or returned unhealthy status",
          details: json,
        };
      }
    } catch (err: any) {
      updated[0] = {
        id: "db",
        name: "PostgreSQL Database",
        category: "Infrastructure",
        status: "failed",
        message: err?.message || "Failed to reach /api/health",
      };
    }
    setResults([...updated]);

    // 2. Auth check (Settings API with admin token)
    try {
      const start = Date.now();
      const res = await fetch("/api/admin/settings", { headers: authHeaders });
      const latency = Date.now() - start;
      const json = await res.json();
      if (res.ok && json?.ok) {
        updated[1] = {
          id: "auth",
          name: "Admin Token & Authentication",
          category: "Security",
          status: "healthy",
          latencyMs: latency,
          message: "Admin credentials verified & authorized",
          details: { tokenPresent: !!token, status: res.status },
        };
      } else if (res.status === 401 || res.status === 403) {
        updated[1] = {
          id: "auth",
          name: "Admin Token & Authentication",
          category: "Security",
          status: "failed",
          latencyMs: latency,
          message: "Unauthorized (401/403). Please log in again.",
          details: json,
        };
      } else {
        updated[1] = {
          id: "auth",
          name: "Admin Token & Authentication",
          category: "Security",
          status: "degraded",
          latencyMs: latency,
          message: json?.error || "Auth check returned unexpected status",
          details: json,
        };
      }
    } catch (err: any) {
      updated[1] = {
        id: "auth",
        name: "Admin Token & Authentication",
        category: "Security",
        status: "failed",
        message: err?.message || "Auth check connection error",
      };
    }
    setResults([...updated]);

    // 3. Products Catalog check
    try {
      const start = Date.now();
      const res = await fetch("/api/admin/products?limit=10", { headers: authHeaders });
      const latency = Date.now() - start;
      const json = await res.json();
      if (res.ok && json?.ok) {
        const raw = json.data;
        const count = Array.isArray(raw) ? raw.length : (raw?.total ?? raw?.data?.length ?? 0);
        updated[2] = {
          id: "products",
          name: "Product Catalog Engine",
          category: "API",
          status: "healthy",
          latencyMs: latency,
          message: `Catalog API operational (${count} products accessible)`,
          details: { count, sample: Array.isArray(raw) ? raw.slice(0, 2) : raw?.data?.slice(0, 2) },
        };
      } else {
        updated[2] = {
          id: "products",
          name: "Product Catalog Engine",
          category: "API",
          status: "failed",
          latencyMs: latency,
          message: json?.error || "Failed to query products API",
          details: json,
        };
      }
    } catch (err: any) {
      updated[2] = {
        id: "products",
        name: "Product Catalog Engine",
        category: "API",
        status: "failed",
        message: err?.message || "Products API unreachable",
      };
    }
    setResults([...updated]);

    // 4. Orders API check
    try {
      const start = Date.now();
      const res = await fetch("/api/admin/orders?limit=5", { headers: authHeaders });
      const latency = Date.now() - start;
      const json = await res.json();
      if (res.ok && json?.ok) {
        const raw = json.data;
        const total = raw?.total ?? (Array.isArray(raw) ? raw.length : (raw?.data?.length ?? 0));
        updated[3] = {
          id: "orders",
          name: "Orders & State Machine",
          category: "Operations",
          status: "healthy",
          latencyMs: latency,
          message: `Orders pipeline operational (${total} total orders)`,
          details: { total },
        };
      } else {
        updated[3] = {
          id: "orders",
          name: "Orders & State Machine",
          category: "Operations",
          status: "failed",
          latencyMs: latency,
          message: json?.error || "Failed to query orders API",
          details: json,
        };
      }
    } catch (err: any) {
      updated[3] = {
        id: "orders",
        name: "Orders & State Machine",
        category: "Operations",
        status: "failed",
        message: err?.message || "Orders API unreachable",
      };
    }
    setResults([...updated]);

    // 5. Settings API check
    try {
      const start = Date.now();
      const res = await fetch("/api/admin/settings", { headers: authHeaders });
      const latency = Date.now() - start;
      const json = await res.json();
      if (res.ok && json?.ok) {
        const catCount = Object.keys(json.data || {}).length;
        updated[4] = {
          id: "settings",
          name: "Settings & Feature Flags",
          category: "Configuration",
          status: "healthy",
          latencyMs: latency,
          message: `Settings store loaded (${catCount} config categories)`,
          details: { categories: Object.keys(json.data || {}) },
        };
      } else {
        updated[4] = {
          id: "settings",
          name: "Settings & Feature Flags",
          category: "Configuration",
          status: "failed",
          latencyMs: latency,
          message: json?.error || "Failed to query settings API",
          details: json,
        };
      }
    } catch (err: any) {
      updated[4] = {
        id: "settings",
        name: "Settings & Feature Flags",
        category: "Configuration",
        status: "failed",
        message: err?.message || "Settings API unreachable",
      };
    }

    setResults([...updated]);
    setLastTestedAt(new Date().toLocaleTimeString());
    setRunning(false);
  }, []);

  React.useEffect(() => {
    if (open) {
      runDiagnostics();
    }
  }, [open, runDiagnostics]);

  const allHealthy = results.every((r) => r.status === "healthy");
  const hasFailures = results.some((r) => r.status === "failed");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-border/80 text-slate-100 p-6 shadow-2xl">
        <DialogHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-yellow/15 border border-brand-yellow/30 text-brand-yellow">
                <Zap className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-display tracking-tight flex items-center gap-2">
                  Backend System Diagnostics
                  {lastTestedAt && (
                    <span className="text-xs font-normal text-muted-foreground font-mono">
                      (Tested at {lastTestedAt})
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Real-time connectivity and operational health across database, auth, and APIs.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={runDiagnostics}
              disabled={running}
              className="gap-2 text-xs border-border/80 hover:bg-slate-800"
            >
              <RefreshCw className={`size-3.5 ${running ? "animate-spin" : ""}`} />
              {running ? "Testing..." : "Re-test Backend"}
            </Button>
          </div>
        </DialogHeader>

        {/* Global Status Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            running
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : allHealthy
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : hasFailures
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2.5 font-medium">
            {running ? (
              <RefreshCw className="size-4 animate-spin text-amber-400" />
            ) : allHealthy ? (
              <CheckCircle2 className="size-4 text-emerald-400" />
            ) : hasFailures ? (
              <XCircle className="size-4 text-red-400" />
            ) : (
              <AlertTriangle className="size-4 text-amber-400" />
            )}
            <span>
              {running
                ? "Running live system diagnostics..."
                : allHealthy
                ? "All Backend Services & APIs are Healthy and Connected."
                : hasFailures
                ? "Backend Issues Detected — see individual diagnostics below."
                : "Some services returned warnings."}
            </span>
          </div>

          <div className="font-mono text-[11px] opacity-80">
            Node: {process.env.NODE_ENV ?? "development"}
          </div>
        </div>

        {/* Diagnostic Items List */}
        <div className="space-y-2 mt-2">
          {results.map((r) => {
            const Icon =
              r.id === "db"
                ? Database
                : r.id === "auth"
                ? ShieldCheck
                : r.id === "products"
                ? Package
                : r.id === "orders"
                ? ShoppingBag
                : Sliders;

            return (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-slate-950/60 hover:bg-slate-950 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 border border-border/50 text-slate-300">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-100">{r.name}</p>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/60 bg-slate-800/80 px-1.5 py-0.5 rounded">
                        {r.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      {r.status === "running"
                        ? "Checking endpoint response..."
                        : r.message || "Awaiting diagnostic run"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {r.latencyMs !== undefined && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-slate-900 border border-border/60 px-2 py-0.5 rounded-md">
                      {r.latencyMs}ms
                    </span>
                  )}

                  {r.status === "running" && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                      <RefreshCw className="size-3 animate-spin" /> Testing
                    </span>
                  )}

                  {r.status === "healthy" && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                      <CheckCircle2 className="size-3 text-emerald-400" /> Operational
                    </span>
                  )}

                  {r.status === "failed" && (
                    <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full font-medium">
                      <XCircle className="size-3 text-red-400" /> Error
                    </span>
                  )}

                  {r.status === "degraded" && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full font-medium">
                      <AlertTriangle className="size-3 text-amber-400" /> Warning
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-border/60 mt-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-brand-yellow text-slate-950 font-bold hover:bg-brand-yellow/90"
          >
            Close Diagnostics
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
