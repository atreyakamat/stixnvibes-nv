import { useState, useCallback, useEffect } from "react";
import type { OrderRecord } from "../types";

export function useOrders(statusFilter: string) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const url = statusFilter !== "all" ? `/api/admin/orders?status=${statusFilter}` : "/api/admin/orders";
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok) setOrders(json.data || []);
      } else {
        setError("Failed to fetch orders.");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderAction = async (payload: any) => {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch(`/api/admin/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to update order");
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message };
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const res = await updateOrderAction({ orderId, status: newStatus });
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
    return res;
  };

  const updateOrderTracking = async (orderId: string, trackingNumber: string, courier: string) => {
    const res = await updateOrderAction({ orderId, tracking_number: trackingNumber, courier });
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { 
        ...o, 
        metadata: { ...o.metadata, tracking_number: trackingNumber, courier } 
      } : o));
    }
    return res;
  };

  const updateOrderNotes = async (orderId: string, notes: string) => {
    const res = await updateOrderAction({ orderId, notes });
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, notes } : o));
    }
    return res;
  };

  return {
    orders,
    loading,
    error,
    refresh: fetchOrders,
    updateOrderStatus,
    updateOrderTracking,
    updateOrderNotes
  };
}
