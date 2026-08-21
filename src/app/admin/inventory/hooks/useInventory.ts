import { useState, useCallback, useEffect } from "react";

export type InventoryProduct = {
  id: string;
  name: string;
  sku: string;
  stock: number;
};

export function useInventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStocks, setEditingStocks] = useState<Record<string, number>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/products?limit=1000", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        const raw = json?.data;
        if (raw?.data && Array.isArray(raw.data)) {
          setProducts(raw.data);
        } else if (Array.isArray(raw)) {
          setProducts(raw);
        } else {
          setProducts([]);
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleStockChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    setEditingStocks((prev) => ({
      ...prev,
      [id]: isNaN(num) ? 0 : num,
    }));
  };

  const saveStock = async (id: string) => {
    const newStock = editingStocks[id];
    if (newStock === undefined) return;

    setUpdatingId(id);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, stock: newStock }),
      });

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p))
        );
        const newEditing = { ...editingStocks };
        delete newEditing[id];
        setEditingStocks(newEditing);
      }
    } catch {
      // Handled gracefully
    } finally {
      setUpdatingId(null);
    }
  };

  return {
    products,
    loading,
    editingStocks,
    updatingId,
    handleStockChange,
    saveStock,
    refresh: fetchProducts,
  };
}
