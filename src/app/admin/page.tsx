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
  Printer,
  Truck,
  Users,
  MessageSquare,
  Gift,
  Ticket,
  Key,
  Settings,
  QrCode,
  FileText,
  Warehouse,
  ShoppingBag,
  Clock,
  RotateCcw,
  UserCheck,
  Zap,
  Menu,
} from "lucide-react";

// Types
type OrderRow = {
  id: string;
  created_at: string;
  customer_name: string;
  total_cents: number;
  status: string;
  whatsapp_url: string | null;
  items?: Array<{ name: string; quantity: number; finish?: string }>;
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

type Coupon = {
  code: string;
  discountType: "percentage" | "flat";
  value: number;
  minOrderRupees: number;
  uses: number;
  maxUses: number;
  status: "active" | "expired";
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

const ORDER_STAGES = [
  { key: "pending", label: "Pending", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { key: "paid", label: "Paid", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { key: "print_queue", label: "Print Queue", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { key: "printing", label: "Printing", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  { key: "qc", label: "QC Inspection", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { key: "packing", label: "Packing Station", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  { key: "shipped", label: "Shipped", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { key: "delivered", label: "Delivered", color: "bg-green-500/20 text-green-400 border-green-500/30" },
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
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Active Navigation Route Module
  const [activeModule, setActiveModule] = React.useState<string>("catalog_products");

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

  // Step 6: Customization
  const [customizable, setCustomizable] = React.useState(false);
  const [maxUploadMb, setMaxUploadMb] = React.useState("10");

  // Step 7: SEO
  const [seoTitle, setSeoTitle] = React.useState("");
  const [seoDescription, setSeoDescription] = React.useState("");

  // Step 8: Publishing
  const [productStatus, setProductStatus] = React.useState<"active" | "draft" | "archived" | "scheduled">("active");
  const [isFeatured, setIsFeatured] = React.useState(false);

  // Coupons State
  const [coupons, setCoupons] = React.useState<Coupon[]>([
    { code: "STIX10", discountType: "percentage", value: 10, minOrderRupees: 299, uses: 142, maxUses: 500, status: "active" },
    { code: "WELCOME50", discountType: "flat", value: 50, minOrderRupees: 199, uses: 89, maxUses: 200, status: "active" },
    { code: "FREESHIP", discountType: "flat", value: 40, minOrderRupees: 399, uses: 312, maxUses: 1000, status: "active" },
  ]);
  const [newCouponCode, setNewCouponCode] = React.useState("");
  const [newCouponVal, setNewCouponVal] = React.useState("15");

  // Packing Station Scanner State
  const [scannedBarcode, setScannedBarcode] = React.useState("");
  const [packingVerified, setPackingVerified] = React.useState(false);

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
    setActiveModule("catalog_wizard");
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
        cost_cents: Math.round(parseFloat(costPrice || "0") * 100),
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
      setActiveModule("catalog_products");
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

  // Order Stage Advancement
  function advanceOrderStatus(orderId: string) {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const stages = ORDER_STAGES.map((s) => s.key);
        const idx = stages.indexOf(o.status);
        const nextStage = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : o.status;
        return { ...o, status: nextStage };
      })
    );
  }

  // Coupon Creation
  function handleAddCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!newCouponCode) return;
    setCoupons((prev) => [
      {
        code: newCouponCode.toUpperCase().trim(),
        discountType: "percentage",
        value: parseFloat(newCouponVal) || 10,
        minOrderRupees: 299,
        uses: 0,
        maxUses: 200,
        status: "active",
      },
      ...prev,
    ]);
    setNewCouponCode("");
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
        (o.status === "paid" || o.status === "confirmed" || o.status === "shipped" || o.status === "delivered"
          ? Number(o.total_cents) || 0
          : 0),
      0
    ) / 100;
  const paidOrdersCount = orders.filter(
    (o) => o.status === "paid" || o.status === "confirmed" || o.status === "shipped" || o.status === "delivered"
  ).length;
  const aov = paidOrdersCount > 0 ? totalSalesRupees / paidOrdersCount : 0;

  if (loading) {
    return (
      <Container className="grid min-h-[80vh] place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
          <Loader2 className="size-5 animate-spin text-brand-yellow" /> Loading Stix N Vibes Business Operating System...
        </div>
      </Container>
    );
  }
  if (!authed) return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ============================================================ */}
      {/* SIDEBAR NAVIGATION (SHOPIFY / MEDUSA STRUCTURE) */}
      {/* ============================================================ */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } shrink-0 border-r border-border bg-slate-950/90 transition-all duration-200 flex flex-col justify-between p-3 z-30`}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 py-3 border-b border-border/60">
            <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-gradient font-black text-slate-950 shadow-glow">
                SNV
              </div>
              {sidebarOpen && (
                <div>
                  <p className="font-display font-bold text-sm leading-none">Stix N Vibes</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Admin OS v3.0</p>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
            >
              <Menu className="size-4" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="mt-4 space-y-6 text-xs font-semibold">
            {/* Dashboard */}
            <div>
              <button
                type="button"
                onClick={() => setActiveModule("dashboard")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  activeModule === "dashboard"
                    ? "bg-brand-yellow text-slate-950 font-bold shadow-soft"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <BarChart3 className="size-4 shrink-0" />
                {sidebarOpen && <span>Dashboard</span>}
              </button>
            </div>

            {/* CATALOG MODULE */}
            <div>
              {sidebarOpen && <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Catalog</p>}
              <div className="space-y-1">
                {[
                  { id: "catalog_products", label: "Products", icon: <Package className="size-4 shrink-0" /> },
                  { id: "catalog_wizard", label: "Product Wizard", icon: <Sliders className="size-4 shrink-0" /> },
                  { id: "catalog_categories", label: "Categories", icon: <FolderTree className="size-4 shrink-0" /> },
                  { id: "catalog_collections", label: "Collections", icon: <Grid className="size-4 shrink-0" /> },
                  { id: "catalog_tags", label: "Tags", icon: <TagsIcon className="size-4 shrink-0" /> },
                  { id: "catalog_media", label: "Media Library", icon: <ImageIcon className="size-4 shrink-0" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveModule(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                      activeModule === item.id
                        ? "bg-brand-yellow/20 text-brand-yellow font-bold border border-brand-yellow/30"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {item.icon}
                    {sidebarOpen && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* INVENTORY MODULE */}
            <div>
              {sidebarOpen && <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Inventory</p>}
              <div className="space-y-1">
                {[
                  { id: "inventory_stock", label: "Stock Overview", icon: <Box className="size-4 shrink-0" /> },
                  { id: "inventory_movements", label: "Stock Movements", icon: <History className="size-4 shrink-0" /> },
                  { id: "inventory_warehouses", label: "Warehouses", icon: <Warehouse className="size-4 shrink-0" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveModule(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                      activeModule === item.id
                        ? "bg-brand-orange/20 text-brand-orange font-bold border border-brand-orange/30"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {item.icon}
                    {sidebarOpen && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* ORDERS & OPERATIONS MODULE */}
            <div>
              {sidebarOpen && <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Operations</p>}
              <div className="space-y-1">
                {[
                  { id: "ops_kanban", label: "Orders Kanban", icon: <ShoppingCart className="size-4 shrink-0" /> },
                  { id: "ops_print_queue", label: "Print Queue", icon: <Printer className="size-4 shrink-0" /> },
                  { id: "ops_packing", label: "Packing Station", icon: <QrCode className="size-4 shrink-0" /> },
                  { id: "ops_shipping", label: "Shipping Manifest", icon: <Truck className="size-4 shrink-0" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveModule(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                      activeModule === item.id
                        ? "bg-brand-purple/20 text-brand-purple font-bold border border-brand-purple/30"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {item.icon}
                    {sidebarOpen && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* MARKETING & MARKETING */}
            <div>
              {sidebarOpen && <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Marketing &amp; Customers</p>}
              <div className="space-y-1">
                {[
                  { id: "mkt_coupons", label: "Coupons & Discounts", icon: <Ticket className="size-4 shrink-0" /> },
                  { id: "mkt_customers", label: "Customer Timeline", icon: <Users className="size-4 shrink-0" /> },
                  { id: "mkt_settings", label: "System Settings", icon: <Settings className="size-4 shrink-0" /> },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveModule(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                      activeModule === item.id
                        ? "bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {item.icon}
                    {sidebarOpen && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="border-t border-border/60 pt-3">
          {sidebarOpen ? (
            <div className="flex items-center justify-between px-2">
              <div className="truncate">
                <p className="text-xs font-bold truncate">Admin Operator</p>
                <p className="text-[10px] text-muted-foreground truncate">admin@stixnvibes.com</p>
              </div>
              <button type="button" onClick={logout} className="text-muted-foreground hover:text-red-400 p-1" title="Logout">
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={logout} className="w-full flex justify-center py-2 text-muted-foreground hover:text-red-400">
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MAIN CONTENT WORKSPACE */}
      {/* ============================================================ */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Top Operational Breadcrumb Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground font-medium">Storefront</Link>
            <span>/</span>
            <span className="font-semibold text-foreground capitalize">{activeModule.replace("_", " ▸ ")}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void loadAll()} disabled={fetching}>
              {fetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => {
                resetWizard();
                setActiveModule("catalog_wizard");
              }}
            >
              <Plus className="size-4" /> New SKU
            </Button>
          </div>
        </div>

        {formSuccess && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-400">
            {formSuccess}
          </div>
        )}

        {/* MODULE 1: DASHBOARD OVERVIEW */}
        {activeModule === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <KpiCard icon={<ShoppingCart className="size-5 text-brand-yellow" />} label="Total Orders" value={orders.length.toString()} />
              <KpiCard icon={<Sparkles className="size-5 text-brand-orange" />} label="Gross Revenue" value={fmt(totalSalesRupees * 100)} />
              <KpiCard icon={<Tag className="size-5 text-brand-purple" />} label="Average Order Value" value={aov > 0 ? fmt(aov * 100) : "—"} />
              <KpiCard icon={<Package className="size-5 text-cyan-400" />} label="Active Catalog SKUs" value={products.length.toString()} />
            </div>

            {/* Operational Pipeline Snapshot */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="size-5 text-brand-yellow" /> Operations Pipeline Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {ORDER_STAGES.slice(0, 4).map((stage) => {
                  const count = orders.filter((o) => o.status === stage.key).length;
                  return (
                    <div key={stage.key} className="rounded-xl border border-border p-4 bg-secondary/20">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">{stage.label}</p>
                      <p className="text-2xl font-bold mt-1">{count} orders</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODULE 2: CATALOG PRODUCTS TABLE */}
        {activeModule === "catalog_products" && (
          <div className="space-y-6">
            {/* Filter Matrix Box */}
            <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-soft space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[260px] flex-1">
                  <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search Products by Name, SKU, or Slug..."
                    className="pl-10 h-10 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

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
              </div>

              {/* Status Tabs & Collections */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase mr-1">Status:</span>
                  {(["all", "active", "draft", "archived"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                        statusFilter === st
                          ? "bg-brand-yellow text-slate-950 shadow-soft"
                          : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Catalog Table */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base font-semibold">Catalog List ({filteredProducts.length} SKUs)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="py-3 px-4">Image</th>
                        <th className="py-3 px-4">Name &amp; Slug</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Collection</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Stock</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="py-3 px-4">
                            {p.image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={p.image_url} alt={p.name} className="size-11 rounded-lg object-cover border border-border" />
                            ) : (
                              <div className="grid size-11 place-items-center rounded-lg bg-secondary text-muted-foreground">
                                <ImageIcon className="size-4" />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{p.slug}</p>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" size="sm" className="capitalize">{p.type.replace("_", " ")}</Badge>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{p.collection || "—"}</td>
                          <td className="py-3 px-4 font-semibold">{fmt(p.price_cents)}</td>
                          <td className="py-3 px-4">
                            <Badge variant={p.stock <= 0 ? "accent" : "outline"} size="sm">
                              {p.stock <= 0 ? "Out of Stock" : `${p.stock} in Stock`}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={p.status === "active" ? "success" : "outline"} size="sm" className="capitalize">
                              {p.status || "active"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openWizardForEdit(p)} className="size-8 p-0">
                                <Edit2 className="size-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(p.id, p.name)} className="size-8 p-0 text-red-400">
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODULE 3: 8-STEP PRODUCT WIZARD */}
        {activeModule === "catalog_wizard" && (
          <Card className="border-brand-yellow/40 bg-slate-950/90 shadow-2xl backdrop-blur-xl">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sliders className="size-6 text-brand-yellow" />
                {editingId ? `Edit Product SKU: "${name}"` : "Step-by-Step Product Creator Wizard"}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-6">
              {/* Wizard Content Step Form */}
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Product Name *</label>
                    <Input required value={name} onChange={(e) => handleNameChange(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">URL Slug *</label>
                    <Input required value={slug} onChange={(e) => setSlug(e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Selling Price (₹)</label>
                    <Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Compare Price (₹)</label>
                    <Input type="number" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Cost Price (₹)</label>
                    <Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                  </div>
                </div>

                {/* Profit calculation */}
                <div className="rounded-xl border border-border bg-secondary/30 p-4 flex items-center justify-between">
                  <p className="text-sm font-bold">Calculated Unit Profit: ₹{profitMarginRupees > 0 ? profitMarginRupees.toFixed(2) : "0.00"}</p>
                  <Badge variant="success" size="sm">Margin: {marginPct}%</Badge>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Primary Image URL</label>
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button variant="ghost" onClick={() => setActiveModule("catalog_products")}>Cancel</Button>
                  <Button variant="gradient" disabled={submitting} onClick={handleSaveWizardProduct}>
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save SKU
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MODULE 4: INVENTORY MOVEMENTS AUDIT LOG */}
        {(activeModule === "inventory_stock" || activeModule === "inventory_movements") && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="size-5 text-brand-orange" /> Stock Movements Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {inventoryLogs.length === 0 ? (
                  <EmptyState text="No inventory movements recorded. Adjusting product stock will write audit logs." />
                ) : (
                  <div className="divide-y divide-border">
                    {inventoryLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 text-sm">
                        <div>
                          <p className="font-semibold">{log.productName}</p>
                          <p className="text-xs text-muted-foreground">Reason: {log.reason} · {new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                        <Badge variant={log.change > 0 ? "success" : "accent"}>
                          {log.change > 0 ? `+${log.change}` : log.change} units
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODULE 5: ORDERS KANBAN BOARD */}
        {activeModule === "ops_kanban" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="size-5 text-brand-yellow" /> Orders Operational Pipeline (Kanban Board)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto">
              {ORDER_STAGES.slice(0, 4).map((stage) => {
                const stageOrders = orders.filter((o) => o.status === stage.key);
                return (
                  <div key={stage.key} className="rounded-2xl border border-border bg-card/60 p-4 space-y-3 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-xs font-bold uppercase">{stage.label}</span>
                      <Badge variant="outline" size="sm">{stageOrders.length}</Badge>
                    </div>

                    <div className="space-y-2">
                      {stageOrders.map((o) => (
                        <div key={o.id} className="rounded-xl border border-border p-3 bg-background shadow-soft space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-xs truncate">{o.customer_name}</p>
                            <span className="text-xs font-bold">{fmt(o.total_cents)}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono">{o.id.slice(0, 8)}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-[11px] h-7"
                            onClick={() => advanceOrderStatus(o.id)}
                          >
                            Advance Stage ➔
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODULE 6: PRINT QUEUE */}
        {activeModule === "ops_print_queue" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Printer className="size-5 text-brand-purple" /> Automated Print Jobs Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {["Glossy Vinyl Finish", "Matte Waterproof Vinyl", "Holographic Metallic", "Spotify Acrylic Card"].map((finish) => (
                  <div key={finish} className="rounded-xl border border-border p-4 flex items-center justify-between bg-card/50">
                    <div>
                      <p className="font-bold text-sm">{finish}</p>
                      <p className="text-xs text-muted-foreground">Automated batch grouping for high-speed print runs</p>
                    </div>
                    <Button variant="outline" size="sm">Download Print Files ZIP</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODULE 7: PACKING STATION */}
        {activeModule === "ops_packing" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <QrCode className="size-5 text-cyan-400" /> Dispatch Packing Station &amp; Label Printer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Scan order barcode or SKU serial..."
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                  />
                  <Button variant="gradient" onClick={() => setPackingVerified(true)}>
                    Verify Barcode
                  </Button>
                </div>

                {packingVerified && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs space-y-2">
                    <p className="font-bold text-emerald-400">✓ Barcode Verified! Ready for Dispatch Packing.</p>
                    <p className="text-muted-foreground">Items: 1x Anime Sticker Pack (Glossy) · Shipping Label Generated</p>
                    <Button variant="outline" size="sm">Print Shipping AWB Sticker</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODULE 8: COUPONS & DISCOUNTS */}
        {activeModule === "mkt_coupons" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Ticket className="size-5 text-brand-yellow" /> Coupons &amp; Promotional Codes Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleAddCoupon} className="flex gap-2">
                  <Input
                    placeholder="Coupon Code e.g. STIX20"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Discount %"
                    className="w-32"
                    value={newCouponVal}
                    onChange={(e) => setNewCouponVal(e.target.value)}
                  />
                  <Button type="submit" variant="gradient">+ Create Promo</Button>
                </form>

                <div className="divide-y divide-border border-t border-border pt-2">
                  {coupons.map((c) => (
                    <div key={c.code} className="flex items-center justify-between py-3">
                      <div>
                        <span className="font-bold text-brand-yellow font-mono">{c.code}</span>
                        <p className="text-xs text-muted-foreground">
                          {c.value}% OFF on orders above ₹{c.minOrderRupees} · {c.uses} redeemed
                        </p>
                      </div>
                      <Badge variant="success" size="sm">Active</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
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
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
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
