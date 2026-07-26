"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShoppingCart,
  Package,
  Tag,
  LogOut,
  Sparkles,
  RefreshCw,
  Loader2,
  Download,
  Upload,
  AlertTriangle,
  Layers,
  Plus,
  Trash2,
  X,
  Check,
  Search,
  Image as ImageIcon,
  Star,
  FileSpreadsheet,
  Edit2,
  Filter,
} from "lucide-react";

type OrderRow = {
  id: string;
  created_at: string;
  customer_name: string;
  total_cents: number;
  status: string;
  whatsapp_url: string | null;
};

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
  tags?: string[];
  description?: string | null;
  status?: "active" | "draft" | "archived";
};

const PRODUCT_TYPES = [
  { label: "Sticker (Normal)", value: "sticker" },
  { label: "Sticker (Vinyl)", value: "sticker_vinyl" },
  { label: "Poster", value: "poster" },
  { label: "Spotify Card", value: "spotify_card" },
  { label: "Frame", value: "frame" },
  { label: "Mystery Pack", value: "mystery_pack" },
];

const COLLECTIONS = ["Anime", "Gaming", "Formula 1", "Movies", "Minimal", "Nature"];

const AVAILABLE_TAGS = ["bestseller", "new", "offer", "premium", "customizable"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [fetching, setFetching] = React.useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "draft" | "archived">("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [stockFilter, setStockFilter] = React.useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [selectedCollection, setSelectedCollection] = React.useState<string | null>(null);

  // Modal / Form state
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formErr, setFormErr] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState<string | null>(null);

  // Form Fields
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [type, setType] = React.useState("sticker");
  const [collection, setCollection] = React.useState("Anime");
  const [priceRupees, setPriceRupees] = React.useState("199");
  const [compareAtRupees, setCompareAtRupees] = React.useState("299");
  const [stock, setStock] = React.useState("50");
  const [imageUrl, setImageUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isFeatured, setIsFeatured] = React.useState(false);
  const [customizable, setCustomizable] = React.useState(false);
  const [productStatus, setProductStatus] = React.useState<"active" | "draft" | "archived">("active");
  const [selectedTags, setSelectedTags] = React.useState<string[]>(["new"]);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
    if (!token) {
      router.replace("/login?redirect=/admin");
      return;
    }
    setAuthed(true);
    setLoading(false);
    void loadAll();
  }, [router]);

  async function loadAll() {
    setFetching(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [o, p] = await Promise.all([
        fetch("/api/admin/orders", { headers }).then((r) => r.json()),
        fetch("/api/admin/products", { headers }).then((r) => r.json()),
      ]);
      if (o?.ok) setOrders((o.data ?? []) as OrderRow[]);
      if (p?.ok) {
        // Assign default status "active" if missing
        const list = (p.data ?? []).map((prod: ProductRow) => ({
          ...prod,
          status: prod.status ?? "active",
        }));
        setProducts(list);
      }
    } finally {
      setFetching(false);
    }
  }

  function logout() {
    localStorage.removeItem("snv.admin.accessToken");
    router.replace("/login");
  }

  function handleNameChange(val: string) {
    setName(val);
    if (!editingId) {
      setSlug(slugify(val));
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function openEditModal(prod: ProductRow) {
    setEditingId(prod.id);
    setName(prod.name);
    setSlug(prod.slug);
    setType(prod.type || "sticker");
    setCollection(prod.collection || "Anime");
    setPriceRupees((prod.price_cents / 100).toString());
    setCompareAtRupees(prod.compare_at_cents ? (prod.compare_at_cents / 100).toString() : "");
    setStock((prod.stock ?? 0).toString());
    setImageUrl(prod.image_url || "");
    setDescription(prod.description || "");
    setIsFeatured(Boolean(prod.is_featured));
    setCustomizable(Boolean(prod.customizable));
    setProductStatus(prod.status || "active");
    setSelectedTags(prod.tags || []);
    setShowAddForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setSlug("");
    setType("sticker");
    setCollection("Anime");
    setPriceRupees("199");
    setCompareAtRupees("");
    setStock("50");
    setImageUrl("");
    setDescription("");
    setIsFeatured(false);
    setCustomizable(false);
    setProductStatus("active");
    setSelectedTags(["new"]);
    setFormErr(null);
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormErr(null);
    setFormSuccess(null);

    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const price_cents = Math.round(parseFloat(priceRupees || "0") * 100);
      const compare_at_cents = compareAtRupees
        ? Math.round(parseFloat(compareAtRupees) * 100)
        : null;

      const payload = {
        id: editingId || undefined,
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        type,
        collection: collection.trim(),
        price_cents,
        compare_at_cents,
        stock: parseInt(stock, 10) || 0,
        image_url: imageUrl.trim() || null,
        description: description.trim() || null,
        is_featured: isFeatured,
        customizable,
        tags: selectedTags,
        status: productStatus,
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setFormErr(json?.error ?? "Failed to save product");
        return;
      }

      setFormSuccess(`✓ Successfully saved product: "${json.data.name}"`);
      setShowAddForm(false);
      resetForm();
      void loadAll();
    } catch {
      setFormErr("Network error while saving product");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProduct(id: string, prodName: string) {
    if (!confirm(`Are you sure you want to delete "${prodName}"?`)) return;

    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();

      if (res.ok && json.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert(json?.error ?? "Failed to delete product");
      }
    } catch {
      alert("Error connecting to server to delete product");
    }
  }

  // Export CSV Functionality
  function handleExportCSV() {
    const headers = ["ID", "Name", "Slug", "Type", "Collection", "Price_INR", "Stock", "Status", "Featured", "Image_URL"];
    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.slug,
      p.type,
      `"${(p.collection || "").replace(/"/g, '""')}"`,
      (p.price_cents / 100).toFixed(2),
      p.stock,
      p.status || "active",
      p.is_featured ? "Yes" : "No",
      `"${(p.image_url || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stix_n_vibes_products_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Import CSV Trigger
  function handleImportCSVClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert("CSV file is empty or missing data rows.");
        return;
      }

      let successCount = 0;
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.replace(/^"|"$/g, "").trim());
        if (parts.length >= 3) {
          const prodName = parts[0] || `Product ${i}`;
          const prodSlug = parts[1] || slugify(prodName);
          const prodType = parts[2] || "sticker";
          const priceNum = parseFloat(parts[3] || "199");
          const stockNum = parseInt(parts[4] || "50", 10);
          const img = parts[5] || null;

          try {
            const res = await fetch("/api/admin/products", {
              method: "POST",
              headers,
              body: JSON.stringify({
                name: prodName,
                slug: prodSlug,
                type: prodType,
                price_cents: Math.round(priceNum * 100),
                stock: stockNum,
                image_url: img,
              }),
            });
            if (res.ok) successCount++;
          } catch {
            // ignore row error
          }
        }
      }

      alert(`Imported ${successCount} products successfully!`);
      void loadAll();
    };
    reader.readAsText(file);
  }

  // Filter Logic
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      // 1. Search Query
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.collection && p.collection.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Status Filter
      const pStatus = p.status || "active";
      const matchesStatus = statusFilter === "all" || pStatus === statusFilter;

      // 3. Category / Type Filter
      const matchesCategory = categoryFilter === "all" || p.type === categoryFilter;

      // 4. Stock Filter
      let matchesStock = true;
      if (stockFilter === "in_stock") matchesStock = p.stock > 5;
      else if (stockFilter === "low_stock") matchesStock = p.stock > 0 && p.stock <= 5;
      else if (stockFilter === "out_of_stock") matchesStock = p.stock <= 0;

      // 5. Collection Filter
      let matchesCollection = true;
      if (selectedCollection) {
        matchesCollection = p.collection?.toLowerCase() === selectedCollection.toLowerCase();
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesStock && matchesCollection;
    });
  }, [products, searchQuery, statusFilter, categoryFilter, stockFilter, selectedCollection]);

  type CategoryAgg = { key: string; count: number; featured: number };
  const categoryAgg: CategoryAgg[] = React.useMemo(() => {
    const m = new Map<string, CategoryAgg>();
    for (const p of products) {
      const key = (p.collection || p.type || "Other") as string;
      const prev = m.get(key) ?? { key, count: 0, featured: 0 };
      prev.count += 1;
      if (p.is_featured) prev.featured += 1;
      m.set(key, prev);
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [products]);

  const topCategories = categoryAgg.slice(0, 5);
  const totalCatalog = categoryAgg.reduce((s, c) => s + c.count, 0) || 1;
  const lowStock = products.filter(
    (p) => typeof p.stock === "number" && p.stock > 0 && p.stock <= 5
  ).slice(0, 6);
  const outOfStock = products.filter(
    (p) => typeof p.stock === "number" && p.stock <= 0
  ).length;

  if (loading) {
    return (
      <Container className="grid min-h-[80vh] place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading admin dashboard...
        </div>
      </Container>
    );
  }
  if (!authed) return null;

  const totalSalesRupees =
    orders.reduce(
      (s, o) =>
        s +
        (o.status === "paid" || o.status === "confirmed"
          ? Number(o.total_cents) || 0
          : 0),
      0
    ) / 100;
  const aov = orders.length
    ? totalSalesRupees /
      orders.filter((o) => o.status === "paid" || o.status === "confirmed").length
    : 0;

  function fmt(cents: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  return (
    <Container className="py-10">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Package className="size-8 text-brand-yellow" /> Products
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage catalog items, pricing, inventory levels, and collection tags
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="gradient"
            size="sm"
            onClick={() => {
              resetForm();
              setShowAddForm((v) => !v);
            }}
          >
            {showAddForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showAddForm ? "Close Form" : "+ New Product"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleImportCSVClick}
          >
            <Upload className="size-4 text-brand-orange" /> Import CSV
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
          >
            <FileSpreadsheet className="size-4 text-brand-purple" /> Export
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadAll()}
            disabled={fetching}
            title="Refresh Catalog"
          >
            {fetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>

          <Button variant="ghost" size="sm" onClick={logout} title="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      {formSuccess && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-400">
          {formSuccess}
        </div>
      )}

      {/* Add / Edit Product Form Panel */}
      {showAddForm && (
        <Card className="mt-6 border-brand-yellow/40 bg-slate-950/90 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                {editingId ? <Edit2 className="size-5 text-brand-yellow" /> : <Plus className="size-5 text-brand-yellow" />}
                {editingId ? `Edit Product (ID: ${editingId})` : "Add New Catalog Product"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                <X className="size-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProduct} className="space-y-4">
              {formErr && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                  {formErr}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Product Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Cyberpunk Anime Sticker"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    URL Slug *
                  </label>
                  <Input
                    required
                    placeholder="cyberpunk-anime-sticker"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category / Type
                  </label>
                  <select
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Collection
                  </label>
                  <Input
                    placeholder="e.g. Anime, Gaming, Formula 1"
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Stock Quantity
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="50"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </label>
                  <select
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium"
                    value={productStatus}
                    onChange={(e) => setProductStatus(e.target.value as "active" | "draft" | "archived")}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Price (₹ INR) *
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="199"
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Compare-At Original Price (₹ INR)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="299"
                    value={compareAtRupees}
                    onChange={(e) => setCompareAtRupees(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary Image URL (Cloudinary / Unsplash / Storage)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://images.unsplash.com/photo-..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  {imageUrl && (
                    <div className="size-10 shrink-0 overflow-hidden rounded-xl border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="size-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <textarea
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                  rows={2}
                  placeholder="High quality waterproof vinyl sticker..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Tags Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Badges & Tags
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                          active
                            ? "bg-brand-yellow text-slate-950 shadow-glow"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {active && <Check className="size-3" />}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Switches */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="size-4 rounded accent-brand-yellow"
                  />
                  Featured SKU on Homepage
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customizable}
                    onChange={(e) => setCustomizable(e.target.checked)}
                    className="size-4 rounded accent-brand-yellow"
                  />
                  Supports Custom Photo Upload
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {editingId ? "Update Product" : "Save Product to Supabase"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* FILTER CONTROL PANEL */}
      <div className="mt-8 rounded-2xl border border-border bg-card/60 p-5 shadow-soft space-y-4">
        {/* Row 1: Search & Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Products... */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Search Products..."
              className="pl-10 h-10 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Category:</span>
            <select
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Stock:</span>
            <select
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
            >
              <option value="all">All Stock</option>
              <option value="in_stock">In Stock (&gt; 5)</option>
              <option value="low_stock">Low Stock (1–5)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase mr-1">Status:</span>
            {(["all", "active", "draft", "archived"] as const).map((st) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                    active
                      ? "bg-brand-yellow text-slate-950 shadow-soft"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {/* Row 3: Collections Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase mr-1 flex items-center gap-1">
              <Filter className="size-3" /> Collections:
            </span>
            {selectedCollection && (
              <button
                type="button"
                onClick={() => setSelectedCollection(null)}
                className="rounded-full bg-brand-yellow/20 border border-brand-yellow/40 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow hover:bg-brand-yellow/30"
              >
                Clear ({selectedCollection}) ✕
              </button>
            )}
            {COLLECTIONS.map((col) => {
              const active = selectedCollection?.toLowerCase() === col.toLowerCase();
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() =>
                    setSelectedCollection(active ? null : col)
                  }
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-brand-yellow text-slate-950 font-semibold"
                      : "bg-secondary/40 text-muted-foreground border border-border/60 hover:bg-secondary"
                  }`}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between py-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            Product List ({filteredProducts.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredProducts.length === 0 ? (
            <EmptyState text="No products match your selected status, category, stock, or collection filter." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Image</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Collection</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Featured</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.map((p) => {
                    const status = p.status || "active";
                    return (
                      <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                        {/* Image */}
                        <td className="py-3 px-4">
                          {p.image_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="size-11 rounded-lg object-cover border border-border"
                            />
                          ) : (
                            <div className="grid size-11 place-items-center rounded-lg bg-secondary text-muted-foreground border border-border">
                              <ImageIcon className="size-4" />
                            </div>
                          )}
                        </td>

                        {/* Name & Slug */}
                        <td className="py-3 px-4">
                          <p className="font-semibold leading-tight">{p.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.slug}</p>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <Badge variant="outline" size="sm" className="capitalize">
                            {p.type.replace("_", " ")}
                          </Badge>
                        </td>

                        {/* Collection */}
                        <td className="py-3 px-4 text-xs font-medium text-muted-foreground">
                          {p.collection || "—"}
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4 font-semibold tabular-nums">
                          {fmt(p.price_cents)}
                          {p.compare_at_cents ? (
                            <span className="ml-1.5 text-xs text-muted-foreground line-through font-normal">
                              {fmt(p.compare_at_cents)}
                            </span>
                          ) : null}
                        </td>

                        {/* Stock */}
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              p.stock <= 0
                                ? "accent"
                                : p.stock <= 5
                                ? "accent"
                                : "outline"
                            }
                            size="sm"
                            className={
                              p.stock <= 0
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : p.stock <= 5
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : ""
                            }
                          >
                            {p.stock <= 0 ? "Out of Stock" : p.stock <= 5 ? `${p.stock} Low Stock` : `${p.stock} In Stock`}
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              status === "active"
                                ? "success"
                                : status === "draft"
                                ? "outline"
                                : "accent"
                            }
                            size="sm"
                            className="capitalize"
                          >
                            {status}
                          </Badge>
                        </td>

                        {/* Featured */}
                        <td className="py-3 px-4">
                          {p.is_featured ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-yellow">
                              <Star className="size-3.5 fill-brand-yellow text-brand-yellow" /> Yes
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(p)}
                              title="Edit Product"
                              className="size-8 p-0"
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              title="Delete Product"
                              className="size-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics & Inventory Snapshot */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Top categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4" /> Top categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategories.length === 0 ? (
              <EmptyState text="Category data appears once products are catalogued in Supabase." />
            ) : (
              topCategories.map((c) => {
                const pct = Math.round((c.count / totalCatalog) * 100);
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.key}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {c.count} SKUs · {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-brand-gradient"
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Low stock + exports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4" /> Low stock alerts
              {outOfStock > 0 && (
                <Badge
                  variant="accent"
                  size="sm"
                  className="ml-auto bg-red-500/20 text-red-400 border-red-500/30"
                >
                  {outOfStock} out
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.length === 0 && outOfStock === 0 ? (
              <EmptyState text="All clear — every SKU has more than 5 units in stock." />
            ) : (
              <ul className="divide-y divide-border">
                {lowStock.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <span className="truncate">{p.name}</span>
                    <Badge variant="accent" size="sm">
                      {p.stock} left
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button asChild variant="outline" size="sm">
                <a
                  href="/api/admin/inventory/forecast?days=30&buffer=0.2"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="size-4" /> CSV · 30-day forecast
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a
                  href="/api/admin/inventory/forecast?days=90&buffer=0.3"
                  target="_blank"
                  rel="noreferrer"
                >
                  90-day forecast
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← Back to store
        </Link>
        <span>·</span>
        <span>For full bulk operations use Supabase Studio.</span>
      </div>
    </Container>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid place-items-center p-10 text-center">
      <Sparkles className="size-7 text-muted-foreground/40" />
      <p className="mt-3 max-w-md text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
