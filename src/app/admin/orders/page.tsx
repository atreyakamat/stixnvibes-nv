"use client";

import React, { useState, useMemo } from "react";
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
  const { orders, loading, updateOrderStatus, updateOrderTracking, updateOrderNotes } = useOrders(statusFilter);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter(o => 
      o.id.toLowerCase().includes(query) ||
      o.customer_name?.toLowerCase().includes(query) ||
      o.customer_phone?.toLowerCase().includes(query) ||
      o.customer_email?.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

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
          <p className="text-[10px] text-muted-foreground">{row.customer_phone || "No phone"}</p>
        </div>
      ),
    },
    {
      id: "total",
      header: "Total",
      sortable: true,
      cell: (row: OrderRecord) => <span className="font-bold text-brand-yellow">{formatINR(row.total_cents)}</span>,
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
          <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(row)}>
            <Eye className="w-4 h-4 text-slate-400 hover:text-white" />
          </Button>
          {row.whatsapp_url && (
            <a href={row.whatsapp_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="text-emerald-400 hover:text-emerald-300">
                <Send className="w-4 h-4" />
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
        title="Orders Manager"
        description="Review, approve, and transition customer orders."
        actions={
          <Badge variant="outline" className="text-xs bg-slate-900/60 px-3 py-1">
            <ShoppingBag className="w-3 h-3 mr-2" />
            {orders.length} Total Orders
          </Badge>
        }
      />

      <div className="p-4 bg-slate-900/60 border border-border/80 rounded-xl flex flex-col gap-4">
        <FilterBar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search orders by customer, phone or ID..."
          filters={[
            { 
              id: "status", 
              placeholder: "All Statuses", 
              options: [
                { label: "Created", value: "created" },
                { label: "Sent", value: "sent" },
                { label: "Confirmed", value: "confirmed" },
                { label: "Paid", value: "paid" },
                { label: "Artwork Review", value: "artwork_review" },
                { label: "Production", value: "production" },
                { label: "Shipped", value: "shipped" },
                { label: "Delivered", value: "delivered" },
                { label: "Cancelled", value: "cancelled" }
              ] 
            }
          ]}
          filterValues={{ status: statusFilter === "all" ? "" : statusFilter }}
          onFilterChange={(id, val) => setStatusFilter(val || "all")}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        getRowId={(row) => row.id}
        isLoading={loading}
        emptyMessage={loading ? "Loading orders..." : "No orders found."}
      />

      <OrderDetailsDialog
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={updateOrderStatus}
        onUpdateTracking={updateOrderTracking}
        onUpdateNotes={updateOrderNotes}
      />
    </div>
  );
}
