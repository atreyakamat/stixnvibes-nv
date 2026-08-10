"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, Edit2, Trash2, Archive, Star } from "lucide-react";
import { 
  AdminPageHeader, 
  DataTable, 
  FilterBar, 
  StatusBadge, 
  ConfirmationModal 
} from "@/components/admin/ui";
import { useProducts } from "./hooks/useProducts";
import { ProductFormDialog } from "./components/ProductFormDialog";
import type { ProductRow } from "./types";

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

export default function ProductsAdminPage() {
  const { products, loading, error, refresh, handleBulkAction, saveProduct, deleteProduct } = useProducts();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ type: "", status: "", stock: "" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Editor State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductRow> | null>(null);

  // Derived Data
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesSku = p.sku?.toLowerCase().includes(query) ?? false;
        const matchesTags = p.tags?.some((t) => t.toLowerCase().includes(query)) ?? false;
        if (!matchesName && !matchesSku && !matchesTags) return false;
      }
      if (filters.type && p.type !== filters.type) return false;
      if (filters.status && (p.status || "active") !== filters.status) return false;
      if (filters.stock) {
        if (filters.stock === "out" && p.stock > 0) return false;
        if (filters.stock === "low" && (p.stock === 0 || p.stock > 10)) return false;
        if (filters.stock === "in" && p.stock <= 10) return false;
      }
      return true;
    });
  }, [products, searchQuery, filters]);

  const openEditor = (product?: ProductRow) => {
    setEditingProduct(product || null);
    setEditorOpen(true);
  };

  const executeBulkAction = async (action: "delete" | "archive" | "feature") => {
    await handleBulkAction(action, selectedIds);
    setSelectedIds([]);
  };

  // Columns Configuration
  const columns = [
    {
      id: "product",
      header: "Product",
      sortable: true,
      cell: (p: ProductRow) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
            {p.image_url ? (
              <Image src={p.image_url} alt={p.name} width={40} height={40} className="w-full h-full object-cover" />
            ) : (
              <LayoutGrid className="w-5 h-5 text-slate-600" />
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-100 flex items-center gap-2">
              {p.name}
              {p.is_featured && <Star className="w-3 h-3 text-brand-yellow fill-brand-yellow" />}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground bg-slate-800 px-1.5 py-0.5 rounded uppercase">
                {p.type}
              </span>
              {p.sku && <span className="text-[10px] text-muted-foreground">{p.sku}</span>}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (p: ProductRow) => (
        <StatusBadge 
          label={p.status || "active"} 
          status={p.status === "active" ? "success" : p.status === "archived" ? "default" : "warning"}
        />
      ),
    },
    {
      id: "inventory",
      header: "Inventory",
      sortable: true,
      cell: (p: ProductRow) => (
        <span className={p.stock === 0 ? "text-red-400 font-medium" : p.stock <= 10 ? "text-brand-yellow font-medium" : ""}>
          {p.stock} in stock
        </span>
      ),
    },
    {
      id: "price",
      header: "Price",
      sortable: true,
      cell: (p: ProductRow) => (
        <div className="font-medium">
          {formatPrice(p.price_cents)}
          {p.compare_at_cents && (
            <span className="ml-2 text-xs line-through text-muted-foreground">
              {formatPrice(p.compare_at_cents)}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (p: ProductRow) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEditor(p)}>
            <Edit2 className="w-4 h-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(p.id)}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 bg-slate-950 min-h-screen text-slate-50">
      
      <AdminPageHeader 
        title="Product Catalog"
        description="Manage your stickers, posters, and more."
        actions={
          <Button onClick={() => openEditor()} variant="gradient">
            <Plus className="w-4 h-4 mr-2" />
            Create Product
          </Button>
        }
      />

      <div className="p-4 bg-slate-900/60 border border-border/80 rounded-xl flex flex-col gap-4">
        <FilterBar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search products, SKUs, or tags..."
          filters={[
            { id: "type", placeholder: "All Types", options: [{ label: "Sticker", value: "sticker" }, { label: "Poster", value: "poster" }] },
            { id: "status", placeholder: "All Statuses", options: [{ label: "Active", value: "active" }, { label: "Draft", value: "draft" }, { label: "Archived", value: "archived" }] },
            { id: "stock", placeholder: "All Stock Levels", options: [{ label: "In Stock", value: "in" }, { label: "Low Stock", value: "low" }, { label: "Out of Stock", value: "out" }] }
          ]}
          filterValues={filters}
          onFilterChange={(id, val) => setFilters(prev => ({ ...prev, [id]: val }))}
        />

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-brand-yellow/10 border border-brand-yellow/20">
            <span className="text-sm font-semibold text-brand-yellow">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="border-brand-yellow/30 text-brand-yellow hover:bg-brand-yellow/20" onClick={() => executeBulkAction("archive")}>
                <Archive className="w-4 h-4 mr-2" /> Archive
              </Button>
              <Button size="sm" variant="destructive" onClick={() => executeBulkAction("delete")}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {error ? (
        <div className="p-8 text-center text-red-400 bg-red-400/10 rounded-lg border border-red-400/20">
          <p>Failed to load products.</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      ) : (
        <DataTable
          data={filteredProducts}
          columns={columns}
          getRowId={(p) => p.id}
          isLoading={loading}
          enableSelection={true}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyMessage="No products found matching your filters."
        />
      )}

      {/* Reusable Editor Dialog */}
      <ProductFormDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        product={editingProduct}
        onSave={saveProduct}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={async () => {
          if (deleteConfirmId) {
            await deleteProduct(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
      />
    </div>
  );
}
