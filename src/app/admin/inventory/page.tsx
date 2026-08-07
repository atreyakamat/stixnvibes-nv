"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/admin/data-table";

type Product = {
  id: string;
  name: string;
  sku: string;
  stock: number;
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStocks, setEditingStocks] = useState<Record<string, number>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/products?limit=1000", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok) {
          setProducts(json.data || []);
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const columns: Column<Product>[] = [
    {
      header: "Product",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-100">{row.name}</p>
          <p className="text-[10px] text-muted-foreground">{row.sku || "No SKU"}</p>
        </div>
      ),
    },
    {
      header: "Stock Level",
      cell: (row) => {
        const isLow = row.stock < 10;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isLow ? "text-red-400" : "text-emerald-400"}`}>
              {row.stock}
            </span>
            {isLow && <AlertTriangle className="w-4 h-4 text-red-500" />}
          </div>
        );
      },
    },
    {
      header: "Update Stock",
      cell: (row) => {
        const currentEdit = editingStocks[row.id];
        const hasUnsavedChanges = currentEdit !== undefined && currentEdit !== row.stock;
        const isUpdating = updatingId === row.id;

        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className="w-20 h-8 text-xs bg-slate-950 border-slate-800"
              value={currentEdit !== undefined ? currentEdit : row.stock}
              onChange={(e) => handleStockChange(row.id, e.target.value)}
            />
            {hasUnsavedChanges && (
              <Button
                size="sm"
                onClick={() => saveStock(row.id)}
                disabled={isUpdating}
                className="h-8 bg-brand-yellow text-slate-950 font-bold hover:bg-brand-yellow/90"
              >
                {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20 bg-slate-950 min-h-screen text-slate-50">
      <div>
        <h1 className="font-display text-2xl font-bold">Inventory Management</h1>
        <p className="text-xs text-muted-foreground mt-1">Quickly view and update product stock levels.</p>
      </div>

      <DataTable
        columns={columns}
        data={products}
        searchPlaceholder="Search products by name or SKU..."
        pageSize={20}
        emptyText={loading ? "Loading inventory..." : "No products found."}
      />
    </div>
  );
}
