"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Folder, FolderTree, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  icon: string | null;
  sort_order: number;
  is_featured: boolean;
  children?: Category[];
};

export default function CategoriesPage() {
  const [categoriesTree, setCategoriesTree] = useState<Category[]>([]);
  const [categoriesFlat, setCategoriesFlat] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    parent_id: "",
    icon: "",
    sort_order: 0,
    is_featured: false,
  });

  const fetchCategories = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/categories", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok) {
          setCategoriesTree(json.data?.tree || []);
          setCategoriesFlat(json.data?.flat || []);
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openModal = (cat?: Category) => {
    if (cat) {
      setEditingId(cat.id);
      setFormData({
        name: cat.name,
        parent_id: cat.parent_id || "",
        icon: cat.icon || "",
        sort_order: cat.sort_order || 0,
        is_featured: cat.is_featured,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        parent_id: "",
        icon: "",
        sort_order: 0,
        is_featured: false,
      });
    }
    setIsModalOpen(true);
  };

  const saveCategory = async () => {
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("snv.admin.accessToken")}`,
        },
        body: JSON.stringify({
          id: editingId,
          ...formData,
          parent_id: formData.parent_id || null
        }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchCategories();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("snv.admin.accessToken")}` },
      });
      if (res.ok) fetchCategories();
    } catch (e) {
      console.error(e);
    }
  };

  const renderTree = (nodes: Category[], level = 0) => {
    return nodes.map(node => (
      <div key={node.id} className="w-full">
        <div 
          className="flex items-center justify-between p-3 border-b border-border/50 hover:bg-slate-800/30 group"
          style={{ paddingLeft: `${level * 2 + 1}rem` }}
        >
          <div className="flex items-center gap-3">
            {level === 0 ? <FolderTree className="w-5 h-5 text-brand-yellow" /> : <Folder className="w-4 h-4 text-muted-foreground" />}
            <span className={`font-medium ${level === 0 ? 'text-base' : 'text-sm'}`}>{node.name}</span>
            <span className="text-xs text-muted-foreground">/{node.slug}</span>
            {node.is_featured && <Badge variant="brand" size="sm"><Star className="w-3 h-3 mr-1" /> Featured</Badge>}
            {node.icon && <span className="text-xs bg-slate-800 px-2 py-1 rounded">{node.icon}</span>}
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon-sm" onClick={() => openModal(node)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => deleteCategory(node.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {node.children && node.children.length > 0 && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-foreground">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display font-bold">Categories Manager</h1>
        <Button onClick={() => openModal()} className="bg-brand-yellow text-black hover:bg-brand-yellow/80">
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <Card className="bg-slate-900/60 border-border/80">
          <CardContent className="p-0">
            {categoriesTree.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No categories found.</div>
            ) : (
              <div className="flex flex-col">
                {renderTree(categoriesTree)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Category Name" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Parent Category</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" 
                value={formData.parent_id} 
                onChange={e => setFormData({...formData, parent_id: e.target.value})}
              >
                <option value="">None (Root Category)</option>
                {categoriesFlat.filter(c => c.id !== editingId).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Icon (emoji/identifier)</label>
              <Input value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} placeholder="e.g. 🎨 or tag" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sort Order</label>
              <Input type="number" value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={formData.is_featured} onChange={e => setFormData({...formData, is_featured: e.target.checked})} />
                Featured Category
              </label>
            </div>
          </div>
          <Button onClick={saveCategory} className="w-full bg-brand-yellow text-black hover:bg-brand-yellow/80">Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
