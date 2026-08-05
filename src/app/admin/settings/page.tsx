"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Save, Truck, CreditCard, Bell, Globe, Sliders, CheckCircle2 } from "lucide-react";

const CATEGORIES = [
  { id: "general", label: "General", icon: Settings },
  { id: "features", label: "Storefront Features", icon: Sliders },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "seo", label: "SEO", icon: Globe },
];

const DEFAULT_SETTINGS: Record<string, Record<string, any>> = {
  general: { store_name: "Stix N Vibes", store_email: "contact@stixnvibes.com", store_phone: "", store_address: "" },
  features: {
    collections_enabled: true,
    materials_enabled: true,
    paper_materials_enabled: true,
    homepage_banner_enabled: true,
    reviews_enabled: true,
    wishlist_enabled: true,
    search_enabled: true,
    categories_enabled: true,
    custom_orders_enabled: true,
    offers_enabled: true,
    free_shipping_banner_enabled: true,
  },
  shipping: { free_shipping_threshold: "50000", default_shipping_cost: "5000", shipping_zones: "India" },
  payment: { whatsapp_number: "", payment_methods: "UPI, Bank Transfer" },
  notifications: { order_email_enabled: "true", admin_email: "" },
  seo: { default_title: "Stix N Vibes", default_description: "Custom stickers and posters.", google_analytics_id: "" }
};

const FEATURE_LABELS: Record<string, { label: string; description: string }> = {
  collections_enabled: { label: "Collections System", description: "Enable collections on storefront, shop filters, and navigation" },
  materials_enabled: { label: "Materials System", description: "Enable material options (Vinyl, Holographic, Paper, Acrylic, etc.)" },
  paper_materials_enabled: { label: "Paper Materials", description: "Allow paper material options (Glossy Paper, Matte Paper, Photo Paper)" },
  homepage_banner_enabled: { label: "Homepage Hero Banner", description: "Display promotional hero banner section on homepage" },
  reviews_enabled: { label: "Customer Reviews", description: "Display product rating badges and review comments on storefront" },
  wishlist_enabled: { label: "Wishlist System", description: "Allow customers to save favorite items to wishlist" },
  search_enabled: { label: "Search Bar", description: "Enable instant catalog search bar in header and shop page" },
  categories_enabled: { label: "Categories System", description: "Enable category hierarchy on storefront navigation and shop page" },
  custom_orders_enabled: { label: "Live Customizer Orders", description: "Enable live preview customizer for stickers, posters, and Spotify cards" },
  offers_enabled: { label: "Offers & Discounts Strip", description: "Highlight promotional offers filter and discount tags" },
  free_shipping_banner_enabled: { label: "Free Shipping Threshold Bar", description: "Display free shipping announcement banner" },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<Record<string, Record<string, any>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
      const res = await fetch("/api/admin/settings", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        
        const grouped: Record<string, Record<string, any>> = {};
        for (const cat of CATEGORIES) {
          grouped[cat.id] = { ...DEFAULT_SETTINGS[cat.id] };
        }
        
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (grouped[item.category]) {
              const val = typeof item.value === "object" && item.value !== null && "value" in item.value ? item.value.value : item.value;
              grouped[item.category][item.key] = val;
            }
          });
        }
        setSettings(grouped);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, val: any) => {
    setSettings((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [key]: val,
      },
    }));
  };

  const saveTabSettings = async () => {
    setSaving(true);
    setMessage("");
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const tabData = settings[activeTab] || {};
      
      const payload = Object.keys(tabData).map((k) => ({
        key: k,
        value: typeof tabData[k] === "boolean" ? tabData[k] : { value: tabData[k] },
        category: activeTab,
      }));

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: payload }),
      });

      if (res.ok) {
        setMessage("Settings saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to save settings.");
      }
    } catch {
      setMessage("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
  }

  const currentTabValues = settings[activeTab] || {};

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Store Configuration &amp; Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage global store parameters and dynamic storefront feature toggles.</p>
        </div>
        <Button variant="gradient" size="sm" onClick={saveTabSettings} disabled={saving}>
          <Save className="size-4 mr-1.5" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                active ? "bg-brand-yellow text-slate-950 shadow-soft" : "text-muted-foreground hover:bg-slate-900 hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <Card className="border-border/80 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="capitalize text-lg">{activeTab} Settings</CardTitle>
          <CardDescription className="text-xs">
            {activeTab === "features" ? "Toggle storefront feature systems on/off in real-time." : `Configure ${activeTab} values.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeTab === "features" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(currentTabValues).map((key) => {
                const info = FEATURE_LABELS[key] || { label: key, description: "" };
                const enabled = Boolean(currentTabValues[key]);
                return (
                  <div key={key} className="flex items-start justify-between p-3.5 rounded-xl border border-border/60 bg-slate-950/60">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold">{info.label}</p>
                      <p className="text-[10px] text-muted-foreground">{info.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => handleInputChange(key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-yellow"></div>
                    </label>
                  </div>
                );
              })}
            </div>
          ) : (
            Object.keys(currentTabValues).map((key) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-semibold capitalize text-muted-foreground">
                  {key.replace(/_/g, " ")}
                </label>
                <Input
                  value={currentTabValues[key]}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  placeholder={`Enter ${key}...`}
                  className="text-xs"
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
