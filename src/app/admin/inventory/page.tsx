"use client";

import React, { useState, useMemo } from "react";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminPageHeader, DataTable, FilterBar } from "@/components/admin/ui";
import { useInventory, type InventoryProduct } from "./hooks/useInventory";

export default function InventoryPage() {
  const { products, loading, editingStocks, updatingId, handleStockChange, saveStock } = useInventory();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    if (!searchQuery) return list;
    const term = searchQuery.toLowerCase();
    return list.filter((p) => 
      p.name.toLowerCase().includes(term) || 
      (p.sku && p.sku.toLowerCase().includes(term))
    );
  }, [products, searchQuery]);

  const columns = [
    {
      id: "product",
      header: "Product",
      sortable: true,
      cell: (row: InventoryProduct) => (
        <div>
          <p className="font-semibold text-slate-100">{row.name}</p>
          <p className="text-[10px] text-muted-foreground">{row.sku || "No SKU"}</p>
        </div>
      ),
    },
    {
      id: "stock",
      header: "Stock Level",
      sortable: true,
      cell: (row: InventoryProduct) => {
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
      id: "actions",
      header: "Update Stock",
      cell: (row: InventoryProduct) => {
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
      <AdminPageHeader 
        title="Inventory Management"
        description="Quickly view and update product stock levels."
      />

      <div className="p-4 bg-slate-900/60 border border-border/80 rounded-xl">
        <FilterBar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search products by name or SKU..."
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        getRowId={(p) => p.id}
        isLoading={loading}
        emptyMessage={loading ? "Loading inventory..." : "No products found matching your search."}
      />
    </div>
  );
}
