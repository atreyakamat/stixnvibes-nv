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
  Eye,
  Copy,
  BarChart3,
  Sliders,
  Globe,
  DollarSign,
  Box,
  FolderTree,
  Tags as TagsIcon,
  Grid,
  History,
  TrendingUp,
  MoreVertical,
  CheckSquare,
  Square,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

// Types
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
  images?: string[];
  tags?: string[];
  description?: string | null;
  status?: "active" | "draft" | "archived" | "scheduled";
  metadata?: {
    cost_cents?: number;
    sku?: string | null;
    barcode?: string | null;
    min_stock?: number;
    max_stock?: number;
    warehouse_location?: string | null;
    supplier?: string | null;
    gst_rate?: number;
    allow_backorders?: boolean;
    seo_title?: string | null;
    seo_description?: string | null;
  };
};

type InventoryLog = {
  id: string;
  productId: string;
  productName: string;
  change: number;
  reason: string;
  previousStock: number;
  newStock: number;
  notes?: string | null;
  timestamp: string;
};

const PRODUCT_TYPES = [
  { label: "Sticker (Normal)", value: "sticker" },
  { label: "Sticker (Vinyl)", value: "sticker_vinyl" },
  { label: "Poster", value: "poster" },
  { label: "Spotify Card", value: "spotify_card" },
  { label: "Frame", value: "frame" },
  { label: "Mystery Pack", value: "mystery_pack" },
];

const DEFAULT_COLLECTIONS = ["Anime", "Gaming", "Formula 1", "Movies", "Minimal", "Nature", "Marvel", "Cyberpunk", "Quotes"];

