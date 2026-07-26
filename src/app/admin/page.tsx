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
  Box,
  FolderTree,
  Tags as TagsIcon,
  Grid,
  History,
  MoreVertical,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronLeft,
  Warehouse,
  ShoppingBag,
  Command,
  ArrowUpRight,
  FolderPlus,
  Maximize2,
  Scissors,
  Zap,
  Menu,
  RotateCcw,
  LayoutGrid,
  List,
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
  updated_at?: string;
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
    reserved_stock?: number;
    incoming_stock?: number;
    damaged_stock?: number;
    returned_stock?: number;
    alt_texts?: Record<string, string>;
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

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  parent?: string | null;
  productCount: number;
  isVisible: boolean;
  sortOrder: number;
};

type CollectionItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  productCount: number;
  rulesType: "manual" | "automated";
  isFeatured: boolean;
};

type TagItem = {
  id: string;
  name: string;
  category: string;
  color: string;
  usageCount: number;
};

const PRODUCT_TYPES = [
  { label: "Sticker (Normal)", value: "sticker" },
  { label: "Sticker (Vinyl)", value: "sticker_vinyl" },
  { label: "Poster", value: "poster" },
  { label: "Spotify Card", value: "spotify_card" },
  { label: "Frame", value: "frame" },
  { label: "Mystery Pack", value: "mystery_pack" },
];

const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: "cat_1", name: "Stickers", slug: "stickers", productCount: 42, isVisible: true, sortOrder: 1 },
  { id: "cat_2", name: "Vinyl Cut Stickers", slug: "vinyl-stickers", parent: "cat_1", productCount: 28, isVisible: true, sortOrder: 2 },
  { id: "cat_3", name: "Posters", slug: "posters", productCount: 19, isVisible: true, sortOrder: 3 },
  { id: "cat_4", name: "Frames", slug: "frames", productCount: 8, isVisible: true, sortOrder: 4 },
  { id: "cat_5", name: "Spotify Cards", slug: "spotify-cards", productCount: 14, isVisible: true, sortOrder: 5 },
];

const INITIAL_COLLECTIONS: CollectionItem[] = [
  { id: "col_1", name: "Anime Collection", slug: "anime", description: "Waterproof vinyl anime sticker designs", productCount: 24, rulesType: "automated", isFeatured: true },
  { id: "col_2", name: "Gaming & Esports", slug: "gaming", description: "Sleek RGB & gamer setup decals", productCount: 18, rulesType: "automated", isFeatured: true },
  { id: "col_3", name: "Formula 1 Racing", slug: "f1", description: "High-octane motorsport aesthetic posters", productCount: 12, rulesType: "manual", isFeatured: false },
  { id: "col_4", name: "Cyberpunk Aesthetic", slug: "cyberpunk", description: "Neon futuristic graphics & holographic cards", productCount: 15, rulesType: "automated", isFeatured: true },
];

