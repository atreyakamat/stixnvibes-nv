"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { User, ShoppingBag } from "lucide-react";
import { DataTable, type Column } from "@/components/admin/data-table";

interface CustomerRecord {
  id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string;
  first_order_at: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("total_spent");

  const fetchCustomers = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch(`/api/admin/customers?sort=${sort}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok) {
          const list = (json.data || []).map((item: CustomerRecord, index: number) => ({
            ...item,
            id: item.customer_phone || item.customer_email || `customer-${index}`,
          }));
          setCustomers(list);
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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
    });
  };

  const columns: Column<CustomerRecord>[] = [
    {
      header: "Customer",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-100">{row.customer_name || "Guest Customer"}</p>
          <p className="text-[10px] text-muted-foreground">{row.customer_phone || "No phone"}</p>
        </div>
      ),
    },
    {
      header: "Email",
      accessorKey: "customer_email",
      cell: (row) => row.customer_email || <span className="text-muted-foreground">—</span>,
    },
    {
      header: "Orders",
      cell: (row) => (
        <Badge variant="outline" className="text-xs bg-slate-950/60">
          <ShoppingBag className="w-3 h-3 mr-1" />
          {row.total_orders} orders
        </Badge>
      ),
    },
    {
      header: "Total Spent",
      cell: (row) => <span className="font-bold text-brand-yellow">{formatINR(row.total_spent)}</span>,
    },
    {
      header: "Last Order",
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.last_order_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Customers</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage and view customer data.</p>
        </div>
        <Badge variant="outline" className="text-xs bg-slate-900/60 px-3 py-1">
          <User className="w-3 h-3 mr-2" />
          {customers.length} Total Customers
        </Badge>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        searchPlaceholder="Search customers by name, phone or email..."
        pageSize={15}
        emptyText={loading ? "Loading customers..." : "No customer records found."}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Sort By</span>
            <select
              className="h-9 rounded-md border border-input bg-slate-950 px-3 py-1 text-xs"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="total_spent">Total Spent</option>
              <option value="total_orders">Total Orders</option>
              <option value="last_order_at">Last Order (Recency)</option>
            </select>
          </div>
        }
      />
    </div>
  );
}
