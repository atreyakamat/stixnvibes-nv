"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Plus, 
  LayoutGrid, 
  List, 
  Trash2, 
  Archive, 
  Star, 
  Edit2, 
  Copy,
  MoreVertical
} from "lucide-react";

// ProductRow Type Definition
type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  compare_at_cents?: number | null;
  stock: number;
  is_featured: boolean;
  customizable: boolean;
  collection: string | null;
  type: string;
  image_url?: string | null;
  images?: string[];
  tags?: string[];
  description?: string | null;
  short_description?: string | null;
  status?: string;
  sku?: string | null;
  barcode?: string | null;
  cost_cents?: number;
  seo_title?: string | null;
  seo_description?: string | null;
  category_id?: string | null;
  is_bundle?: boolean;
  is_limited?: boolean;
  visibility?: string;
  updated_at?: string;
  created_at?: string;
};

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    stockLevel: "all",
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductRow> | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/products", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) setProducts(data.data || []);
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

  const handleBulkAction = async (action: "delete" | "archive" | "feature") => {
    if (!selectedIds.size) return;
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const ids = Array.from(selectedIds);
      
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
      setSelectedIds(new Set());
      fetchProducts();
      showToast(`${ids.length} product${ids.length > 1 ? "s" : ""} ${action}d successfully.`);
    } catch (err: unknown) {
      showToast((err as Error).message || "Bulk action failed", "error");
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setFormError(null);
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingProduct),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Save failed");
      
      setDialogOpen(false);
      setEditingProduct(null);
      fetchProducts();
      showToast(editingProduct.id ? "Product updated." : "Product created.");
    } catch (err: unknown) {
      setFormError((err as Error).message || "Failed to save product.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setDeleteConfirmId(null);
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Delete failed");
      fetchProducts();
      showToast("Product deleted.");
    } catch (err: unknown) {
      showToast((err as Error).message || "Delete failed", "error");
    }
  };

  const openEditor = (product?: ProductRow) => {
    if (product) {
      setEditingProduct(product);
    } else {
      setEditingProduct({
        name: "",
        slug: "",
        price_cents: 0,
        stock: 0,
        type: "sticker",
        status: "active",
        is_featured: false,
        customizable: false,
        tags: [],
        images: [],
      });
    }
    setDialogOpen(true);
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesSku = p.sku?.toLowerCase().includes(query) ?? false;
        const matchesTags = p.tags?.some((t) => t.toLowerCase().includes(query)) ?? false;
        if (!matchesName && !matchesSku && !matchesTags) return false;
      }
      if (filters.type !== "all" && p.type !== filters.type) return false;
      
      const status = p.status || "active";
      if (filters.status !== "all" && status !== filters.status) return false;

      if (filters.stockLevel !== "all") {
        if (filters.stockLevel === "out" && p.stock > 0) return false;
        if (filters.stockLevel === "low" && (p.stock === 0 || p.stock > 10)) return false;
        if (filters.stockLevel === "in" && p.stock <= 10) return false;
      }

      return true;
    });
  }, [products, searchQuery, filters]);

  return (
    <div className="flex flex-col gap-6 min-h-screen bg-slate-950 text-slate-50 p-6 md:p-8">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold transition-all animate-in slide-in-from-bottom-4 ${
          toast.type === "error"
            ? "bg-red-950 border border-red-500/40 text-red-300"
            : "bg-emerald-950 border border-emerald-500/40 text-emerald-300"
        }`}>
          {toast.type === "error" ? "⚠ " : "✓ "}
          {toast.msg}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-lg">Delete Product?</h3>
            <p className="text-sm text-muted-foreground">This action cannot be undone. The product will be permanently removed from your catalog.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDeleteProduct(deleteConfirmId)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white">Product Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your stickers, posters, and more.</p>
        </div>
        <Button onClick={() => openEditor()} variant="gradient" className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Product
        </Button>
      </div>

      {/* Toolbar */}
      <Card className="bg-slate-900/60 border-border/80">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto flex-1">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products, SKUs, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950/50 border-border/50 text-white placeholder:text-muted-foreground focus-visible:ring-brand-yellow/50"
              />
            </div>
            <select
              value={filters.type}
              onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
              className="h-10 rounded-md border border-input bg-slate-950/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Types</option>
              <option value="sticker">Sticker</option>
              <option value="poster">Poster</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="h-10 rounded-md border border-input bg-slate-950/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={filters.stockLevel}
              onChange={(e) => setFilters(f => ({ ...f, stockLevel: e.target.value }))}
              className="h-10 rounded-md border border-input bg-slate-950/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Stock Levels</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-slate-800 text-brand-yellow" : ""}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode("table")}
              className={viewMode === "table" ? "bg-slate-800 text-brand-yellow" : ""}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-brand-yellow/10 border border-brand-yellow/20">
          <span className="text-sm font-semibold text-brand-yellow">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="border-brand-yellow/30 hover:bg-brand-yellow/20 text-brand-yellow" onClick={() => handleBulkAction("archive")}>
              <Archive className="w-4 h-4 mr-2" /> Archive
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleBulkAction("delete")}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 rounded-full border-4 border-brand-yellow border-t-transparent animate-spin" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-400 bg-red-400/10 rounded-lg border border-red-400/20">
          <p>Failed to load products.</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground bg-slate-900/40 rounded-2xl border border-border/50 border-dashed">
          <p className="text-lg font-medium text-slate-300">No products found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : viewMode === "table" ? (
        <Card className="bg-slate-900/60 border-border/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-slate-950/50">
                  <th className="p-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={toggleAll}
                      className="rounded border-slate-700 bg-slate-800 text-brand-yellow focus:ring-brand-yellow"
                    />
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Product</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Inventory</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Price</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-border/40 hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelection(product.id)}
                        className="rounded border-slate-700 bg-slate-800 text-brand-yellow focus:ring-brand-yellow"
                      />
                    </td>
                    <td className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-800 border border-border/80 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} width={48} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <LayoutGrid className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100 flex items-center gap-2">
                          {product.name}
                          {product.is_featured && <Star className="w-3 h-3 text-brand-yellow fill-brand-yellow" />}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground bg-slate-800 px-1.5 py-0.5 rounded">
                            {product.type}
                          </span>
                          {product.sku && <span className="text-[10px] text-muted-foreground">{product.sku}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={product.status === "active" ? "success" : product.status === "archived" ? "outline" : "default"}
                      >
                        {product.status || "active"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className={product.stock === 0 ? "text-red-400 font-medium text-sm" : product.stock <= 10 ? "text-brand-yellow font-medium text-sm" : "text-sm"}>
                          {product.stock} in stock
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium">
                      {formatPrice(product.price_cents)}
                      {product.compare_at_cents && (
                        <span className="ml-2 text-xs line-through text-muted-foreground">
                          {formatPrice(product.compare_at_cents)}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditor(product)}>
                          <Edit2 className="w-4 h-4 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirmId(product.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="bg-slate-900/60 border-border/80 group overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-slate-800 border-b border-border/80">
                <div className="absolute inset-0 p-2 z-10 flex justify-between">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleSelection(product.id)}
                    className="rounded border-slate-700 bg-slate-800 text-brand-yellow focus:ring-brand-yellow shadow-sm"
                  />
                  {product.status !== "active" && (
                    <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">{product.status}</Badge>
                  )}
                </div>
                {product.image_url ? (
                  <Image src={product.image_url} alt={product.name} width={300} height={300} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <LayoutGrid className="w-12 h-12 text-slate-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button variant="secondary" size="icon" onClick={() => openEditor(product)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => setDeleteConfirmId(product.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
                  {product.is_featured && <Star className="w-4 h-4 text-brand-yellow fill-brand-yellow flex-shrink-0" />}
                </div>
                <div className="mt-auto pt-4 flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{formatPrice(product.price_cents)}</span>
                    <span className={`text-[10px] ${product.stock === 0 ? "text-red-400" : product.stock <= 10 ? "text-brand-yellow" : "text-muted-foreground"}`}>
                      {product.stock} in stock
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-slate-800 px-2 py-1 rounded">
                    {product.type}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-border/80 text-slate-50">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editingProduct?.id ? "Edit Product" : "Create Product"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProduct} className="flex flex-col gap-6 mt-4">
            
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Basic Info</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Name</label>
                  <Input 
                    required 
                    value={editingProduct?.name || ""} 
                    onChange={e => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      setEditingProduct(prev => ({ ...prev, name, slug: prev?.id ? prev?.slug : slug }));
                    }} 
                    className="bg-slate-950/50" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Slug</label>
                  <Input required value={editingProduct?.slug || ""} onChange={e => setEditingProduct(prev => ({ ...prev, slug: e.target.value }))} className="bg-slate-950/50 font-mono text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Description</label>
                <textarea 
                  className="flex w-full rounded-md border border-input bg-slate-950/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px]"
                  value={editingProduct?.description || ""}
                  onChange={e => setEditingProduct(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Pricing & Inventory</h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Price (₹)</label>
                  <Input 
                    type="number" 
                    required 
                    min="0" 
                    value={(editingProduct?.price_cents || 0) / 100} 
                    onChange={e => setEditingProduct(prev => ({ ...prev, price_cents: Math.round(parseFloat(e.target.value) * 100) }))} 
                    className="bg-slate-950/50" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Compare At (₹)</label>
                  <Input 
                    type="number" 
                    min="0"
                    value={editingProduct?.compare_at_cents ? editingProduct.compare_at_cents / 100 : ""} 
                    onChange={e => setEditingProduct(prev => ({ ...prev, compare_at_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null }))} 
                    className="bg-slate-950/50" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Cost (₹)</label>
                  <Input 
                    type="number" 
                    min="0"
                    value={(editingProduct?.cost_cents || 0) / 100} 
                    onChange={e => setEditingProduct(prev => ({ ...prev, cost_cents: Math.round(parseFloat(e.target.value) * 100) }))} 
                    className="bg-slate-950/50" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Stock Count</label>
                  <Input 
                    type="number" 
                    required 
                    min="0"
                    value={editingProduct?.stock || 0} 
                    onChange={e => setEditingProduct(prev => ({ ...prev, stock: parseInt(e.target.value, 10) }))} 
                    className="bg-slate-950/50" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">SKU</label>
                  <Input value={editingProduct?.sku || ""} onChange={e => setEditingProduct(prev => ({ ...prev, sku: e.target.value }))} className="bg-slate-950/50 font-mono text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Barcode</label>
                  <Input value={editingProduct?.barcode || ""} onChange={e => setEditingProduct(prev => ({ ...prev, barcode: e.target.value }))} className="bg-slate-950/50 font-mono text-sm" />
                </div>
              </div>
            </div>

            {/* Organization */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Organization</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Type</label>
                  <select 
                    value={editingProduct?.type || "sticker"}
                    onChange={e => setEditingProduct(prev => ({ ...prev, type: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-slate-950/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="sticker">Sticker</option>
                    <option value="poster">Poster</option>
                    <option value="apparel">Apparel</option>
                    <option value="accessory">Accessory</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Status</label>
                  <select 
                    value={editingProduct?.status || "active"}
                    onChange={e => setEditingProduct(prev => ({ ...prev, status: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-slate-950/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">Collection</label>
                  <Input value={editingProduct?.collection || ""} onChange={e => setEditingProduct(prev => ({ ...prev, collection: e.target.value }))} className="bg-slate-950/50" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Tags (comma separated)</label>
                <Input 
                  value={editingProduct?.tags?.join(", ") || ""} 
                  onChange={e => {
                    const tags = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
                    setEditingProduct(prev => ({ ...prev, tags }));
                  }} 
                  className="bg-slate-950/50" 
                  placeholder="e.g. anime, cute, holographic"
                />
              </div>
            </div>

            {/* Media */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Media</h4>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Main Image URL</label>
                <Input 
                  value={editingProduct?.image_url || ""} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, image_url: e.target.value }))} 
                  className="bg-slate-950/50" 
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* SEO Optimization & Live SERP Preview */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">SEO & Search Engine Preview</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">SEO Title</label>
                  <Input 
                    value={editingProduct?.seo_title || ""} 
                    onChange={e => setEditingProduct(prev => ({ ...prev, seo_title: e.target.value }))} 
                    className="bg-slate-950/50" 
                    placeholder={editingProduct?.name || "Product Title"}
                  />
                  <p className="text-[10px] text-muted-foreground">{(editingProduct?.seo_title || "").length}/60 characters</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase text-slate-400">SEO Description</label>
                  <textarea 
                    className="flex w-full rounded-md border border-input bg-slate-950/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px]"
                    value={editingProduct?.seo_description || ""}
                    onChange={e => setEditingProduct(prev => ({ ...prev, seo_description: e.target.value }))}
                    placeholder="Short description for Google search results..."
                  />
                  <p className="text-[10px] text-muted-foreground">{(editingProduct?.seo_description || "").length}/160 characters</p>
                </div>
              </div>

              {/* SERP Card Preview */}
              <div className="rounded-xl border border-border/60 bg-slate-950 p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-emerald-400 font-mono text-[11px]">https://stixnvibes.com/shop/{editingProduct?.slug || "product-slug"}</span>
                </div>
                <h5 className="text-blue-400 hover:underline font-medium text-base leading-snug cursor-pointer">
                  {editingProduct?.seo_title || editingProduct?.name || "Sticker Title"} | Stix N Vibes
                </h5>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {editingProduct?.seo_description || editingProduct?.description || "Buy premium high quality vinyl stickers, custom holographic decals & art prints online in India with fast shipping."}
                </p>
              </div>
            </div>

            {/* Flags */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Flags</h4>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingProduct?.is_featured || false} 
                    onChange={e => setEditingProduct(prev => ({ ...prev, is_featured: e.target.checked }))} 
                    className="rounded border-slate-700 bg-slate-800 text-brand-yellow focus:ring-brand-yellow"
                  />
                  Featured Product
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingProduct?.customizable || false} 
                    onChange={e => setEditingProduct(prev => ({ ...prev, customizable: e.target.checked }))} 
                    className="rounded border-slate-700 bg-slate-800 text-brand-yellow focus:ring-brand-yellow"
                  />
                  Customizable
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingProduct?.is_limited || false} 
                    onChange={e => setEditingProduct(prev => ({ ...prev, is_limited: e.target.checked }))} 
                    className="rounded border-slate-700 bg-slate-800 text-brand-yellow focus:ring-brand-yellow"
                  />
                  Limited Edition
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingProduct?.is_bundle || false} 
                    onChange={e => setEditingProduct(prev => ({ ...prev, is_bundle: e.target.checked }))} 
                    className="rounded border-slate-700 bg-slate-800 text-brand-yellow focus:ring-brand-yellow"
                  />
                  Bundle
                </label>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-border/50">
              {formError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 font-semibold">
                  ⚠ {formError}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); setFormError(null); }}>
                  Cancel
                </Button>
                <Button type="submit" variant="gradient">
                  {editingProduct?.id ? "Save Changes" : "Create Product"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
