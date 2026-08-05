"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  const fetchSizes = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/sizes", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok) setSizes(json.data || []);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSizes(); }, []);

  const openModal = (size?: Size) => {
    if (size) {
      setEditingId(size.id);
      setFormData({
        name: size.name,
        width_mm: size.width_mm,
        height_mm: size.height_mm,
        category: size.category,
        is_active: size.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        width_mm: 0,
        height_mm: 0,
        category: "sticker",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const saveSize = async () => {
    try {
      const res = await fetch("/api/admin/sizes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("snv.admin.accessToken")}`,
        },
        body: JSON.stringify({ id: editingId, ...formData }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchSizes();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSize = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/admin/sizes?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("snv.admin.accessToken")}` },
      });
      if (res.ok) fetchSizes();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = categoryFilter ? sizes.filter(s => s.category === categoryFilter) : sizes;

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-foreground">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display font-bold">Sizes Manager</h1>
        <Button onClick={() => openModal()} className="bg-brand-yellow text-black hover:bg-brand-yellow/80">
          <Plus className="w-4 h-4 mr-2" /> Add Size
        </Button>
      </div>

      <div className="flex gap-4">
        <select 
          className="bg-slate-900 border border-border/80 text-sm rounded-md px-3 py-2 text-foreground"
          value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="sticker">Sticker</option>
          <option value="poster">Poster</option>
          <option value="card">Card</option>
          <option value="frame">Frame</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <Card className="bg-slate-900/60 border-border/80">
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/80 bg-slate-900/80">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Dimensions (mm)</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="px-6 py-4 font-medium">{s.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{s.slug}</td>
                    <td className="px-6 py-4">{s.width_mm} x {s.height_mm}</td>
                    <td className="px-6 py-4 capitalize">{s.category}</td>
                    <td className="px-6 py-4">
                      <Badge variant={s.is_active ? "success" : "outline"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="ghost" size="icon-sm" onClick={() => openModal(s)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => deleteSize(s.id)}><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Size" : "Add Size"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Small, A4" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Width (mm)</label>
                <Input type="number" value={formData.width_mm} onChange={e => setFormData({...formData, width_mm: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Height (mm)</label>
                <Input type="number" value={formData.height_mm} onChange={e => setFormData({...formData, height_mm: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="sticker">Sticker</option>
                <option value="poster">Poster</option>
                <option value="card">Card</option>
                <option value="frame">Frame</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                Active
              </label>
            </div>
          </div>
          <Button onClick={saveSize} className="w-full bg-brand-yellow text-black hover:bg-brand-yellow/80">Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
