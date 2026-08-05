"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Save, Truck, CreditCard, Bell, Globe } from "lucide-react";

const CATEGORIES = [
  { id: "general", label: "General", icon: Settings },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "seo", label: "SEO", icon: Globe },
];

const DEFAULT_SETTINGS: Record<string, Record<string, string>> = {
  general: { store_name: "Stix N Vibes", store_email: "contact@stixnvibes.com", store_phone: "", store_address: "" },
  shipping: { free_shipping_threshold: "50000", default_shipping_cost: "5000", shipping_zones: "India" },
  payment: { whatsapp_number: "", payment_methods: "UPI, Bank Transfer" },
  notifications: { order_email_enabled: "true", admin_email: "" },
  seo: { default_title: "Stix N Vibes", default_description: "Custom stickers and posters.", google_analytics_id: "" }
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        
        const grouped: Record<string, Record<string, string>> = {};
        for (const cat of CATEGORIES) {
          grouped[cat.id] = { ...DEFAULT_SETTINGS[cat.id] };
        }
        
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (grouped[item.category]) {
              grouped[item.category][item.key] = item.value;
            }
          });
        }
        setSettings(grouped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const token = localStorage.getItem("snv.admin.accessToken");
      const payload = Object.entries(settings[activeTab]).map(([key, value]) => ({
        category: activeTab,
        key,
        value
      }));
      
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ settings: payload })
      });
      
      if (res.ok) {
        setMessage("Settings saved successfully.");
      } else {
        setMessage("Error saving settings.");
      }
    } catch (e) {
      console.error(e);
      setMessage("Error saving settings.");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [key]: value
      }
    }));
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading settings...</div>;

  const currentSettings = settings[activeTab] || {};

  return (
    <div className="flex flex-col space-y-6 p-6 pb-20 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">Configure your store's global preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <Card className="w-full md:w-64 bg-slate-900/60 border-border/80 h-fit shrink-0">
          <CardContent className="p-2 space-y-1">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-brand-yellow/10 text-brand-yellow" : "text-muted-foreground hover:bg-slate-800/50 hover:text-foreground"}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="flex-1 bg-slate-900/60 border-border/80">
          <CardHeader>
            <CardTitle className="text-lg capitalize">{CATEGORIES.find(c => c.id === activeTab)?.label} Settings</CardTitle>
            <CardDescription className="text-xs">Update your {activeTab} configuration here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(currentSettings).map(key => (
              <div key={key} className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {key.replace(/_/g, " ")}
                </label>
                <Input
                  value={currentSettings[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="bg-slate-950/50 border-border/50 text-sm max-w-md"
                />
              </div>
            ))}
            
            <div className="pt-6 flex items-center space-x-4">
              <Button onClick={handleSave} disabled={saving} variant="default" size="sm">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              {message && <span className="text-xs text-brand-yellow">{message}</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