const REUSABLE_TAGS = [
  { name: "Anime", category: "Genre", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { name: "Gaming", category: "Genre", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  { name: "Premium", category: "Quality", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { name: "Waterproof", category: "Feature", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { name: "Laptop", category: "Use Case", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { name: "Best Seller", category: "Trending", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { name: "New Arrival", category: "Trending", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  { name: "Limited Edition", category: "Scarcity", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  { name: "Customizable", category: "Feature", color: "bg-brand-yellow/20 text-brand-yellow border-brand-yellow/30" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fmt(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [inventoryLogs, setInventoryLogs] = React.useState<InventoryLog[]>([]);
  const [fetching, setFetching] = React.useState(false);

  // Active PIM Navigation Tab
  const [activeTab, setActiveTab] = React.useState<
    "products" | "wizard" | "inventory" | "categories" | "collections" | "tags" | "media" | "analytics"
  >("products");

  // Filters State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "draft" | "archived">("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [stockFilter, setStockFilter] = React.useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [selectedCollectionFilter, setSelectedCollectionFilter] = React.useState<string | null>(null);

  // Bulk Operations State
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([]);
  const [bulkActioning, setBulkActioning] = React.useState(false);

  // Quick Stock Adjustment Modal State
  const [adjustingProduct, setAdjustingProduct] = React.useState<ProductRow | null>(null);
  const [stockChangeVal, setStockChangeVal] = React.useState<number>(10);
  const [stockReason, setStockReason] = React.useState<string>("Purchase / Restock");
  const [stockNotes, setStockNotes] = React.useState<string>("");
  const [adjustingLoading, setAdjustingLoading] = React.useState(false);

  // Wizard Step State (1 to 8)
  const [wizardStep, setWizardStep] = React.useState<number>(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [formErr, setFormErr] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState<string | null>(null);

  // Wizard Fields
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [autoSlugLocked, setAutoSlugLocked] = React.useState(true);
  const [description, setDescription] = React.useState("");
  const [shortDesc, setShortDesc] = React.useState("");
  const [type, setType] = React.useState("sticker");

  // Step 2: Organization
  const [collection, setCollection] = React.useState("Anime");
  const [brand, setBrand] = React.useState("Stix N Vibes Originals");
  const [tags, setTags] = React.useState<string[]>(["New Arrival"]);

  // Step 3: Pricing
  const [sellingPrice, setSellingPrice] = React.useState("199");
  const [comparePrice, setComparePrice] = React.useState("299");
  const [costPrice, setCostPrice] = React.useState("65");
  const [gstRate, setGstRate] = React.useState("18");

  // Step 4: Inventory
  const [sku, setSku] = React.useState("");
  const [barcode, setBarcode] = React.useState("");
  const [stock, setStock] = React.useState("50");
  const [minStock, setMinStock] = React.useState("5");
  const [maxStock, setMaxStock] = React.useState("200");
  const [warehouseLoc, setWarehouseLoc] = React.useState("Shelf A-12");
  const [allowBackorders, setAllowBackorders] = React.useState(false);

  // Step 5: Images
  const [imageUrl, setImageUrl] = React.useState("");
  const [imagesList, setImagesList] = React.useState<string[]>([]);
  const [altText, setAltText] = React.useState("");

  // Step 6: Customization
  const [customizable, setCustomizable] = React.useState(false);
  const [maxUploadMb, setMaxUploadMb] = React.useState("10");

  // Step 7: SEO
  const [seoTitle, setSeoTitle] = React.useState("");
  const [seoDescription, setSeoDescription] = React.useState("");

  // Step 8: Publishing
  const [productStatus, setProductStatus] = React.useState<"active" | "draft" | "archived" | "scheduled">("active");
  const [isFeatured, setIsFeatured] = React.useState(false);

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
      const [o, p, inv] = await Promise.all([
        fetch("/api/admin/orders", { headers }).then((r) => r.json()),
        fetch("/api/admin/products", { headers }).then((r) => r.json()),
        fetch("/api/admin/inventory", { headers }).then((r) => r.json()),
      ]);

      if (o?.ok) setOrders((o.data ?? []) as OrderRow[]);
      if (p?.ok) {
        const list = (p.data ?? []).map((prod: ProductRow) => ({
          ...prod,
          status: prod.status ?? "active",
        }));
        setProducts(list);
      }
      if (inv?.ok) setInventoryLogs((inv.logs ?? []) as InventoryLog[]);
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
    if (autoSlugLocked) {
      const s = slugify(val);
      setSlug(s);
      if (!sku) setSku(`STX-${s.slice(0, 8).toUpperCase()}`);
    }
  }

  function openWizardForEdit(prod: ProductRow) {
    setEditingId(prod.id);
    setName(prod.name);
    setSlug(prod.slug);
    setAutoSlugLocked(false);
    setDescription(prod.description || "");
    setType(prod.type || "sticker");
    setCollection(prod.collection || "Anime");
    setSellingPrice((prod.price_cents / 100).toString());
    setComparePrice(prod.compare_at_cents ? (prod.compare_at_cents / 100).toString() : "");
    setStock((prod.stock ?? 0).toString());
    setImageUrl(prod.image_url || "");
    setImagesList(prod.images || (prod.image_url ? [prod.image_url] : []));
    setIsFeatured(Boolean(prod.is_featured));
    setCustomizable(Boolean(prod.customizable));
    setProductStatus(prod.status || "active");
    setTags(prod.tags || ["New Arrival"]);

    if (prod.metadata) {
      setCostPrice(((prod.metadata.cost_cents || 0) / 100).toString());
      setSku(prod.metadata.sku || `STX-${prod.slug.slice(0, 8).toUpperCase()}`);
      setBarcode(prod.metadata.barcode || "");
      setMinStock((prod.metadata.min_stock || 5).toString());
      setMaxStock((prod.metadata.max_stock || 200).toString());
      setWarehouseLoc(prod.metadata.warehouse_location || "Shelf A-12");
      setAllowBackorders(Boolean(prod.metadata.allow_backorders));
      setSeoTitle(prod.metadata.seo_title || prod.name);
      setSeoDescription(prod.metadata.seo_description || prod.description || "");
    }

    setWizardStep(1);
    setActiveTab("wizard");
  }

  function resetWizard() {
    setEditingId(null);
    setName("");
    setSlug("");
    setAutoSlugLocked(true);
    setDescription("");
    setShortDesc("");
    setType("sticker");
    setCollection("Anime");
    setBrand("Stix N Vibes Originals");
    setTags(["New Arrival"]);
    setSellingPrice("199");
    setComparePrice("299");
    setCostPrice("65");
    setGstRate("18");
    setSku("");
    setBarcode("");
    setStock("50");
    setMinStock("5");
    setMaxStock("200");
    setWarehouseLoc("Shelf A-12");
    setAllowBackorders(false);
    setImageUrl("");
    setImagesList([]);
    setAltText("");
    setCustomizable(false);
    setMaxUploadMb("10");
    setSeoTitle("");
    setSeoDescription("");
    setProductStatus("active");
    setIsFeatured(false);
    setWizardStep(1);
    setFormErr(null);
  }

  async function handleSaveWizardProduct() {
    setSubmitting(true);
    setFormErr(null);
    setFormSuccess(null);

    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const price_cents = Math.round(parseFloat(sellingPrice || "0") * 100);
      const compare_at_cents = comparePrice ? Math.round(parseFloat(comparePrice) * 100) : null;
      const cost_cents = Math.round(parseFloat(costPrice || "0") * 100);

      const finalImages = [...imagesList];
      if (imageUrl && !finalImages.includes(imageUrl)) finalImages.unshift(imageUrl);

      const payload = {
        id: editingId || undefined,
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        type,
        collection: collection.trim(),
        price_cents,
        compare_at_cents,
        cost_cents,
        stock: parseInt(stock, 10) || 0,
        min_stock: parseInt(minStock, 10) || 5,
        max_stock: parseInt(maxStock, 10) || 200,
        sku: sku.trim() || `STX-${slugify(name).slice(0, 8).toUpperCase()}`,
        barcode: barcode.trim() || null,
        warehouse_location: warehouseLoc.trim() || null,
        allow_backorders: allowBackorders,
        image_url: finalImages[0] || imageUrl.trim() || null,
        images: finalImages,
        description: description.trim() || null,
        is_featured: isFeatured,
        customizable,
        tags,
        status: productStatus,
        seo_title: seoTitle.trim() || name.trim(),
        seo_description: seoDescription.trim() || description.trim(),
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

      setFormSuccess(`✓ Successfully published product: "${json.data.name}"`);
      setActiveTab("products");
      resetWizard();
      void loadAll();
    } catch {
      setFormErr("Network error while saving product");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProduct(id: string, prodName: string) {
    if (!confirm(`Are you sure you want to archive and delete "${prodName}"?`)) return;

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

  // Quick Stock Adjustment Handler
  async function handleQuickStockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustingProduct) return;
    setAdjustingLoading(true);

    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers,
        body: JSON.stringify({
          productId: adjustingProduct.id,
          change: stockChangeVal,
          reason: stockReason,
          notes: stockNotes,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === adjustingProduct.id ? { ...p, stock: json.newStock } : p))
        );
        if (json.log) setInventoryLogs((prev) => [json.log, ...prev]);
        setAdjustingProduct(null);
      } else {
        alert(json?.error ?? "Failed to update stock");
      }
    } catch {
      alert("Network error updating inventory");
    } finally {
      setAdjustingLoading(false);
    }
  }

  // Bulk Operations
  function toggleSelectProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  }

  async function handleBulkAction(action: "delete" | "archive" | "active" | "export") {
    if (selectedProductIds.length === 0) return;

    if (action === "export") {
      const targetProducts = products.filter((p) => selectedProductIds.includes(p.id));
      exportCSVForList(targetProducts);
      return;
    }

    if (!confirm(`Apply bulk action "${action}" to ${selectedProductIds.length} selected items?`)) return;
    setBulkActioning(true);

    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const bodyPayload =
        action === "delete"
          ? { bulkAction: "delete", ids: selectedProductIds }
          : { bulkAction: "update_status", ids: selectedProductIds, status: action === "archive" ? "archived" : "active" };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setSelectedProductIds([]);
        void loadAll();
      } else {
        alert(json?.error ?? "Bulk operation failed");
      }
    } catch {
      alert("Error processing bulk operation");
    } finally {
      setBulkActioning(false);
    }
  }

  function exportCSVForList(list: ProductRow[]) {
    const headers = ["ID", "Name", "Slug", "Type", "Collection", "Price_INR", "Stock", "Status", "Featured", "Image_URL"];
    const rows = list.map((p) => [
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
    link.setAttribute("download", `stix_n_vibes_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filter Logic
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.collection && p.collection.toLowerCase().includes(searchQuery.toLowerCase()));

      const pStatus = p.status || "active";
      const matchesStatus = statusFilter === "all" || pStatus === statusFilter;
      const matchesCategory = categoryFilter === "all" || p.type === categoryFilter;

      let matchesStock = true;
      if (stockFilter === "in_stock") matchesStock = p.stock > 5;
      else if (stockFilter === "low_stock") matchesStock = p.stock > 0 && p.stock <= 5;
      else if (stockFilter === "out_of_stock") matchesStock = p.stock <= 0;

      let matchesCollection = true;
      if (selectedCollectionFilter) {
        matchesCollection = p.collection?.toLowerCase() === selectedCollectionFilter.toLowerCase();
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesStock && matchesCollection;
    });
  }, [products, searchQuery, statusFilter, categoryFilter, stockFilter, selectedCollectionFilter]);

  // Financial Calculations for Pricing Step
  const sellNum = parseFloat(sellingPrice || "0");
  const costNum = parseFloat(costPrice || "0");
  const profitMarginRupees = sellNum - costNum;
  const marginPct = sellNum > 0 ? Math.round((profitMarginRupees / sellNum) * 100) : 0;

  // Sales Analytics Metrics
  const totalSalesRupees =
    orders.reduce(
      (s, o) =>
        s +
        (o.status === "paid" || o.status === "confirmed"
          ? Number(o.total_cents) || 0
          : 0),
      0
    ) / 100;
  const paidOrdersCount = orders.filter(
    (o) => o.status === "paid" || o.status === "confirmed"
  ).length;
  const aov = paidOrdersCount > 0 ? totalSalesRupees / paidOrdersCount : 0;

  if (loading) {
    return (
      <Container className="grid min-h-[80vh] place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
          <Loader2 className="size-5 animate-spin text-brand-yellow" /> Loading Stix N Vibes PIM Platform...
        </div>
      </Container>
    );
  }
  if (!authed) return null;

  return (
    <Container className="py-8">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Package className="size-8 text-brand-yellow" /> Product Information Management (PIM)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete lifecycle management: Catalog, Warehousing, Pricing, Media & SEO
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="gradient"
            size="sm"
            onClick={() => {
              resetWizard();
              setActiveTab("wizard");
            }}
          >
            <Plus className="size-4" /> + New Product
          </Button>

          <Button variant="outline" size="sm" onClick={() => setActiveTab("inventory")}>
            <Box className="size-4 text-brand-orange" /> Stock Adjustments
          </Button>

          <Button variant="ghost" size="sm" onClick={() => void loadAll()} disabled={fetching} title="Refresh PIM Data">
            {fetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
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

      {/* PIM Navigation Sub-Header Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { id: "products", label: "Products Catalog", icon: <Package className="size-4" /> },
          { id: "wizard", label: editingId ? "Edit Product Wizard" : "Product Creator Wizard", icon: <Sliders className="size-4" /> },
          { id: "inventory", label: "Inventory & Warehousing", icon: <Box className="size-4" /> },
          { id: "categories", label: "Categories", icon: <FolderTree className="size-4" /> },
          { id: "collections", label: "Collections", icon: <Grid className="size-4" /> },
          { id: "tags", label: "Tag Manager", icon: <TagsIcon className="size-4" /> },
          { id: "media", label: "Media Library", icon: <ImageIcon className="size-4" /> },
          { id: "analytics", label: "Product Analytics", icon: <BarChart3 className="size-4" /> },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                active
                  ? "bg-brand-yellow text-slate-950 shadow-soft"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: PRODUCTS CATALOG DASHBOARD & TABLE */}
      {/* ============================================================ */}
      {activeTab === "products" && (
        <div className="mt-6 space-y-6">
          {/* Filter Matrix Box */}
          <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-soft space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search Products by Name, SKU, or Slug..."
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

            {/* Status Filter Tabs & Collections Badges */}
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

              {/* Collections Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase mr-1 flex items-center gap-1">
                  <Filter className="size-3" /> Collections:
                </span>
                {selectedCollectionFilter && (
                  <button
                    type="button"
                    onClick={() => setSelectedCollectionFilter(null)}
                    className="rounded-full bg-brand-yellow/20 border border-brand-yellow/40 px-2.5 py-0.5 text-xs font-semibold text-brand-yellow hover:bg-brand-yellow/30"
                  >
                    Clear ({selectedCollectionFilter}) ✕
                  </button>
                )}
                {DEFAULT_COLLECTIONS.slice(0, 6).map((col) => {
                  const active = selectedCollectionFilter?.toLowerCase() === col.toLowerCase();
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedCollectionFilter(active ? null : col)}
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

          {/* Bulk Actions Toolbar */}
          {selectedProductIds.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-brand-yellow/40 bg-slate-900/90 px-4 py-3 text-xs font-semibold shadow-glow animate-in fade-in">
              <span className="text-brand-yellow flex items-center gap-2">
                <CheckSquare className="size-4" /> {selectedProductIds.length} product(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("active")}
                  disabled={bulkActioning}
                >
                  Set Active
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("archive")}
                  disabled={bulkActioning}
                >
                  Archive Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("export")}
                >
                  Export CSV
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction("delete")}
                  disabled={bulkActioning}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {/* Catalog Data Table */}
          <Card>
            <CardHeader className="flex items-center justify-between py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Product Catalog ({filteredProducts.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredProducts.length === 0 ? (
                <EmptyState text="No products match your selected search or status filters." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="py-3 px-4">
                          <button type="button" onClick={toggleSelectAll}>
                            {selectedProductIds.length === filteredProducts.length ? (
                              <CheckSquare className="size-4 text-brand-yellow" />
                            ) : (
                              <Square className="size-4 text-muted-foreground" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-4">Image</th>
                        <th className="py-3 px-4">Name &amp; Slug</th>
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
                        const selected = selectedProductIds.includes(p.id);
                        return (
                          <tr key={p.id} className={`hover:bg-secondary/20 transition-colors ${selected ? "bg-brand-yellow/5" : ""}`}>
                            <td className="py-3 px-4">
                              <button type="button" onClick={() => toggleSelectProduct(p.id)}>
                                {selected ? (
                                  <CheckSquare className="size-4 text-brand-yellow" />
                                ) : (
                                  <Square className="size-4 text-muted-foreground" />
                                )}
                              </button>
                            </td>

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
                              <button
                                type="button"
                                onClick={() => {
                                  setAdjustingProduct(p);
                                  setStockChangeVal(10);
                                }}
                                className="group flex items-center gap-1.5"
                                title="Click to adjust stock"
                              >
                                <Badge
                                  variant={p.stock <= 0 ? "accent" : p.stock <= 5 ? "accent" : "outline"}
                                  size="sm"
                                  className={
                                    p.stock <= 0
                                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                                      : p.stock <= 5
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                      : "group-hover:border-brand-yellow"
                                  }
                                >
                                  {p.stock <= 0 ? "Out of Stock" : p.stock <= 5 ? `${p.stock} Low Stock` : `${p.stock} In Stock`}
                                </Badge>
                              </button>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4">
                              <Badge
                                variant={status === "active" ? "success" : status === "draft" ? "outline" : "accent"}
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

                            {/* Row Action Menu */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/shop/${p.slug}`}
                                  target="_blank"
                                  className="grid size-8 place-items-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                                  title="👁 Preview Product Page"
                                >
                                  <Eye className="size-4" />
                                </Link>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openWizardForEdit(p)}
                                  title="✏ Edit in Wizard"
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
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: STEP-BY-STEP ADD / EDIT PRODUCT WIZARD */}
      {/* ============================================================ */}
      {activeTab === "wizard" && (
        <Card className="mt-6 border-brand-yellow/40 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Sliders className="size-6 text-brand-yellow" />
                  {editingId ? `Editing Product: "${name}"` : "Step-by-Step Product Creator Wizard"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Follow the 8-step wizard to configure info, taxonomy, pricing, warehousing, media, customizer, SEO &amp; publishing.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("products")}>
                <X className="size-4" /> Close Wizard
              </Button>
            </div>

            {/* Wizard Step Progress Tracker */}
            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 overflow-x-auto">
              {[
                { step: 1, name: "Basic Info" },
                { step: 2, name: "Taxonomy" },
                { step: 3, name: "Pricing" },
                { step: 4, name: "Inventory" },
                { step: 5, name: "Media" },
                { step: 6, name: "Customizer" },
                { step: 7, name: "SEO" },
                { step: 8, name: "Publish" },
              ].map((s) => {
                const isCurrent = wizardStep === s.step;
                const isDone = wizardStep > s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setWizardStep(s.step)}
                    className="flex flex-col items-center gap-1 px-3 min-w-[75px]"
                  >
                    <div
                      className={`grid size-7 place-items-center rounded-full text-xs font-bold transition-all ${
                        isCurrent
                          ? "bg-brand-yellow text-slate-950 shadow-glow"
                          : isDone
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-secondary text-muted-foreground border border-border"
                      }`}
                    >
                      {isDone ? "✓" : s.step}
                    </div>
                    <span className={`text-[11px] font-semibold whitespace-nowrap ${isCurrent ? "text-brand-yellow" : "text-muted-foreground"}`}>
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="py-6">
            {formErr && (
              <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                {formErr}
              </div>
            )}

            {/* WIZARD STEP 1: BASIC INFORMATION */}
            {wizardStep === 1 && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-base font-bold text-brand-yellow flex items-center gap-2">Step 1: Basic Information</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Name *</label>
                    <Input
                      required
                      placeholder="e.g. Cyberpunk Vinyl Sticker Pack"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL Slug *</label>
                      <button
                        type="button"
                        onClick={() => setAutoSlugLocked((v) => !v)}
                        className="text-[11px] text-brand-yellow hover:underline"
                      >
                        {autoSlugLocked ? "🔒 Auto-locked" : "🔓 Editing unlocked"}
                      </button>
                    </div>
                    <Input
                      required
                      placeholder="cyberpunk-vinyl-sticker-pack"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      disabled={autoSlugLocked}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Type *</label>
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
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Short Summary</label>
                    <Input
                      placeholder="12-piece waterproof vinyl sticker pack for laptops & helmets"
                      value={shortDesc}
                      onChange={(e) => setShortDesc(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Description</label>
                  <textarea
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                    rows={4}
                    placeholder="Write complete product specifications, material quality, UV-resistance..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* WIZARD STEP 2: TAXONOMY & ORGANIZATION */}
            {wizardStep === 2 && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-base font-bold text-brand-yellow flex items-center gap-2">Step 2: Organization &amp; Taxonomy</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Curated Collection</label>
                    <Input
                      placeholder="e.g. Anime, Gaming, Formula 1, Marvel"
                      value={collection}
                      onChange={(e) => setCollection(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand / Studio</label>
                    <Input
                      placeholder="Stix N Vibes Originals"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reusable Tags &amp; Badges</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {REUSABLE_TAGS.map((t) => {
                      const active = tags.includes(t.name);
                      return (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() =>
                            setTags((prev) => (prev.includes(t.name) ? prev.filter((i) => i !== t.name) : [...prev, t.name]))
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                            active
                              ? `${t.color} ring-2 ring-brand-yellow`
                              : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {active && <Check className="size-3" />}
                          {t.name}
                          <span className="text-[10px] opacity-60">({t.category})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* WIZARD STEP 3: PRICING & MARGINS */}
            {wizardStep === 3 && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-base font-bold text-brand-yellow flex items-center gap-2">Step 3: Pricing &amp; Profit Margins</h3>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selling Price (₹ INR) *</label>
                    <Input
                      type="number"
                      required
                      placeholder="199"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compare-At Price (₹ INR)</label>
                    <Input
                      type="number"
                      placeholder="299"
                      value={comparePrice}
                      onChange={(e) => setComparePrice(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost Price (₹ INR)</label>
                    <Input
                      type="number"
                      placeholder="65"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Profit Margin Calculator */}
                <div className="rounded-xl border border-border bg-secondary/30 p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profit &amp; Margin Calculation</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      Profit: ₹{profitMarginRupees > 0 ? profitMarginRupees.toFixed(2) : "0.00"} per unit
                    </p>
                  </div>
                  <Badge variant={marginPct >= 50 ? "success" : "outline"} size="sm">
                    Margin: {marginPct}%
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GST Rate (%)</label>
                    <Input
                      type="number"
                      placeholder="18"
                      value={gstRate}
                      onChange={(e) => setGstRate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* WIZARD STEP 4: INVENTORY & WAREHOUSING */}
            {wizardStep === 4 && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-base font-bold text-brand-yellow flex items-center gap-2">Step 4: Inventory &amp; Warehousing</h3>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SKU Code *</label>
                    <Input
                      placeholder="STX-ANM-001"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Barcode / EAN</label>
                    <Input
                      placeholder="8901234567890"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Warehouse Shelf</label>
                    <Input
                      placeholder="Shelf A-12"
                      value={warehouseLoc}
                      onChange={(e) => setWarehouseLoc(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Stock</label>
                    <Input
                      type="number"
                      placeholder="50"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Low Stock Alert Min</label>
                    <Input
                      type="number"
                      placeholder="5"
                      value={minStock}
                      onChange={(e) => setMinStock(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Stock Target</label>
                    <Input
                      type="number"
                      placeholder="200"
                      value={maxStock}
                      onChange={(e) => setMaxStock(e.target.value)}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowBackorders}
                    onChange={(e) => setAllowBackorders(e.target.checked)}
                    className="size-4 rounded accent-brand-yellow"
                  />
                  Allow Backorders when stock drops to 0
                </label>
              </div>
            )}

            {/* WIZARD STEP 5: MEDIA & IMAGES */}
            {wizardStep === 5 && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-base font-bold text-brand-yellow flex items-center gap-2">Step 5: Media &amp; Product Images</h3>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Image URL</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://images.unsplash.com/photo-..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (imageUrl && !imagesList.includes(imageUrl)) {
                          setImagesList((prev) => [...prev, imageUrl]);
                        }
                      }}
                    >
                      + Add to Gallery
                    </Button>
                  </div>
                </div>

                {/* Image Gallery Grid */}
                {imagesList.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gallery Images ({imagesList.length})</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {imagesList.map((url, idx) => (
                        <div key={idx} className="relative group rounded-xl border border-border overflow-hidden bg-background">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Gallery ${idx}`} className="size-28 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImagesList((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="size-3" />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-1 left-1 bg-brand-yellow text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Cover
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WIZARD STEP 6: CUSTOMIZER ENGINE RULES */}
            {wizardStep === 6 && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-base font-bold text-brand-yellow flex items-center gap-2">Step 6: Customizer Engine Rules</h3>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customizable}
                    onChange={(e) => setCustomizable(e.target.checked)}
                    className="size-4 rounded accent-brand-yellow"
                  />
                  Enable 2D Customizer Studio for this Product
                </label>

                {customizable && (
                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Upload Size (MB)</label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={maxUploadMb}
                        onChange={(e) => setMaxUploadMb(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WIZARD STEP 7: SEO & SOCIAL PREVIEW */}
            {wizardStep === 7 && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-base font-bold text-brand-yellow flex items-center gap-2">Step 7: Search Engine Optimization (SEO)</h3>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta Title</label>
                    <span className="text-xs text-muted-foreground">{seoTitle.length} / 60 chars</span>
                  </div>
                  <Input
                    placeholder="Cyberpunk Vinyl Sticker Pack | Stix N Vibes"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta Description</label>
                    <span className="text-xs text-muted-foreground">{seoDescription.length} / 160 chars</span>
                  </div>
                  <textarea
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                    rows={3}
                    placeholder="Buy waterproof vinyl stickers online at Stix N Vibes..."
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                  />
                </div>

                {/* Google Search Snippet Preview */}
                <div className="rounded-xl border border-border bg-slate-900/60 p-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Google Search Preview</p>
                  <p className="text-sm font-semibold text-blue-400 truncate">{seoTitle || name || "Product Title"}</p>
                  <p className="text-xs text-emerald-400 font-mono">https://stixnvibes.com/shop/{slug || "product-slug"}</p>
                  <p className="text-xs text-slate-300 line-clamp-2">{seoDescription || description || "Product description preview snippet..."}</p>
                </div>
              </div>
            )}

            {/* WIZARD STEP 8: PUBLISHING & AVAILABILITY */}
            {wizardStep === 8 && (
              <div className="space-y-4 animate-in fade-in">
                <h3 className="text-base font-bold text-brand-yellow flex items-center gap-2">Step 8: Publishing &amp; Availability</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Publication Status</label>
                    <select
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium"
                      value={productStatus}
                      onChange={(e) => setProductStatus(e.target.value as any)}
                    >
                      <option value="active">Active (Published on Storefront)</option>
                      <option value="draft">Draft (Hidden in Back-Office)</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="size-4 rounded accent-brand-yellow"
                  />
                  Mark as Featured Product on Storefront Hero
                </label>

                {/* Summary Card */}
                <div className="rounded-xl border border-brand-yellow/30 bg-brand-yellow/5 p-4 text-xs space-y-1">
                  <p className="font-bold text-brand-yellow">Ready to Publish!</p>
                  <p className="text-muted-foreground">
                    Name: <strong>{name}</strong> · Price: <strong>₹{sellingPrice}</strong> · Stock: <strong>{stock} units</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer Buttons */}
            <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={wizardStep === 1}
                onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
              >
                <ChevronLeft className="size-4" /> Back
              </Button>

              {wizardStep < 8 ? (
                <Button
                  type="button"
                  variant="gradient"
                  onClick={() => setWizardStep((s) => Math.min(8, s + 1))}
                >
                  Next Step <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="gradient"
                  disabled={submitting}
                  onClick={handleSaveWizardProduct}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {editingId ? "Save Changes" : "Publish Product to Supabase"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* TAB 3: INVENTORY LOGS & QUICK ADJUSTMENT */}
      {/* ============================================================ */}
      {activeTab === "inventory" && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Box className="size-5 text-brand-orange" /> Stock Inventory Logs &amp; Audit History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {inventoryLogs.length === 0 ? (
                <EmptyState text="No inventory stock movements logged yet. Quick stock adjustments will create audit logs." />
              ) : (
                <div className="divide-y divide-border">
                  {inventoryLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 text-sm">
                      <div>
                        <p className="font-semibold">{log.productName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Reason: <span className="text-foreground font-medium">{log.reason}</span> · {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={log.change > 0 ? "success" : "accent"}>
                          {log.change > 0 ? `+${log.change}` : log.change}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {log.previousStock} ➔ <strong>{log.newStock}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in">
          <Card className="w-full max-w-md border-brand-yellow/40 bg-slate-950 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Box className="size-5 text-brand-yellow" /> Adjust Stock: "{adjustingProduct.name}"
                </span>
                <Button variant="ghost" size="sm" onClick={() => setAdjustingProduct(null)}>
                  <X className="size-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleQuickStockSubmit} className="space-y-4">
                <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs flex justify-between">
                  <span>Current Stock: <strong>{adjustingProduct.stock} units</strong></span>
                  <span>New Target: <strong>{Math.max(0, adjustingProduct.stock + stockChangeVal)} units</strong></span>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock Change (+ Add / - Remove)</label>
                  <Input
                    type="number"
                    required
                    placeholder="+10 or -5"
                    value={stockChangeVal}
                    onChange={(e) => setStockChangeVal(parseInt(e.target.value, 10) || 0)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adjustment Reason *</label>
                  <select
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium"
                    value={stockReason}
                    onChange={(e) => setStockReason(e.target.value)}
                  >
                    <option value="Purchase / Restock">Purchase / Restock</option>
                    <option value="Damage / Loss">Damage / Loss</option>
                    <option value="Manual Correction">Manual Correction</option>
                    <option value="Customer Return">Customer Return</option>
                    <option value="Supplier Return">Supplier Return</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes (Optional)</label>
                  <Input
                    placeholder="Received shipment batch #402"
                    value={stockNotes}
                    onChange={(e) => setStockNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button type="button" variant="ghost" onClick={() => setAdjustingProduct(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gradient" disabled={adjustingLoading}>
                    {adjustingLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Save Stock Adjustment Log
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: CATEGORIES MANAGER */}
      {/* ============================================================ */}
      {activeTab === "categories" && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FolderTree className="size-5 text-brand-yellow" /> Category Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {PRODUCT_TYPES.map((cat) => (
                <div key={cat.value} className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="font-semibold">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">Slug: /{cat.value}</p>
                  </div>
                  <Badge variant="outline">
                    {products.filter((p) => p.type === cat.value).length} Products
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: COLLECTIONS MANAGER */}
      {/* ============================================================ */}
      {activeTab === "collections" && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Grid className="size-5 text-brand-purple" /> Collections Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {DEFAULT_COLLECTIONS.map((col) => {
                const count = products.filter((p) => p.collection?.toLowerCase() === col.toLowerCase()).length;
                return (
                  <div key={col} className="rounded-xl border border-border p-4 space-y-2 bg-card/60">
                    <p className="font-bold text-foreground">{col}</p>
                    <p className="text-xs text-muted-foreground">{count} Active Products</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: TAG MANAGER */}
      {/* ============================================================ */}
      {activeTab === "tags" && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TagsIcon className="size-5 text-brand-yellow" /> Reusable Tag Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {REUSABLE_TAGS.map((t) => (
                <div key={t.name} className={`rounded-xl border px-4 py-2 text-xs font-semibold ${t.color}`}>
                  {t.name} <span className="text-[10px] opacity-70">({t.category})</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 7: MEDIA LIBRARY */}
      {/* ============================================================ */}
      {activeTab === "media" && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ImageIcon className="size-5 text-brand-orange" /> Media Library &amp; Asset Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {products
                .filter((p) => p.image_url)
                .map((p) => (
                  <div key={p.id} className="rounded-xl border border-border overflow-hidden bg-background group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image_url!} alt={p.name} className="size-32 w-full object-cover" />
                    <div className="p-2 text-xs">
                      <p className="font-semibold truncate">{p.name}</p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 8: ANALYTICS & REVENUE KPI METRICS */}
      {/* ============================================================ */}
      {activeTab === "analytics" && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard icon={<ShoppingCart className="size-5 text-brand-yellow" />} label="Total Orders" value={orders.length.toLocaleString()} />
            <KpiCard icon={<Sparkles className="size-5 text-brand-orange" />} label="Total Sales" value={fmt(totalSalesRupees * 100)} />
            <KpiCard icon={<Tag className="size-5 text-brand-purple" />} label="AVG Order" value={Number.isFinite(aov) && aov > 0 ? fmt(aov * 100) : "—"} />
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← Back to store
        </Link>
        <span>·</span>
        <span>Stix N Vibes PIM Platform v3.0</span>
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
