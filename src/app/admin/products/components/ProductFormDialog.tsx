import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ProductRow } from "../types";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Partial<ProductRow> | null;
  onSave: (product: Partial<ProductRow>) => Promise<{ success: boolean; message: string }>;
}

export function ProductFormDialog({ open, onOpenChange, product, onSave }: ProductFormDialogProps) {
  const [editingProduct, setEditingProduct] = React.useState<Partial<ProductRow> | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
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
      setFormError(null);
    }
  }, [open, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setFormError(null);
    setSaving(true);
    try {
      const { success, message } = await onSave(editingProduct);
      if (!success) {
        setFormError(message);
      } else {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!editingProduct) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-border/80 text-slate-50">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {editingProduct.id ? "Edit Product" : "Create Product"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-4">
          
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Basic Info</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Name</label>
                <Input 
                  required 
                  value={editingProduct.name || ""} 
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
                <Input required value={editingProduct.slug || ""} onChange={e => setEditingProduct(prev => ({ ...prev, slug: e.target.value }))} className="bg-slate-950/50 font-mono text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase text-slate-400">Description</label>
              <textarea 
                className="flex w-full rounded-md border border-input bg-slate-950/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px]"
                value={editingProduct.description || ""}
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
                  value={(editingProduct.price_cents || 0) / 100} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, price_cents: Math.round(parseFloat(e.target.value) * 100) }))} 
                  className="bg-slate-950/50" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Compare At (₹)</label>
                <Input 
                  type="number" 
                  min="0"
                  value={editingProduct.compare_at_cents ? editingProduct.compare_at_cents / 100 : ""} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, compare_at_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null }))} 
                  className="bg-slate-950/50" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Cost (₹)</label>
                <Input 
                  type="number" 
                  min="0"
                  value={(editingProduct.cost_cents || 0) / 100} 
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
                  value={editingProduct.stock || 0} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, stock: parseInt(e.target.value, 10) }))} 
                  className="bg-slate-950/50" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase text-slate-400">SKU</label>
                <Input value={editingProduct.sku || ""} onChange={e => setEditingProduct(prev => ({ ...prev, sku: e.target.value }))} className="bg-slate-950/50 font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Barcode</label>
                <Input value={editingProduct.barcode || ""} onChange={e => setEditingProduct(prev => ({ ...prev, barcode: e.target.value }))} className="bg-slate-950/50 font-mono text-sm" />
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
                  value={editingProduct.type || "sticker"}
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
                  value={editingProduct.status || "active"}
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
                <Input value={editingProduct.collection || ""} onChange={e => setEditingProduct(prev => ({ ...prev, collection: e.target.value }))} className="bg-slate-950/50" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase text-slate-400">Tags (comma separated)</label>
              <Input 
                value={editingProduct.tags?.join(", ") || ""} 
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
                value={editingProduct.image_url || ""} 
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
                  value={editingProduct.seo_title || ""} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, seo_title: e.target.value }))} 
                  className="bg-slate-950/50" 
                  placeholder={editingProduct.name || "Product Title"}
                />
                <p className="text-[10px] text-muted-foreground">{(editingProduct.seo_title || "").length}/60 characters</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase text-slate-400">SEO Description</label>
                <textarea 
                  className="flex w-full rounded-md border border-input bg-slate-950/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px]"
                  value={editingProduct.seo_description || ""}
                  onChange={e => setEditingProduct(prev => ({ ...prev, seo_description: e.target.value }))}
                  placeholder="Short description for Google search results..."
                />
                <p className="text-[10px] text-muted-foreground">{(editingProduct.seo_description || "").length}/160 characters</p>
              </div>
            </div>

            {/* SERP Card Preview */}
            <div className="rounded-xl border border-border/60 bg-slate-950 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 font-mono text-[11px]">https://stixnvibes.com/shop/{editingProduct.slug || "product-slug"}</span>
              </div>
              <h5 className="text-blue-400 hover:underline font-medium text-base leading-snug cursor-pointer">
                {editingProduct.seo_title || editingProduct.name || "Sticker Title"} | Stix N Vibes
              </h5>
              <p className="text-xs text-slate-400 line-clamp-2">
                {editingProduct.seo_description || editingProduct.description || "Buy premium high quality vinyl stickers, custom holographic decals & art prints online in India with fast shipping."}
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
                  checked={editingProduct.is_featured || false} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, is_featured: e.target.checked }))} 
                  className="rounded border-slate-700 bg-slate-800 text-brand-yellow focus:ring-brand-yellow"
                />
                Featured Product
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={editingProduct.customizable || false} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, customizable: e.target.checked }))} 
                  className="rounded border-slate-700 bg-slate-800 text-brand-yellow focus:ring-brand-yellow"
                />
                Customizable
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={editingProduct.is_limited || false} 
                  onChange={e => setEditingProduct(prev => ({ ...prev, is_limited: e.target.checked }))} 
                  className="rounded border-slate-700 bg-slate-800 text-brand-yellow focus:ring-brand-yellow"
                />
                Limited Edition
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={editingProduct.is_bundle || false} 
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
              <Button type="button" variant="ghost" onClick={() => { onOpenChange(false); setFormError(null); }}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={saving}>
                {saving ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
