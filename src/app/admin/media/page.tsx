"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Upload, Search, Copy, Check, Trash2, ExternalLink } from "lucide-react";

type MediaFile = {
  name: string;
  url: string;
  size?: number;
  created_at?: string;
};

export default function MediaLibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  useEffect(() => {
    fetchMediaFiles();
  }, []);

  const fetchMediaFiles = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/media", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok && Array.isArray(json.data)) {
          setFiles(json.data);
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json();
      if (json?.ok && json.url) {
        fetchMediaFiles();
      }
    } catch {
      // Handled gracefully
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete image "${filename}"?`)) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch(`/api/admin/media?path=products/${encodeURIComponent(filename)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.name !== filename));
      }
    } catch {
      // Handled gracefully
    }
  };

  const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading media library...</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-brand-yellow text-slate-950 shadow-glow">
            <ImageIcon className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Media Library</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload, manage, and copy URLs for product images, banners, and marketing assets.
            </p>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-gradient text-slate-950 font-bold text-xs shadow-glow cursor-pointer hover:opacity-90 transition-opacity">
          <Upload className="size-4" />
          {uploading ? "Uploading..." : "Upload Media"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search media by filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      {/* Media Grid */}
      {filteredFiles.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-slate-900/40 p-12 text-center text-muted-foreground text-xs">
          No media assets found. Click &quot;Upload Media&quot; to upload images to Supabase Storage.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.name} className="group border-border/80 bg-slate-900/60 overflow-hidden hover:border-brand-yellow/50 transition-all">
              <div className="aspect-square relative overflow-hidden bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.url} alt={file.name} className="size-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => handleCopy(file.url)}
                    className="h-8 px-2 text-[10px]"
                    title="Copy URL"
                  >
                    {copiedUrl === file.url ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </Button>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-8 place-items-center rounded-xl bg-slate-900 text-slate-100 hover:text-brand-yellow transition-colors"
                    title="Open Full Image"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(file.name)}
                    className="grid size-8 place-items-center rounded-xl bg-red-950/80 text-red-400 hover:bg-red-900 hover:text-red-200 transition-colors"
                    title="Delete Image"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <CardContent className="p-2.5 space-y-1">
                <p className="text-[11px] font-semibold truncate text-foreground" title={file.name}>
                  {file.name}
                </p>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono">
                  <span>{file.size ? `${(file.size / 1024).toFixed(0)} KB` : "Asset"}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(file.url)}
                    className="text-brand-yellow hover:underline"
                  >
                    {copiedUrl === file.url ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
