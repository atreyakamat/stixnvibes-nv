"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate, Save, ArrowUp, ArrowDown, Eye, EyeOff, CheckCircle2, Sparkles } from "lucide-react";

type HomepageSection = {
  id: string;
  name: string;
  enabled: boolean;
  sort_order: number;
  headline?: string;
  subheadline?: string;
};

export default function HomepageBuilderPage() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchHomepageLayout();
  }, []);

  const fetchHomepageLayout = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/homepage", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok && Array.isArray(json.data)) {
          const sorted = [...json.data].sort((a, b) => a.sort_order - b.sort_order);
          setSections(sorted);
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, enabled: !sec.enabled } : sec))
    );
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Recalculate sort_order
    const reordered = newSections.map((sec, idx) => ({ ...sec, sort_order: idx + 1 }));
    setSections(reordered);
  };

  const updateSectionText = (id: string, field: "headline" | "subheadline", val: string) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, [field]: val } : sec))
    );
  };

  const saveLayout = async () => {
    setSaving(true);
    setMessage("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sections }),
      });

      if (res.ok) {
        setMessage("Homepage layout saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to save layout.");
      }
    } catch {
      setMessage("Error saving homepage layout.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading homepage layout...</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-brand-yellow text-slate-950 shadow-glow">
            <LayoutTemplate className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Homepage Builder</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reorder sections, toggle visibility, and configure marketing headlines dynamically.
            </p>
          </div>
        </div>
        <Button variant="gradient" size="sm" onClick={saveLayout} disabled={saving}>
          <Save className="size-4 mr-1.5" />
          {saving ? "Saving..." : "Save Layout"}
        </Button>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          {message}
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section, index) => (
          <Card
            key={section.id}
            className={`border-border/80 transition-all ${
              section.enabled ? "bg-slate-900/70" : "bg-slate-950/40 opacity-60 border-slate-800"
            }`}
          >
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <span className="text-xs font-mono font-bold text-muted-foreground w-6 text-center">
                  #{section.sort_order}
                </span>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">{section.name}</h3>
                    <Badge variant={section.enabled ? "brand" : "outline"} size="sm">
                      {section.enabled ? "Active" : "Hidden"}
                    </Badge>
                  </div>

                  {section.id === "hero" && (
                    <div className="mt-3 space-y-2 max-w-xl">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hero Headline</label>
                        <Input
                          value={section.headline || ""}
                          onChange={(e) => updateSectionText(section.id, "headline", e.target.value)}
                          placeholder="Headline..."
                          className="text-xs mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hero Subheadline</label>
                        <Input
                          value={section.subheadline || ""}
                          onChange={(e) => updateSectionText(section.id, "subheadline", e.target.value)}
                          placeholder="Subheadline..."
                          className="text-xs mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveSection(index, "up")}
                  disabled={index === 0}
                  title="Move section up"
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveSection(index, "down")}
                  disabled={index === sections.length - 1}
                  title="Move section down"
                >
                  <ArrowDown className="size-3.5" />
                </Button>

                <Button
                  variant={section.enabled ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleSection(section.id)}
                  className="gap-1.5"
                >
                  {section.enabled ? (
                    <>
                      <Eye className="size-3.5 text-brand-yellow" /> Visible
                    </>
                  ) : (
                    <>
                      <EyeOff className="size-3.5 text-muted-foreground" /> Hidden
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
