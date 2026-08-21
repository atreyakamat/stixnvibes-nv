"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/admin/data-table";

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
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/materials", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        const raw = json?.data;
        if (Array.isArray(raw)) {
          setMaterials(raw);
        } else if (raw?.data && Array.isArray(raw.data)) {
          setMaterials(raw.data);
        } else {
          setMaterials([]);
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const openCreateModal = () => {
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
      sort_order: materials.length,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (material: Material) => {
    setEditingId(material.id);
    setFormData({
      name: material.name,
      description: material.description || "",
      cost_per_unit_cents: material.cost_per_unit_cents || 0,
      is_active: material.is_active,
      waterproof: !!material.properties?.waterproof,
      uv_resistant: !!material.properties?.uv_resistant,
      scratch_resistant: !!material.properties?.scratch_resistant,
      food_safe: !!material.properties?.food_safe,
      sort_order: material.sort_order || 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: formData.name,
        description: formData.description,
        cost_per_unit_cents: Number(formData.cost_per_unit_cents),
        is_active: formData.is_active,
        properties: {
          waterproof: formData.waterproof,
          uv_resistant: formData.uv_resistant,
          scratch_resistant: formData.scratch_resistant,
          food_safe: formData.food_safe,
        },
        sort_order: Number(formData.sort_order),
      };

      const res = await fetch("/api/admin/materials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchMaterials();
      }
    } catch {
      // Handled gracefully
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch(`/api/admin/materials?id=${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) fetchMaterials();
    } catch {
      // Handled gracefully
    }
  };

  const columns: Column<Material>[] = [
    {
      header: "Material",
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-100">{row.name}</p>
          <p className="text-[10px] text-muted-foreground">{row.description || "No description"}</p>
        </div>
      ),
    },
    {
      header: "Cost / Unit",
      cell: (row) => (
        <span className="font-medium text-slate-200">
          ₹{((row.cost_per_unit_cents || 0) / 100).toFixed(2)}
        </span>
      ),
    },
    {
      header: "Properties",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.properties?.waterproof && <Badge variant="outline" className="text-[10px]">Waterproof</Badge>}
          {row.properties?.uv_resistant && <Badge variant="outline" className="text-[10px]">UV Resistant</Badge>}
          {row.properties?.scratch_resistant && <Badge variant="outline" className="text-[10px]">Scratch Resistant</Badge>}
          {row.properties?.food_safe && <Badge variant="outline" className="text-[10px]">Food Safe</Badge>}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (row) =>
        row.is_active ? (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" /> Active
          </Badge>
        ) : (
          <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-xs">
            <XCircle className="w-3 h-3 mr-1" /> Inactive
          </Badge>
        ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditModal(row)} className="h-8 w-8 p-0">
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
          <h1 className="font-display text-2xl font-bold">Materials Manager</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage print materials, finishes, and specs.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-brand-yellow text-slate-950 font-bold hover:bg-brand-yellow/90">
          <Plus className="w-4 h-4 mr-2" /> Add Material
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={materials}
        searchPlaceholder="Search materials..."
        pageSize={10}
        emptyText={loading ? "Loading materials..." : "No materials configured."}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-900 border-border max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Material" : "Add Material"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs mt-2">
            <div>
              <label className="font-semibold block mb-1">Material Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Vinyl Glossy"
                required
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Material specifications..."
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Cost Per Unit (paise/cents)</label>
              <Input
                type="number"
                value={formData.cost_per_unit_cents}
                onChange={(e) => setFormData({ ...formData, cost_per_unit_cents: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.waterproof}
                  onChange={(e) => setFormData({ ...formData, waterproof: e.target.checked })}
                />
                Waterproof
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.uv_resistant}
                  onChange={(e) => setFormData({ ...formData, uv_resistant: e.target.checked })}
                />
                UV Resistant
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.scratch_resistant}
                  onChange={(e) => setFormData({ ...formData, scratch_resistant: e.target.checked })}
                />
                Scratch Resistant
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.food_safe}
                  onChange={(e) => setFormData({ ...formData, food_safe: e.target.checked })}
                />
                Food Safe
              </label>
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
