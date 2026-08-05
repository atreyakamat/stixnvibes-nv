"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Material = {
  id: string;
  name: string;
  slug: string;
  description: string;
  cost_per_unit_cents: number;
  is_active: boolean;
  properties: {
    waterproof?: boolean;
    uv_resistant?: boolean;
    scratch_resistant?: boolean;
    food_safe?: boolean;
  };
  sort_order: number;
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cost_per_unit_cents: 0,
    is_active: true,
    waterproof: false,
    uv_resistant: false,
    scratch_resistant: false,
    food_safe: false,
    sort_order: 0,
  });

  const fetchMaterials = async () => {
    try {
      const res = await fetch("/api/admin/materials", {
        headers: { Authorization: `Bearer ${localStorage.getItem("snv.admin.accessToken")}` },
      });
      const json = await res.json();
      if (json.ok) {
        setMaterials(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const openModal = (mat?: Material) => {
    if (mat) {
      setEditingId(mat.id);
      setFormData({
        name: mat.name,
        description: mat.description || "",
        cost_per_unit_cents: mat.cost_per_unit_cents || 0,
        is_active: mat.is_active,
        waterproof: !!mat.properties?.waterproof,
        uv_resistant: !!mat.properties?.uv_resistant,
        scratch_resistant: !!mat.properties?.scratch_resistant,
        food_safe: !!mat.properties?.food_safe,
        sort_order: mat.sort_order || 0,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        cost_per_unit_cents: 0,
        is_active: true,
        waterproof: false,
        uv_resistant: false,
        scratch_resistant: false,
        food_safe: false,
        sort_order: 0,
      });
    }
    setIsModalOpen(true);
  };

  const saveMaterial = async () => {
    const payload = {
      id: editingId,
      name: formData.name,
      description: formData.description,
      cost_per_unit_cents: formData.cost_per_unit_cents,
      is_active: formData.is_active,
      sort_order: formData.sort_order,
      properties: {
        waterproof: formData.waterproof,
        uv_resistant: formData.uv_resistant,
        scratch_resistant: formData.scratch_resistant,
        food_safe: formData.food_safe,
      }
    };
    try {
      const res = await fetch("/api/admin/materials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("snv.admin.accessToken")}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchMaterials();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/admin/materials?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("snv.admin.accessToken")}` },
      });
      if (res.ok) fetchMaterials();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-foreground">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-display font-bold">Materials Manager</h1>
        <Button onClick={() => openModal()} className="bg-brand-yellow text-black hover:bg-brand-yellow/80">
          <Plus className="w-4 h-4 mr-2" /> Add Material
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map(m => (
            <Card key={m.id} className="bg-slate-900/60 border-border/80 relative group">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{m.name}</CardTitle>
                  <Badge variant={m.is_active ? "success" : "outline"}>{m.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <CardDescription className="line-clamp-2">{m.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">Cost: {(m.cost_per_unit_cents / 100).toFixed(2)} USD</div>
                <div className="flex flex-wrap gap-2">
                  {m.properties?.waterproof && <Badge variant="outline" size="sm">Waterproof</Badge>}
                  {m.properties?.uv_resistant && <Badge variant="outline" size="sm">UV Resistant</Badge>}
                  {m.properties?.scratch_resistant && <Badge variant="outline" size="sm">Scratch Resistant</Badge>}
                  {m.properties?.food_safe && <Badge variant="outline" size="sm">Food Safe</Badge>}
                </div>
                <div className="flex gap-2 pt-4 border-t border-border/50">
                  <Button variant="outline" size="sm" onClick={() => openModal(m)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteMaterial(m.id)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Material" : "Add Material"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Material Name" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Brief description" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cost (cents)</label>
              <Input type="number" value={formData.cost_per_unit_cents} onChange={e => setFormData({...formData, cost_per_unit_cents: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                Active
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={formData.waterproof} onChange={e => setFormData({...formData, waterproof: e.target.checked})} />
                Waterproof
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={formData.uv_resistant} onChange={e => setFormData({...formData, uv_resistant: e.target.checked})} />
                UV Resistant
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={formData.scratch_resistant} onChange={e => setFormData({...formData, scratch_resistant: e.target.checked})} />
                Scratch Resistant
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={formData.food_safe} onChange={e => setFormData({...formData, food_safe: e.target.checked})} />
                Food Safe
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sort Order</label>
              <Input type="number" value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})} />
            </div>
          </div>
          <Button onClick={saveMaterial} className="w-full bg-brand-yellow text-black hover:bg-brand-yellow/80">Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
