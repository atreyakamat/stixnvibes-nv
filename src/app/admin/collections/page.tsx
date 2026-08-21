"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  is_active: boolean;
  product_count: number;
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    is_active: true,
  });

  const fetchCollections = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/collections", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        const raw = json?.data;
        if (Array.isArray(raw)) {
          setCollections(raw);
        } else if (raw?.data && Array.isArray(raw.data)) {
          setCollections(raw.data);
        } else {
          setCollections([]);
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCollections(); }, []);

  const openModal = (col?: Collection) => {
    if (col) {
      setEditingId(col.id);
      setFormData({
        name: col.name,
        description: col.description || "",
        image_url: col.image_url || "",
        is_active: col.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        image_url: "",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const saveCollection = async () => {
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("snv.admin.accessToken")}`,
        },
        body: JSON.stringify({ id: editingId || undefined, ...formData }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchCollections();
      }
    } catch {
      // Handled gracefully
    }
  };

  const deleteCollection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this collection?")) return;
    try {
      const res = await fetch(`/api/admin/collections?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("snv.admin.accessToken")}` },
      });
      if (res.ok) fetchCollections();
    } catch {
      // Handled gracefully
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-foreground">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display font-bold">Collections Manager</h1>
        <Button onClick={() => openModal()} className="bg-brand-yellow text-black hover:bg-brand-yellow/80">
          <Plus className="w-4 h-4 mr-2" /> Create Collection
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map(c => (
            <Card key={c.id} className="bg-slate-900/60 border-border/80 overflow-hidden flex flex-col">
              <div className="h-40 w-full bg-slate-800 relative flex items-center justify-center">
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <Badge variant={c.is_active ? "success" : "outline"} className="backdrop-blur-md bg-background/80">
                    {c.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="brand" className="backdrop-blur-md">
                    {c.product_count || 0} Products
                  </Badge>
                </div>
              </div>
              <CardHeader>
                <CardTitle>{c.name}</CardTitle>
                <CardDescription className="line-clamp-2">{c.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-4 border-t border-border/50 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openModal(c)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => deleteCollection(c.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Collection" : "Create Collection"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Collection Name" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Description" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Image URL</label>
              <Input value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                Active
              </label>
            </div>
          </div>
          <Button onClick={saveCollection} className="w-full bg-brand-yellow text-black hover:bg-brand-yellow/80">Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