const INITIAL_TAGS: TagItem[] = [
  { id: "tag_1", name: "Anime", category: "Genre", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", usageCount: 34 },
  { id: "tag_2", name: "Gaming", category: "Genre", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", usageCount: 22 },
  { id: "tag_3", name: "Premium", category: "Quality", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", usageCount: 45 },
  { id: "tag_4", name: "Waterproof", category: "Feature", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", usageCount: 68 },
  { id: "tag_5", name: "Laptop", category: "Use Case", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", usageCount: 52 },
  { id: "tag_6", name: "Best Seller", category: "Trending", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", usageCount: 19 },
  { id: "tag_7", name: "New Arrival", category: "Trending", color: "bg-pink-500/20 text-pink-400 border-pink-500/30", usageCount: 12 },
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

  // Command Palette State
  const [commandOpen, setCommandOpen] = React.useState(false);

  // Active PIM Module & Layout View Mode (Table vs Grid)
  const [activeModule, setActiveModule] = React.useState<
    "dashboard" | "wizard" | "categories" | "collections" | "tags" | "media" | "inventory"
  >("dashboard");
  const [layoutMode, setLayoutMode] = React.useState<"table" | "grid">("table");

  // Saved Filter Views Tabs
  const [savedView, setSavedView] = React.useState<"all" | "low_stock" | "drafts" | "archived">("all");

  // Filters State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "draft" | "archived">("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [stockFilter, setStockFilter] = React.useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");

  // Bulk Operations State
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([]);
  const [bulkActioning, setBulkActioning] = React.useState(false);

  // Quick Stock Adjustment Drawer
  const [adjustingProduct, setAdjustingProduct] = React.useState<ProductRow | null>(null);
  const [stockChangeVal, setStockChangeVal] = React.useState<number>(10);
  const [stockReason, setStockReason] = React.useState<string>("Purchase / Restock");
  const [stockNotes, setStockNotes] = React.useState<string>("");
  const [adjustingLoading, setAdjustingLoading] = React.useState(false);

  // Taxonomy & Data States
  const [categories, setCategories] = React.useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [collections, setCollections] = React.useState<CollectionItem[]>(INITIAL_COLLECTIONS);
  const [tagList, setTagList] = React.useState<TagItem[]>(INITIAL_TAGS);

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
  const [selectedTags, setSelectedTags] = React.useState<string[]>(["New Arrival"]);

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

  // Step 5: Images & Media Dropzone State
  const [imagesList, setImagesList] = React.useState<string[]>([]);
  const [coverIndex, setCoverIndex] = React.useState(0);
  const [altTexts, setAltTexts] = React.useState<Record<string, string>>({});
  const [dragOver, setDragOver] = React.useState(false);

  // Step 6: Customization
  const [customizable, setCustomizable] = React.useState(false);
  const [maxUploadMb, setMaxUploadMb] = React.useState("10");

  // Step 7: SEO
  const [seoTitle, setSeoTitle] = React.useState("");
  const [seoDescription, setSeoDescription] = React.useState("");

  // Step 8: Publishing
  const [productStatus, setProductStatus] = React.useState<"active" | "draft" | "archived" | "scheduled">("active");
  const [isFeatured, setIsFeatured] = React.useState(false);

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  // Keyboard listener
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key.toLowerCase() === "n" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        resetWizard();
        setActiveModule("wizard");
      } else if (e.key === "Escape") {
        setCommandOpen(false);
        setAdjustingProduct(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  // 📋 Duplicate Product Feature
  async function handleDuplicateProduct(prod: ProductRow) {
    const newName = `${prod.name} (Copy)`;
    const newSlug = `${prod.slug}-copy-${Date.now().toString().slice(-4)}`;
    const newSku = `STX-CPY-${Date.now().toString().slice(-4)}`;

    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload = {
        name: newName,
        slug: newSlug,
        type: prod.type,
        collection: prod.collection,
        price_cents: prod.price_cents,
        compare_at_cents: prod.compare_at_cents,
        stock: prod.stock,
        image_url: prod.image_url,
        images: prod.images,
        description: prod.description,
        is_featured: false,
        customizable: prod.customizable,
        tags: prod.tags,
        status: "draft",
        sku: newSku,
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setFormSuccess(`✓ Duplicated SKU: "${json.data.name}" (Saved as Draft)`);
        void loadAll();
      } else {
        alert(json?.error ?? "Failed to duplicate product");
      }
    } catch {
      alert("Network error duplicating product");
    }
  }

  // ♻️ Restore Archived Product
  async function handleRestoreProduct(id: string) {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers,
        body: JSON.stringify({
          bulkAction: "update_status",
          ids: [id],
          status: "active",
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setFormSuccess("✓ Restored product to Active status");
        void loadAll();
      } else {
        alert(json?.error ?? "Failed to restore product");
      }
    } catch {
      alert("Network error restoring product");
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
    const imgs = prod.images || (prod.image_url ? [prod.image_url] : []);
    setImagesList(imgs);
    setCoverIndex(0);
    setIsFeatured(Boolean(prod.is_featured));
    setCustomizable(Boolean(prod.customizable));
    setProductStatus(prod.status || "active");
    setSelectedTags(prod.tags || ["New Arrival"]);

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
      setAltTexts(prod.metadata.alt_texts || {});
    }

    setWizardStep(1);
    setActiveModule("wizard");
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
    setSelectedTags(["New Arrival"]);
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
    setImagesList([]);
    setCoverIndex(0);
    setAltTexts({});
    setCustomizable(false);
    setMaxUploadMb("10");
    setSeoTitle("");
    setSeoDescription("");
    setProductStatus("active");
    setIsFeatured(false);
    setWizardStep(1);
    setFormErr(null);
  }

  // Handle Drag-and-Drop Image Dropzone Upload
  function handleImageFilesUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const objectUrl = URL.createObjectURL(file);
      newUrls.push(objectUrl);
    }
    setImagesList((prev) => [...prev, ...newUrls]);
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

      const orderedImages = [...imagesList];
      if (coverIndex > 0 && coverIndex < orderedImages.length) {
        const coverImg = orderedImages.splice(coverIndex, 1)[0];
        orderedImages.unshift(coverImg);
      }

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
        image_url: orderedImages[0] || null,
        images: orderedImages,
        description: description.trim() || null,
        is_featured: isFeatured,
        customizable,
        tags: selectedTags,
        status: productStatus,
        seo_title: seoTitle.trim() || name.trim(),
        seo_description: seoDescription.trim() || description.trim(),
        metadata: { alt_texts: altTexts },
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

      setFormSuccess(`✓ Published SKU: "${json.data.name}"`);
      setActiveModule("dashboard");
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

  // Quick Stock Adjustment Submit
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

  // Bulk Selection Logic
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
    const headers = ["ID", "Name", "Slug", "SKU", "Type", "Collection", "Price_INR", "Stock", "Status", "Image_URL"];
    const rows = list.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.slug,
      p.metadata?.sku || `STX-${p.slug.slice(0, 8).toUpperCase()}`,
      p.type,
      `"${(p.collection || "").replace(/"/g, '""')}"`,
      (p.price_cents / 100).toFixed(2),
      p.stock,
      p.status || "active",
      `"${(p.image_url || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pim_catalog_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filtered Products Memo
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      // Saved Views Logic
      if (savedView === "low_stock" && p.stock > 5) return false;
      if (savedView === "drafts" && p.status !== "draft") return false;
      if (savedView === "archived" && p.status !== "archived") return false;

      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.metadata?.sku && p.metadata.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.collection && p.collection.toLowerCase().includes(searchQuery.toLowerCase()));

      const pStatus = p.status || "active";
      const matchesStatus = statusFilter === "all" || pStatus === statusFilter;
      const matchesCategory = categoryFilter === "all" || p.type === categoryFilter;

      let matchesStock = true;
      if (stockFilter === "in_stock") matchesStock = p.stock > 5;
      else if (stockFilter === "low_stock") matchesStock = p.stock > 0 && p.stock <= 5;
      else if (stockFilter === "out_of_stock") matchesStock = p.stock <= 0;

      return matchesSearch && matchesStatus && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, statusFilter, categoryFilter, stockFilter, savedView]);

  // Inventory Breakdown Counters
  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const reservedStock = products.reduce((acc, p) => acc + (p.metadata?.reserved_stock || 0), 0);
  const availableStock = Math.max(0, totalStock - reservedStock);
  const incomingStock = products.reduce((acc, p) => acc + (p.metadata?.incoming_stock || 0), 0);
  const damagedStock = products.reduce((acc, p) => acc + (p.metadata?.damaged_stock || 0), 0);
  const returnedStock = products.reduce((acc, p) => acc + (p.metadata?.returned_stock || 0), 0);

  // Financial calculations
  const sellNum = parseFloat(sellingPrice || "0");
  const costNum = parseFloat(costPrice || "0");
  const profitMarginRupees = sellNum - costNum;
  const marginPct = sellNum > 0 ? Math.round((profitMarginRupees / sellNum) * 100) : 0;

  if (loading) {
    return (
      <Container className="grid min-h-[80vh] place-items-center">
        <div className="flex items-center gap-2 text-muted-foreground font-semibold">
          <Loader2 className="size-5 animate-spin text-brand-yellow" /> Loading PIM Platform...
        </div>
      </Container>
    );
  }
  if (!authed) return null;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-yellow selection:text-slate-950">
      {/* COMMAND PALETTE MODAL (CTRL + K) */}
      {commandOpen && (
        <div className="fixed inset-0 z-50 grid place-items-start pt-20 justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-slate-900 shadow-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Command className="size-5 text-brand-yellow" />
              <input
                autoFocus
                placeholder="Type a command or search PIM SKUs..."
                className="w-full bg-transparent text-sm font-medium focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="text-[10px] font-mono bg-secondary px-2 py-0.5 rounded text-muted-foreground">ESC</span>
            </div>

            <div className="space-y-1 text-xs font-medium">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider px-2 py-1">Quick Navigation</p>
              <button
                type="button"
                onClick={() => {
                  setActiveModule("dashboard");
                  setCommandOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary flex items-center justify-between"
              >
                <span>📦 Product Catalog Dashboard</span>
                <span className="text-muted-foreground">Go to Table</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetWizard();
                  setActiveModule("wizard");
                  setCommandOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary flex items-center justify-between"
              >
                <span>✨ Create New Product SKU (N)</span>
                <span className="text-muted-foreground">Open Wizard</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModule("inventory");
                  setCommandOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary flex items-center justify-between"
              >
                <span>📊 Inventory &amp; Stock Movements Log</span>
                <span className="text-muted-foreground">Audit History</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALM SIDEBAR NAVIGATION */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } shrink-0 border-r border-border/80 bg-slate-900/90 transition-all duration-200 flex flex-col justify-between p-3 z-30`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-3 border-b border-border/60">
            <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
              <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-yellow font-black text-slate-950 shadow-glow">
                PIM
              </div>
              {sidebarOpen && (
                <div>
                  <p className="font-display font-bold text-sm leading-none">Stix N Vibes</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Product OS v3.5</p>
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

          {/* Navigation Items */}
          <nav className="mt-4 space-y-4 text-xs font-semibold">
            <div>
              {sidebarOpen && <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Catalog Module</p>}
              <div className="space-y-1">
                {[
                  { id: "dashboard", label: "Product Dashboard", icon: <Package className="size-4 shrink-0" /> },
                  { id: "wizard", label: "Product Wizard", icon: <Sliders className="size-4 shrink-0" /> },
                  { id: "categories", label: "Categories", icon: <FolderTree className="size-4 shrink-0" /> },
                  { id: "collections", label: "Collections", icon: <Grid className="size-4 shrink-0" /> },
                  { id: "tags", label: "Tag Taxonomy", icon: <TagsIcon className="size-4 shrink-0" /> },
                  { id: "media", label: "Media Library", icon: <ImageIcon className="size-4 shrink-0" /> },
                ].map((item) => {
                  const active = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveModule(item.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                        active
                          ? "bg-brand-yellow text-slate-950 font-bold shadow-soft"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                      {sidebarOpen && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              {sidebarOpen && <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Inventory Module</p>}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveModule("inventory")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                    activeModule === "inventory"
                      ? "bg-brand-orange text-slate-950 font-bold shadow-soft"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Box className="size-4 shrink-0" />
                  {sidebarOpen && <span>Inventory Breakdown</span>}
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* User Footer */}
        <div className="border-t border-border/60 pt-3">
          {sidebarOpen ? (
            <div className="flex items-center justify-between px-2">
              <div className="truncate">
                <p className="text-xs font-bold truncate">PIM Operator</p>
                <p className="text-[10px] text-muted-foreground truncate">Press Ctrl+K for commands</p>
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

      {/* WORKSPACE CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight capitalize">
              {activeModule === "dashboard" && "Product Catalog Dashboard"}
              {activeModule === "wizard" && (editingId ? `Edit Product SKU: "${name}"` : "8-Step Product Creator Wizard")}
              {activeModule === "categories" && "Categories Taxonomy Tree"}
              {activeModule === "collections" && "Curated Collections Hub"}
              {activeModule === "tags" && "Global Tag Management"}
              {activeModule === "media" && "Centralized Media Library"}
              {activeModule === "inventory" && "Stock Breakdown & Inventory Movements"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
            >
              <Command className="size-3.5" />
              <span>Search PIM...</span>
              <kbd className="text-[10px] bg-background px-1.5 py-0.5 rounded font-mono">Ctrl+K</kbd>
            </button>

            <Button
              variant="gradient"
              size="sm"
              onClick={() => {
                resetWizard();
                setActiveModule("wizard");
              }}
            >
              <Plus className="size-4" /> + New Product (N)
            </Button>
          </div>
        </div>

        {formSuccess && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400">
            {formSuccess}
          </div>
        )}

        {/* MODULE 1: PRODUCT DASHBOARD & DENSE CATALOG TABLE */}
        {activeModule === "dashboard" && (
          <div className="space-y-6">
            {/* Filter Matrix Box */}
            <div className="rounded-2xl border border-border/80 bg-slate-900/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="relative min-w-[280px] flex-1">
                  <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search Products by Name, SKU code, or Slug (/ to focus)..."
                    className="pl-10 h-9 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Category Dropdown */}
                <select
                  className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
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

                {/* Grid vs Table View Mode Toggle */}
                <div className="flex items-center rounded-xl border border-border bg-background p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setLayoutMode("table")}
                    className={`p-1 rounded ${layoutMode === "table" ? "bg-brand-yellow text-slate-950" : "text-muted-foreground hover:text-foreground"}`}
                    title="Table View"
                  >
                    <List className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode("grid")}
                    className={`p-1 rounded ${layoutMode === "grid" ? "bg-brand-yellow text-slate-950" : "text-muted-foreground hover:text-foreground"}`}
                    title="Grid Card View"
                  >
                    <LayoutGrid className="size-4" />
                  </button>
                </div>
              </div>

              {/* Saved View Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-muted-foreground uppercase text-[10px]">Saved Views:</span>
                  {[
                    { id: "all", label: "All Products" },
                    { id: "low_stock", label: "Low Stock Alert (<5)" },
                    { id: "drafts", label: "Draft SKUs" },
                    { id: "archived", label: "Archived SKUs" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSavedView(tab.id as any)}
                      className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                        savedView === tab.id
                          ? "bg-brand-yellow text-slate-950 font-bold shadow-soft"
                          : "bg-secondary/40 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedProductIds.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-brand-yellow/40 bg-slate-900 px-4 py-2.5 text-xs font-semibold animate-in fade-in">
                <span className="text-brand-yellow flex items-center gap-2">
                  <CheckSquare className="size-4" /> {selectedProductIds.length} item(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction("active")}>
                    Publish Selected
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction("archive")}>
                    Archive Selected
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction("export")}>
                    Export CSV
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleBulkAction("delete")}>
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}

            {/* Table / Grid Render */}
            {layoutMode === "table" ? (
              <Card className="border-border/80 bg-slate-900/60">
                <CardHeader className="py-3 px-4 flex items-center justify-between border-b border-border/60">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Product Catalog ({filteredProducts.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-secondary/30 font-semibold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-3">
                            <button type="button" onClick={toggleSelectAll}>
                              {selectedProductIds.length === filteredProducts.length ? (
                                <CheckSquare className="size-4 text-brand-yellow" />
                              ) : (
                                <Square className="size-4 text-muted-foreground" />
                              )}
                            </button>
                          </th>
                          <th className="py-2.5 px-3">Thumbnail</th>
                          <th className="py-2.5 px-3">Name &amp; SKU</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Collection</th>
                          <th className="py-2.5 px-3">Price</th>
                          <th className="py-2.5 px-3">Stock</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredProducts.map((p) => {
                          const status = p.status || "active";
                          const selected = selectedProductIds.includes(p.id);
                          const skuCode = p.metadata?.sku || `STX-${p.slug.slice(0, 8).toUpperCase()}`;

                          return (
                            <tr key={p.id} className={`hover:bg-secondary/20 transition-colors ${selected ? "bg-brand-yellow/5" : ""}`}>
                              <td className="py-2.5 px-3">
                                <button type="button" onClick={() => toggleSelectProduct(p.id)}>
                                  {selected ? (
                                    <CheckSquare className="size-4 text-brand-yellow" />
                                  ) : (
                                    <Square className="size-4 text-muted-foreground" />
                                  )}
                                </button>
                              </td>

                              <td className="py-2.5 px-3">
                                {p.image_url ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={p.image_url} alt={p.name} className="size-10 rounded-lg object-cover border border-border" />
                                ) : (
                                  <div className="grid size-10 place-items-center rounded-lg bg-secondary text-muted-foreground">
                                    <ImageIcon className="size-4" />
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-3">
                                <p className="font-bold leading-tight text-foreground">{p.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{skuCode}</p>
                              </td>

                              <td className="py-2.5 px-3">
                                <Badge variant="outline" size="sm" className="capitalize">
                                  {p.type.replace("_", " ")}
                                </Badge>
                              </td>

                              <td className="py-2.5 px-3 text-muted-foreground font-medium">{p.collection || "—"}</td>

                              <td className="py-2.5 px-3 font-semibold tabular-nums">
                                {fmt(p.price_cents)}
                              </td>

                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdjustingProduct(p);
                                    setStockChangeVal(10);
                                  }}
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
                                        : ""
                                    }
                                  >
                                    {p.stock <= 0 ? "0 Out of Stock" : `${p.stock} Available`}
                                  </Badge>
                                </button>
                              </td>

                              <td className="py-2.5 px-3">
                                <Badge
                                  variant={status === "active" ? "success" : status === "draft" ? "outline" : "accent"}
                                  size="sm"
                                  className="capitalize"
                                >
                                  {status}
                                </Badge>
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {status === "archived" ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRestoreProduct(p.id)}
                                      title="♻️ Restore Product"
                                      className="size-7 p-0 text-emerald-400 hover:text-emerald-300"
                                    >
                                      <RotateCcw className="size-3.5" />
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDuplicateProduct(p)}
                                        title="📋 Duplicate SKU"
                                        className="size-7 p-0"
                                      >
                                        <Copy className="size-3.5" />
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openWizardForEdit(p)}
                                        title="✏ Edit in Wizard"
                                        className="size-7 p-0"
                                      >
                                        <Edit2 className="size-3.5" />
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteProduct(p.id, p.name)}
                                        title="Delete SKU"
                                        className="size-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* GRID CARD VIEW */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {filteredProducts.map((p) => (
                  <Card key={p.id} className="border-border/80 bg-slate-900/60 overflow-hidden group">
                    {p.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.image_url} alt={p.name} className="size-36 w-full object-cover" />
                    ) : (
                      <div className="grid size-36 place-items-center bg-secondary text-muted-foreground w-full">
                        <ImageIcon className="size-6" />
                      </div>
                    )}
                    <CardContent className="p-3 space-y-1 text-xs">
                      <p className="font-bold truncate">{p.name}</p>
                      <p className="text-muted-foreground font-mono text-[10px]">{p.metadata?.sku || p.slug}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold">{fmt(p.price_cents)}</span>
                        <Badge variant="outline" size="sm">{p.stock} Stock</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODULE 2: 8-STEP WIZARD */}
        {activeModule === "wizard" && (
          <Card className="border-brand-yellow/40 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Sliders className="size-5 text-brand-yellow" />
                  {editingId ? `Editing Product SKU: "${name}"` : "Step-by-Step Product Creator Wizard"}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveModule("dashboard")}>
                  <X className="size-4" /> Close Wizard
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-6 space-y-4">
              {formErr && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                  {formErr}
                </div>
              )}

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

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Category / Product Type *</label>
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
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

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveModule("dashboard")}>Cancel</Button>
                <Button variant="gradient" size="sm" disabled={submitting} onClick={handleSaveWizardProduct}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save &amp; Publish SKU
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MODULE 7: POLISHED INVENTORY ENGINE */}
        {activeModule === "inventory" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <KpiCard icon={<Box className="size-4 text-brand-yellow" />} label="Total Stock" value={totalStock.toString()} />
              <KpiCard icon={<Box className="size-4 text-emerald-400" />} label="Available" value={availableStock.toString()} />
              <KpiCard icon={<Box className="size-4 text-amber-400" />} label="Reserved" value={reservedStock.toString()} />
              <KpiCard icon={<Box className="size-4 text-blue-400" />} label="Incoming" value={incomingStock.toString()} />
              <KpiCard icon={<Box className="size-4 text-red-400" />} label="Damaged" value={damagedStock.toString()} />
              <KpiCard icon={<Box className="size-4 text-purple-400" />} label="Returned" value={returnedStock.toString()} />
              <KpiCard icon={<Box className="size-4 text-cyan-400" />} label="Committed" value={reservedStock.toString()} />
            </div>

            <Card className="border-border/80 bg-slate-900/60">
              <CardHeader className="py-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Stock Movements Audit Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {inventoryLogs.length === 0 ? (
                  <EmptyState text="No stock movements logged. Adjusting product stock will write audit records." />
                ) : (
                  <div className="divide-y divide-border/60 text-xs">
                    {inventoryLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-semibold">{log.productName}</p>
                          <p className="text-[10px] text-muted-foreground">Reason: {log.reason} · {new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                        <Badge variant={log.change > 0 ? "success" : "accent"} size="sm">
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

        {/* Quick Stock Drawer */}
        {adjustingProduct && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in">
            <Card className="w-full max-w-md border-brand-yellow/40 bg-slate-900 shadow-2xl">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-brand-yellow">
                  <span>Adjust Stock: "{adjustingProduct.name}"</span>
                  <Button variant="ghost" size="sm" onClick={() => setAdjustingProduct(null)}>
                    <X className="size-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQuickStockSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-muted-foreground uppercase">Stock Change (+ Add / - Remove)</label>
                    <Input
                      type="number"
                      required
                      className="h-8"
                      value={stockChangeVal}
                      onChange={(e) => setStockChangeVal(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-muted-foreground uppercase">Adjustment Reason *</label>
                    <select
                      className="w-full h-8 rounded-xl border border-border bg-background px-2 text-xs font-semibold"
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

                  <div className="flex justify-end gap-2 border-t border-border pt-3">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAdjustingProduct(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="gradient" size="sm" disabled={adjustingLoading}>
                      {adjustingLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save Adjustment Log
                    </Button>
                  </div>
                </form>
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
    <div className="rounded-xl border border-border/80 bg-slate-900/80 p-3 shadow-soft">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid place-items-center p-8 text-center">
      <Sparkles className="size-6 text-muted-foreground/40" />
      <p className="mt-2 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
