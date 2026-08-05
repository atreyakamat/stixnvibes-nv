"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Palette, Save, CheckCircle2, Megaphone, Image as ImageIcon, Sparkles } from "lucide-react";

export default function ThemeSettingsPage() {
  const [theme, setTheme] = useState({
    announcement_enabled: true,
    announcement_text: "",
    announcement_link: "",
    logo_url: "",
    primary_color: "#FFB200",
    accent_color: "#E5261F",
    hero_title: "",
    hero_subheadline: "",
    footer_tagline: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchTheme();
  }, []);

  const fetchTheme = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/theme", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok && json.data) {
          setTheme(json.data);
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/theme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme }),
      });
      if (res.ok) {
        setMessage("Theme settings saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to save theme settings.");
      }
    } catch {
      setMessage("Error saving theme settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading theme settings...</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-brand-yellow text-slate-950 shadow-glow">
            <Palette className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Theme & Branding Engine</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control logo, primary brand colors, announcement banner, and hero typography without code.
            </p>
          </div>
        </div>
        <Button variant="gradient" size="sm" onClick={handleSave} disabled={saving}>
          <Save className="size-4 mr-1.5" />
          {saving ? "Saving..." : "Save Theme"}
        </Button>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          {message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Announcement Bar */}
        <Card className="border-border/80 bg-slate-900/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Megaphone className="size-4 text-brand-yellow" /> Announcement Bar
              </CardTitle>
              <Badge variant={theme.announcement_enabled ? "brand" : "outline"} size="sm">
                {theme.announcement_enabled ? "Active" : "Disabled"}
              </Badge>
            </div>
            <CardDescription className="text-xs">Top notification strip visible across all storefront pages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Enable Announcement Bar</span>
              <input
                type="checkbox"
                checked={theme.announcement_enabled}
                onChange={(e) => setTheme({ ...theme, announcement_enabled: e.target.checked })}
                className="size-4 accent-brand-yellow cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Announcement Text</label>
              <Input
                value={theme.announcement_text}
                onChange={(e) => setTheme({ ...theme, announcement_text: e.target.value })}
                placeholder="⚡ FREE Shipping on orders above ₹499!"
                className="text-xs mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Announcement Target URL</label>
              <Input
                value={theme.announcement_link}
                onChange={(e) => setTheme({ ...theme, announcement_link: e.target.value })}
                placeholder="/shop"
                className="text-xs mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Colors & Logo */}
        <Card className="border-border/80 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Palette className="size-4 text-brand-yellow" /> Brand Colors & Logo
            </CardTitle>
            <CardDescription className="text-xs">Brand color tokens and header logo URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Logo URL</label>
              <Input
                value={theme.logo_url}
                onChange={(e) => setTheme({ ...theme, logo_url: e.target.value })}
                placeholder="/logo.svg"
                className="text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Primary Brand Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={theme.primary_color}
                    onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                    className="size-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <Input
                    value={theme.primary_color}
                    onChange={(e) => setTheme({ ...theme, primary_color: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Accent Brand Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={theme.accent_color}
                    onChange={(e) => setTheme({ ...theme, accent_color: e.target.value })}
                    className="size-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <Input
                    value={theme.accent_color}
                    onChange={(e) => setTheme({ ...theme, accent_color: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
