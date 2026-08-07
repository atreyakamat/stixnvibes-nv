"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { User, ShoppingBag, Crown, AlertTriangle, MessageCircle, X } from "lucide-react";
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
  vip?: boolean;
  blacklisted?: boolean;
  blacklist_reason?: string;
  notes?: string;
  favourite_products?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState("total_spent");

  // Side panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Partial<CustomerRecord> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Orders for timeline
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
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
            id: item.id || item.customer_phone || item.customer_email || `customer-${index}`,
          }));
          setCustomers(list);
        } else {
          setError(json?.error || "Failed to fetch customers");
        }
      } else {
        setError("Network error fetching customers");
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const fetchOrdersForCustomer = async (phone: string, email: string | null) => {
    setOrdersLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const query = phone || email || "";
      if (!query) {
        setRecentOrders([]);
        return;
      }
      const res = await fetch(`/api/admin/orders?search=${encodeURIComponent(query)}&limit=5`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok) {
          setRecentOrders(json.data || []);
        }
      }
    } catch {
      // safe fallback
    } finally {
      setOrdersLoading(false);
    }
  };

  const openCustomerPanel = (customer?: CustomerRecord) => {
    setError(null);
    if (customer) {
      setSelectedCustomer({ ...customer });
      fetchOrdersForCustomer(customer.customer_phone, customer.customer_email);
    } else {
      setSelectedCustomer({
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        total_orders: 0,
        total_spent: 0,
        vip: false,
        blacklisted: false,
        blacklist_reason: "",
        notes: "",
        favourite_products: ""
      });
      setRecentOrders([]);
    }
    setPanelOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer?.customer_phone && !selectedCustomer?.customer_email && !selectedCustomer?.customer_name) {
      setError("Please provide at least a phone number, email, or name to identify the customer.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch(`/api/admin/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(selectedCustomer),
      });
      
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to save customer");
      }
      
      setPanelOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setError(err?.message || "An error occurred while saving");
    } finally {
      setSaving(false);
    }
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
    });
  };

  const columns: Column<CustomerRecord>[] = [
    {
      header: "Customer",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div>
            <p className="font-semibold text-slate-100 flex items-center gap-2">
              {row.customer_name || "Guest Customer"}
              {row.vip && <Crown className="w-3 h-3 text-brand-yellow" />}
              {row.blacklisted && <AlertTriangle className="w-3 h-3 text-red-500" />}
            </p>
            <p className="text-[10px] text-muted-foreground">{row.customer_phone || "No phone"}</p>
          </div>
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
    {
      header: "Actions",
      cell: (row) => (
        <Button size="sm" variant="outline" onClick={() => openCustomerPanel(row)}>
          View / Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20 bg-slate-900 min-h-screen text-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-yellow">Customers CRM</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage VIPs, view lifetime value, and handle customer relations.</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-xs bg-slate-900/60 px-3 py-1 border-brand-yellow/20">
            <User className="w-3 h-3 mr-2 text-brand-yellow" />
            {customers.length} Total
          </Badge>
          <Button onClick={() => openCustomerPanel()} className="bg-brand-yellow text-slate-950 hover:bg-brand-yellow/90">
            Add Customer
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-md text-sm">
          {error}
        </div>
      )}

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
              className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-200"
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

      {/* Side Panel Dialog */}
      <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
        <DialogContent className="!left-auto !right-0 !translate-x-0 sm:!w-[500px] !w-full !h-full !max-h-none !rounded-none overflow-y-auto bg-slate-900 border-l border-slate-800 p-0 text-slate-50">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/95 backdrop-blur z-10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {selectedCustomer?.id ? "Customer Profile" : "New Customer"}
              {selectedCustomer?.vip && <Badge className="bg-brand-yellow text-black ml-2"><Crown className="w-3 h-3 mr-1"/> VIP</Badge>}
              {selectedCustomer?.blacklisted && <Badge className="bg-red-500 text-white ml-2"><AlertTriangle className="w-3 h-3 mr-1"/> Blacklisted</Badge>}
            </DialogTitle>
            <DialogDescription className="sr-only">
              View and edit customer details
            </DialogDescription>
          </div>

          <div className="p-6 space-y-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-sm">
                {error}
              </div>
            )}

            {/* Quick Stats (Only if existing) */}
            {selectedCustomer?.id && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <p className="text-xs text-muted-foreground mb-1">Lifetime Value (LTV)</p>
                  <p className="text-xl font-bold text-brand-yellow">{formatINR(selectedCustomer.total_spent || 0)}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <p className="text-xs text-muted-foreground mb-1">Avg Order Value</p>
                  <p className="text-xl font-bold">
                    {formatINR((selectedCustomer.total_spent || 0) / Math.max(selectedCustomer.total_orders || 1, 1))}
                  </p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
                  <p className="text-xl font-bold">{selectedCustomer.total_orders}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <p className="text-xs text-muted-foreground mb-1">Customer Since</p>
                  <p className="text-sm font-semibold mt-1">{formatDate(selectedCustomer.first_order_at || "")}</p>
                </div>
              </div>
            )}

            {/* Details Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-slate-800 pb-2">Personal Info</h3>
              
              <div className="grid gap-2">
                <label className="text-xs text-slate-400">Name</label>
                <Input 
                  value={selectedCustomer?.customer_name || ""} 
                  onChange={(e) => setSelectedCustomer(s => ({ ...s, customer_name: e.target.value }))}
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs text-slate-400">Phone</label>
                <div className="flex gap-2">
                  <Input 
                    value={selectedCustomer?.customer_phone || ""} 
                    onChange={(e) => setSelectedCustomer(s => ({ ...s, customer_phone: e.target.value }))}
                    className="bg-slate-950 border-slate-800 flex-1"
                  />
                  {selectedCustomer?.customer_phone && (
                    <Button 
                      type="button"
                      variant="outline" 
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300 px-3"
                      onClick={() => window.open(`https://wa.me/${selectedCustomer.customer_phone?.replace(/\D/g,'')}`, '_blank')}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-xs text-slate-400">Email</label>
                <Input 
                  type="email"
                  value={selectedCustomer?.customer_email || ""} 
                  onChange={(e) => setSelectedCustomer(s => ({ ...s, customer_email: e.target.value }))}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-slate-800 pb-2">Status & Badges</h3>
              
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedCustomer?.vip || false}
                    onChange={(e) => setSelectedCustomer(s => ({ ...s, vip: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-950 text-brand-yellow focus:ring-brand-yellow/30 w-4 h-4 accent-brand-yellow"
                  />
                  VIP Customer
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-red-400 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedCustomer?.blacklisted || false}
                    onChange={(e) => setSelectedCustomer(s => ({ ...s, blacklisted: e.target.checked }))}
                    className="rounded border-red-900 bg-slate-950 focus:ring-red-500/30 w-4 h-4 accent-red-500"
                  />
                  Blacklist Customer
                </label>
                {selectedCustomer?.blacklisted && (
                  <Input 
                    placeholder="Reason for blacklisting..."
                    value={selectedCustomer?.blacklist_reason || ""} 
                    onChange={(e) => setSelectedCustomer(s => ({ ...s, blacklist_reason: e.target.value }))}
                    className="bg-red-950/20 border-red-900/50 text-red-200 mt-2"
                  />
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-slate-800 pb-2">Insights</h3>
              
              <div className="grid gap-2">
                <label className="text-xs text-slate-400">Favourite Products</label>
                <Input 
                  placeholder="e.g. Classic Sticker Pack, Glossy Overlays"
                  value={selectedCustomer?.favourite_products || ""} 
                  onChange={(e) => setSelectedCustomer(s => ({ ...s, favourite_products: e.target.value }))}
                  className="bg-slate-950 border-slate-800"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs text-slate-400">Internal Notes (Merchant Only)</label>
                <textarea 
                  rows={4}
                  placeholder="Private notes about preferences, complaints, etc."
                  value={selectedCustomer?.notes || ""} 
                  onChange={(e) => setSelectedCustomer(s => ({ ...s, notes: e.target.value }))}
                  className="bg-slate-950 border border-slate-800 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow/50 resize-none"
                />
              </div>
            </div>

            {selectedCustomer?.id && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-slate-800 pb-2">Recent Orders</h3>
                {ordersLoading ? (
                  <p className="text-sm text-slate-500">Loading orders...</p>
                ) : recentOrders.length > 0 ? (
                  <div className="space-y-3">
                    {recentOrders.map((o: any) => (
                      <div key={o.id} className="bg-slate-950 border border-slate-800 rounded-md p-3 text-sm flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{o.id.substring(0,8).toUpperCase()}</p>
                          <p className="text-xs text-slate-500">{formatDate(o.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-yellow">{formatINR(o.total_cents)}</p>
                          <Badge variant="outline" className="text-[10px] mt-1">{o.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No orders found.</p>
                )}
              </div>
            )}
          </div>
          
          <div className="p-6 border-t border-slate-800 sticky bottom-0 bg-slate-900 flex justify-end gap-3 z-10">
            <Button variant="outline" onClick={() => setPanelOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomer} disabled={saving} className="bg-brand-yellow text-slate-950 hover:bg-brand-yellow/90">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
