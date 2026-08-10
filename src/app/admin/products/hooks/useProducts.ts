import { useState, useEffect, useCallback } from "react";
import type { ProductRow } from "../types";

export function useProducts() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/products", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) setProducts(data.data || []);
      } else {
        setError("Failed to fetch products");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleBulkAction = async (action: "delete" | "archive" | "feature", ids: string[]) => {
    if (!ids.length) return { success: false, message: "No products selected." };
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      
      let payload: Record<string, unknown> = { ids };
      if (action === "delete") payload.bulkAction = "delete";
      if (action === "archive") {
        payload.bulkAction = "status";
        payload.status = "archived";
      }
      if (action === "feature") {
        payload.bulkAction = "status";
        payload.status = "active";
        payload.is_featured = true;
      }

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Bulk action failed");
      
      fetchProducts();
      return { success: true, message: `${ids.length} product${ids.length > 1 ? "s" : ""} ${action}d successfully.` };
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message || "Bulk action failed" };
    }
  };

  const saveProduct = async (product: Partial<ProductRow>) => {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Save failed");
      
      fetchProducts();
      return { success: true, message: product.id ? "Product updated." : "Product created." };
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message || "Failed to save product." };
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Delete failed");
      
      fetchProducts();
      return { success: true, message: "Product deleted." };
    } catch (err: unknown) {
      return { success: false, message: (err as Error).message || "Delete failed" };
    }
  };

  return {
    products,
    loading,
    error,
    refresh: fetchProducts,
    handleBulkAction,
    saveProduct,
    deleteProduct,
  };
}
