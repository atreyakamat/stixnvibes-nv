"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Send, ShoppingBag } from "lucide-react";
import { AdminPageHeader, DataTable, FilterBar, StatusBadge } from "@/components/admin/ui";
import { useOrders } from "./hooks/useOrders";
import { OrderDetailsDialog } from "./components/OrderDetailsDialog";
import { getOrderStatusConfig } from "./utils/status";
import type { OrderRecord } from "./types";

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

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { orders, totalCount, loading, refresh } = useOrders(statusFilter, searchQuery);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const columns = [
    {
      id: "order_id",
      header: "Order ID",
      sortable: true,
      cell: (row: OrderRecord) => (
        <div>
          <span className="font-mono text-slate-100 font-bold">#{row.id.slice(0, 8)}</span>
          <p className="text-[10px] text-muted-foreground">{formatDate(row.created_at)}</p>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      sortable: true,
      cell: (row: OrderRecord) => (
        <div>
          <p className="font-semibold text-slate-100">{row.customer_name || "Guest"}</p>
          <p className="text-[10px] text-muted-foreground">{row.customer_phone || row.customer_email || "No contact"}</p>
        </div>
      ),
    },
    {
      id: "total",
      header: "Total",
      sortable: true,
      cell: (row: OrderRecord) => <span className="font-bold text-brand-yellow font-mono">{formatINR(row.total_cents)}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (row: OrderRecord) => {
        const config = getOrderStatusConfig(row.status);
        return <StatusBadge label={config.label} status={config.type} />;
      },
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (row: OrderRecord) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedOrder(row)}
            className="h-8 px-2 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800"
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> View Command Center
          </Button>
          {row.whatsapp_url && (
            <a href={row.whatsapp_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:text-emerald-300">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20 relative bg-slate-950 min-h-screen text-slate-50">
      <AdminPageHeader 
        title="Order Operations Control Center"
        description="Inspect orders, audit price snapshots, track stock reservations, and execute domain-authorized transitions."
        actions={
          <Badge variant="outline" className="text-xs bg-slate-900/80 border-slate-800 px-3 py-1 text-slate-200">
            <ShoppingBag className="w-3.5 h-3.5 mr-2 text-brand-yellow" />
            {totalCount} Total Matching Orders
          </Badge>
        }
      />

      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col gap-4">
        <FilterBar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search orders by customer name, phone, email, or order ID..."
          filters={[
            { 
              id: "status", 
              placeholder: "All Pipeline Queues", 
              options: [
                { label: "All Statuses", value: "all" },
                { label: "Created / Sent (New)", value: "created" },
                { label: "Confirmed", value: "confirmed" },
                { label: "Paid / Production Queue", value: "paid" },
                { label: "In Production", value: "production" },
                { label: "Printing Queue", value: "printing" },
                { label: "Quality Check (QC)", value: "qc" },
                { label: "QC Failed / Rework", value: "qc_failed" },
                { label: "Packing Queue", value: "packing" },
                { label: "Shipped / In Transit", value: "shipped" },
                { label: "Delivered", value: "delivered" },
                { label: "Payment Failed", value: "payment_failed" },
                { label: "Cancelled", value: "cancelled" },
                { label: "Return Requested", value: "return_requested" },
                { label: "Returned", value: "returned" },
                { label: "Refunded", value: "refunded" }
              ] 
            }
          ]}
          filterValues={{ status: statusFilter }}
          onFilterChange={(id, val) => setStatusFilter(val || "all")}
        />
      </div>

      <DataTable
        columns={columns}
        data={orders}
        getRowId={(row) => row.id}
        isLoading={loading}
        emptyMessage={loading ? "Loading order command center..." : "No orders found matching the filter criteria."}
      />

      <OrderDetailsDialog
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onRefresh={refresh}
      />
    </div>
  );
}
