"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Edit2, Trash2, Loader2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type PageRow = {
  id: string;
  title: string;
  slug: string;
  content: any;
  is_published: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

const defaultPages = [
  { title: "About Us", slug: "about" },
  { title: "Shipping Policy", slug: "shipping" },
  { title: "Return Policy", slug: "returns" },
  { title: "Privacy Policy", slug: "privacy" },
  { title: "Terms of Service", slug: "terms" },
  { title: "FAQ", slug: "faq" },
];

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editPage, setEditPage] = useState<PageRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    is_published: false,
    seo_title: "",
    seo_description: "",
  });

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/pages");
      const json = await res.json();
      if (json.success) {
        setPages(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleOpenDialog = (page?: PageRow) => {
    setErrorMsg("");
    setSuccessMsg("");
    if (page) {
      setEditPage(page);
      setFormData({
        title: page.title,
        slug: page.slug,
        content: typeof page.content === "object" ? (page.content as any)?.text || "" : page.content || "",
        is_published: page.is_published,
        seo_title: page.seo_title || "",
        seo_description: page.seo_description || "",
      });
    } else {
      setEditPage(null);
      setFormData({
        title: "",
        slug: "",
        content: "",
        is_published: false,
        seo_title: "",
        seo_description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      slug: editPage ? prev.slug : title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-"),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        id: editPage?.id,
        title: formData.title,
        slug: formData.slug,
        content: { text: formData.content },
        is_published: formData.is_published,
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
      };

      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMsg("Page saved successfully.");
        fetchPages();
        setTimeout(() => setIsDialogOpen(false), 1000);
      } else {
        setErrorMsg(json.error?.message || "Failed to save page");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/pages?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setPages(pages.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleTogglePublish = async (page: PageRow) => {
    try {
      const payload = {
        id: page.id,
        is_published: !page.is_published,
      };
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setPages(pages.map((p) => (p.id === page.id ? { ...p, is_published: !p.is_published } : p)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const seedDefaults = async () => {
    setLoading(true);
    try {
      for (const p of defaultPages) {
        await fetch("/api/admin/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: p.title,
            slug: p.slug,
            content: { text: `Content for ${p.title}` },
            is_published: false,
          }),
        });
      }
      await fetchPages();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <FileText className="size-6 text-brand-yellow" />
          <h1 className="font-display text-2xl font-bold tracking-tight">Page Builder</h1>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="size-4" /> New Page
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin mb-4" />
          <p>Loading pages...</p>
        </div>
      ) : pages.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-slate-900/60 p-12 text-center">
          <FileText className="mx-auto size-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No pages found</h3>
          <p className="text-sm text-muted-foreground mb-6">Create your first page or start with default templates.</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => handleOpenDialog()}>Create Page</Button>
            <Button variant="outline" onClick={seedDefaults}>Seed Defaults</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/80 bg-slate-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last Updated</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{page.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{page.slug}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleTogglePublish(page)} className="focus:outline-none">
                        {page.is_published ? (
                          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Published</Badge>
                        ) : (
                          <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Draft</Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(page.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmDeleteId === page.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-red-400">Sure?</span>
                          <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => handleDelete(page.id)} disabled={deletingId === page.id}>
                            {deletingId === page.id ? <Loader2 className="size-3 animate-spin" /> : "Yes"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setConfirmDeleteId(null)}>No</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="icon" variant="ghost" className="size-8" onClick={() => handleOpenDialog(page)}>
                            <Edit2 className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8 text-red-400 hover:text-red-300 hover:bg-red-950/30" onClick={() => setConfirmDeleteId(page.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl bg-slate-950 border-border/80">
          <DialogHeader>
            <DialogTitle>{editPage ? "Edit Page" : "New Page"}</DialogTitle>
            <DialogDescription>
              {editPage ? "Make changes to your page here." : "Create a new page for your storefront."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input required value={formData.title} onChange={handleTitleChange} placeholder="e.g. About Us" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <Input required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="e.g. about-us" />
                <p className="text-xs text-muted-foreground">URL: stixnvibes.com/{formData.slug || "[slug]"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <textarea
                required
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your page content here..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">SEO Title (Optional)</label>
                <Input value={formData.seo_title} onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })} placeholder="Overrides default title" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SEO Description (Optional)</label>
                <Input value={formData.seo_description} onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })} placeholder="Meta description" />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={formData.is_published ? "published" : "draft"}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.value === "published" })}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-md flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="size-4" /> {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-green-950/50 border border-green-500/50 rounded-md flex items-center gap-2 text-green-400 text-sm">
                <Check className="size-4" /> {successMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                {editPage ? "Save Changes" : "Create Page"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
