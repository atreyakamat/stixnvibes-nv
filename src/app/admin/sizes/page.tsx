"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/admin/data-table";

type Size = {
  id: string;
  name: string;
  slug: string;
  width_mm: number;
  height_mm: number;
  category: string;
  is_active: boolean;
};

export default function SizesPage() {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    width_mm: 0,
    height_mm: 0,
    category: "sticker",
    is_active: true,
  });

  const fetchSizes = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const url = categoryFilter ? `/api/admin/sizes?category=${categoryFilter}` : "/api/admin/sizes";
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        const raw = json?.data;
        if (Array.isArray(raw)) {
          setSizes(raw);
        } else if (raw?.data && Array.isArray(raw.data)) {
          setSizes(raw.data);
        } else {
          setSizes([]);
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchSizes();
  }, [fetchSizes]);

  const openModal = (size?: Size) => {
    if (size) {
      setEditingId(size.id);
      setFormData({
        name: size.name,
        width_mm: size.width_mm,
        height_mm: size.height_mm,
        category: size.category || "sticker",
        is_active: size.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", width_mm: 0, height_mm: 0, category: "sticker", is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: formData.name,
        width_mm: Number(formData.width_mm),
        height_mm: Number(formData.height_mm),
        category: formData.category,
        is_active: formData.is_active,
      };

      const res = await fetch("/api/admin/sizes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchSizes();
      }
    } catch {
      // Handled gracefully
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this size configuration?")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch(`/api/admin/sizes?id=${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) fetchSizes();
    } catch {
      // Handled gracefully
    }
  };

  const columns: Column<Size>[] = [
    {
      header: "Size Name",
      cell: (row) => <span className="font-semibold text-slate-100">{row.name}</span>,
    },
    {
      header: "Dimensions (mm)",
      cell: (row) => (
        <span className="font-mono text-slate-300">
          {row.width_mm} × {row.height_mm} mm
        </span>
      ),
    },
    {
      header: "Category",
      cell: (row) => (
        <Badge variant="outline" className="capitalize text-xs bg-slate-950">
          {row.category}
        </Badge>
      ),
    },
    {
      header: "Status",
      cell: (row) =>
        row.is_active ? (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">Active</Badge>
        ) : (
          <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-xs">Inactive</Badge>
        ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openModal(row)} className="h-8 w-8 p-0">
            <Edit className="w-4 h-4 text-slate-400 hover:text-white" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} className="h-8 w-8 p-0">
            <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Sizes Manager</h1>
          <p className="text-xs text-muted-foreground mt-1">Configure standard product sizes and dimensions.</p>
        </div>
        <Button onClick={() => openModal()} className="bg-brand-yellow text-slate-950 font-bold hover:bg-brand-yellow/90">
          <Plus className="w-4 h-4 mr-2" /> Add Size
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={sizes}
        searchPlaceholder="Search size configurations..."
        pageSize={10}
        emptyText={loading ? "Loading sizes..." : "No sizes configured."}
        actions={
          <select
            className="h-9 rounded-md border border-input bg-slate-950 px-3 py-1 text-xs"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="sticker">Sticker</option>
            <option value="poster">Poster</option>
            <option value="card">Card</option>
          </select>
        }
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-900 border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Size" : "Add Size"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs mt-2">
            <div>
              <label className="font-semibold block mb-1">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='e.g. 3" x 3"'
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold block mb-1">Width (mm)</label>
                <Input
                  type="number"
                  value={formData.width_mm}
                  onChange={(e) => setFormData({ ...formData, width_mm: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Height (mm)</label>
                <Input
                  type="number"
                  value={formData.height_mm}
                  onChange={(e) => setFormData({ ...formData, height_mm: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Category</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-xs"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="sticker">Sticker</option>
                <option value="poster">Poster</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <label className="font-semibold">Active</label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-brand-yellow text-slate-950 font-bold">
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
