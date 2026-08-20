import { useState, useCallback, useEffect } from "react";
import type { OrderRecord } from "../types";

export function useOrders(statusFilter: string, searchQuery: string = "") {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      params.append("limit", "100");

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const json = await res.json();
        const responseData = json?.data;
        if (responseData?.data && Array.isArray(responseData.data)) {
          setOrders(responseData.data);
          setTotalCount(responseData.total ?? responseData.data.length);
        } else if (Array.isArray(responseData)) {
          setOrders(responseData);
          setTotalCount(responseData.length);
        } else {
          setOrders([]);
          setTotalCount(0);
        }
      } else {
        setError("Failed to fetch orders.");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    totalCount,
    loading,
    error,
    refresh: fetchOrders,
  };
}
