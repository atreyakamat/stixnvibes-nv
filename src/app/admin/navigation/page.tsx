"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation as NavIcon, Save, Plus, Trash2, CheckCircle2, Link as LinkIcon, Share2 } from "lucide-react";

type NavLinkItem = { label: string; url: string };

export default function NavigationBuilderPage() {
  const [headerMenu, setHeaderMenu] = useState<NavLinkItem[]>([]);
  const [footerMenu, setFooterMenu] = useState<NavLinkItem[]>([]);
  const [socials, setSocials] = useState({ instagram: "", whatsapp: "", facebook: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchNavigation();
  }, []);

  const fetchNavigation = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/navigation", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok && json.data) {
          setHeaderMenu(json.data.header_menu || []);
          setFooterMenu(json.data.footer_menu || []);
          setSocials(json.data.social_links || { instagram: "", whatsapp: "", facebook: "" });
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  const addHeaderItem = () => setHeaderMenu((prev) => [...prev, { label: "New Link", url: "/shop" }]);
  const removeHeaderItem = (idx: number) => setHeaderMenu((prev) => prev.filter((_, i) => i !== idx));

  const addFooterItem = () => setFooterMenu((prev) => [...prev, { label: "New Link", url: "/policies" }]);
  const removeFooterItem = (idx: number) => setFooterMenu((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/navigation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          navigation: {
            header_menu: headerMenu,
            footer_menu: footerMenu,
            social_links: socials,
          },
        }),
      });
      if (res.ok) {
        setMessage("Navigation menus saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to save navigation.");
      }
    } catch {
      setMessage("Error saving navigation.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading navigation builder...</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-brand-yellow text-slate-950 shadow-glow">
            <NavIcon className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Navigation & Footer Builder</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage header menus, footer columns, social links, and policy links without touching code.
            </p>
          </div>
        </div>
        <Button variant="gradient" size="sm" onClick={handleSave} disabled={saving}>
          <Save className="size-4 mr-1.5" />
          {saving ? "Saving..." : "Save Navigation"}
        </Button>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          {message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Header Navigation */}
        <Card className="border-border/80 bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <LinkIcon className="size-4 text-brand-yellow" /> Main Header Menu
              </CardTitle>
              <CardDescription className="text-xs">Primary navbar links visible across all pages.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addHeaderItem} className="h-7 text-[11px]">
              <Plus className="size-3 mr-1" /> Add Link
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {headerMenu.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={item.label}
                  onChange={(e) => {
                    const copy = [...headerMenu];
                    copy[idx].label = e.target.value;
                    setHeaderMenu(copy);
                  }}
                  placeholder="Label..."
                  className="text-xs flex-1"
                />
                <Input
                  value={item.url}
                  onChange={(e) => {
                    const copy = [...headerMenu];
                    copy[idx].url = e.target.value;
                    setHeaderMenu(copy);
                  }}
                  placeholder="/url..."
                  className="text-xs flex-1 font-mono"
                />
                <Button variant="ghost" size="sm" onClick={() => removeHeaderItem(idx)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Footer Links & Socials */}
        <div className="space-y-6">
          <Card className="border-border/80 bg-slate-900/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <LinkIcon className="size-4 text-brand-yellow" /> Footer Menu Links
                </CardTitle>
                <CardDescription className="text-xs">Quick links and policy links in footer.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addFooterItem} className="h-7 text-[11px]">
                <Plus className="size-3 mr-1" /> Add Link
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {footerMenu.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={item.label}
                    onChange={(e) => {
                      const copy = [...footerMenu];
                      copy[idx].label = e.target.value;
                      setFooterMenu(copy);
                    }}
                    placeholder="Label..."
                    className="text-xs flex-1"
                  />
                  <Input
                    value={item.url}
                    onChange={(e) => {
                      const copy = [...footerMenu];
                      copy[idx].url = e.target.value;
                      setFooterMenu(copy);
                    }}
                    placeholder="/url..."
                    className="text-xs flex-1 font-mono"
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeFooterItem(idx)} className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Share2 className="size-4 text-brand-yellow" /> Social Media Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Instagram URL</label>
                <Input
                  value={socials.instagram}
                  onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
                  placeholder="https://instagram.com/stixnvibes"
                  className="text-xs mt-1 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-muted-foreground">WhatsApp Direct URL</label>
                <Input
                  value={socials.whatsapp}
                  onChange={(e) => setSocials({ ...socials, whatsapp: e.target.value })}
                  placeholder="https://wa.me/917744020601"
                  className="text-xs mt-1 font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
