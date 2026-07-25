"use client";

import * as React from "react";
import Link from "next/link";
import {
  User,
  Package,
  Heart,
  Settings,
  MapPin,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Truck,
  CheckCircle2,
  Clock,
  Palette,
  LogOut,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

const MOCK_ORDERS = [
  {
    id: "ORD-SNV-98421",
    date: "2026-07-20",
    status: "Delivered",
    statusColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    items: [
      { name: "Holographic Cyberpunk Vinyl Sticker (3x3 in)", qty: 3, priceCents: 14900, image: "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=300" },
      { name: "Custom Spotify Acrylic Plaque (Neon Pink)", qty: 1, priceCents: 99900, image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300" },
    ],
    totalCents: 144600,
    trackingNumber: "DLV-9842104-IN",
  },
  {
    id: "ORD-SNV-87102",
    date: "2026-07-24",
    status: "In Transit",
    statusColor: "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20",
    items: [
      { name: "Anime Vaporwave Die-Cut Sticker Pack (10 Pcs)", qty: 1, priceCents: 39900, image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300" },
    ],
    totalCents: 39900,
    trackingNumber: "DLV-8710200-IN",
  },
];

const MOCK_SAVED_DESIGNS = [
  {
    id: "DSGN-001",
    name: "Cyber Neon Helmet Vinyl",
    type: "Vinyl Sticker",
    date: "2026-07-22",
    thumbnail: "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=300",
    specs: "3x3 in · Holographic · Die-cut",
  },
  {
    id: "DSGN-002",
    name: "Starboy - The Weeknd Plaque",
    type: "Spotify Plaque",
    date: "2026-07-18",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300",
    specs: "Clear Acrylic · Neon Pink Glow · Scannable",
  },
];

import { createBrowser } from "@/lib/supabase/client";

export default function AccountPage() {
  const [activeTab, setActiveTab] = React.useState<"orders" | "designs" | "addresses" | "settings">("orders");
  const [userProfile, setUserProfile] = React.useState<{ name: string; email: string; phone?: string } | null>(null);
  const [orders, setOrders] = React.useState(MOCK_ORDERS);
  const [loadingUser, setLoadingUser] = React.useState(true);

  React.useEffect(() => {
    async function loadAccountData() {
      const client = createBrowser();
      if (!client) {
        setLoadingUser(false);
        return;
      }
      try {
        const { data: { user } } = await client.auth.getUser();
        if (user) {
          setUserProfile({
            name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Stix Fan",
            email: user.email || "",
            phone: user.phone || "",
          });
          // Fetch real customer orders
          const { data: dbOrders } = await client
            .from("orders")
            .select("*, order_items(*)")
            .eq("customer_email", user.email)
            .order("created_at", { ascending: false });

          if (dbOrders && dbOrders.length > 0) {
            const formatted = dbOrders.map((o: any) => ({
              id: o.id,
              date: new Date(o.created_at).toISOString().split("T")[0],
              status: o.status === "sent" ? "In Transit" : o.status,
              statusColor: o.status === "delivered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20",
              items: (o.order_items || []).map((i: any) => ({
                name: i.name,
                qty: i.quantity,
                priceCents: i.price_cents,
                image: i.image_url || "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=300",
              })),
              totalCents: o.total_cents,
              trackingNumber: `TRACK-${o.id.substring(0, 8).toUpperCase()}`,
            }));
            setOrders(formatted);
          }
        }
      } catch (err) {
        console.warn("[account] failed to load Supabase profile:", err);
      } finally {
        setLoadingUser(false);
      }
    }
    loadAccountData();
  }, []);

  const handleSignOut = async () => {
    const client = createBrowser();
    if (client) {
      await client.auth.signOut();
      window.location.href = "/login";
    }
  };

  const displayName = userProfile?.name || "Alex Rivera";
  const displayEmail = userProfile?.email || "alex.rivera@example.com";
  const initialLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-slate-950 text-white min-h-screen pt-28 pb-16">
      <Container>
        {/* Profile Header */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-yellow via-brand-red to-brand-purple p-0.5 shadow-lg">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-display font-bold text-2xl text-white">
                  {initialLetter}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">{displayName}</h1>
                  <Badge variant="brand" className="text-xs uppercase tracking-wider">VIP Member</Badge>
                </div>
                <p className="text-slate-400 text-sm mt-0.5">{displayEmail} {userProfile?.phone && `· ${userProfile.phone}`}</p>
              </div>
            </div>

            {/* Metrics & SignOut */}
            <div className="flex items-center gap-4 border-t sm:border-t-0 border-slate-800 pt-4 sm:pt-0 w-full sm:w-auto">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-center min-w-[100px]">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total Orders</p>
                <p className="font-display font-bold text-xl text-white mt-0.5">{orders.length}</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-center min-w-[100px]">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Vibes Points</p>
                <p className="font-display font-bold text-xl text-brand-yellow mt-0.5">350 pts</p>
              </div>
              {userProfile && (
                <Button variant="outline" size="sm" onClick={handleSignOut} className="border-slate-800 text-slate-400 hover:text-white">
                  <LogOut className="w-4 h-4 mr-1" /> Logout
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center justify-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "orders" ? "bg-brand-yellow text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Package className="w-4 h-4 mr-2" /> My Orders
          </button>
          <button
            onClick={() => setActiveTab("designs")}
            className={`flex items-center justify-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "designs" ? "bg-brand-yellow text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Palette className="w-4 h-4 mr-2" /> Saved Designs
          </button>
          <button
            onClick={() => setActiveTab("addresses")}
            className={`flex items-center justify-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "addresses" ? "bg-brand-yellow text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <MapPin className="w-4 h-4 mr-2" /> Addresses
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center justify-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === "settings" ? "bg-brand-yellow text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4 mr-2" /> Settings
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <h2 className="font-display text-xl font-bold text-white mb-4">Order History ({MOCK_ORDERS.length})</h2>
            {MOCK_ORDERS.map((order) => (
              <Card key={order.id} className="bg-slate-900/60 border-slate-800 rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-950/60 border-b border-slate-800/80 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg font-bold font-display">{order.id}</CardTitle>
                        <Badge className={`${order.statusColor} border`}>{order.status}</Badge>
                      </div>
                      <CardDescription className="text-xs text-slate-400 mt-1">Placed on {order.date} · Tracking: {order.trackingNumber}</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total Amount</p>
                      <p className="font-display font-bold text-lg text-brand-yellow">{formatPrice(order.totalCents)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover border border-slate-800 bg-slate-950" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-white truncate">{item.name}</h4>
                        <p className="text-xs text-slate-400">Qty: {item.qty} × {formatPrice(item.priceCents)}</p>
                      </div>
                      <Button variant="outline" size="sm" asChild className="border-slate-700 text-slate-300 hover:text-white">
                        <Link href="/customize/sticker-builder">Reorder</Link>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Saved Designs Tab */}
        {activeTab === "designs" && (
          <div className="space-y-6">
            <h2 className="font-display text-xl font-bold text-white mb-4">Your Studio Drafts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MOCK_SAVED_DESIGNS.map((design) => (
                <div key={design.id} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex gap-5 items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={design.thumbnail} alt={design.name} className="w-20 h-20 rounded-2xl object-cover border border-slate-800 bg-slate-950" />
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="text-xs border-brand-yellow/30 text-brand-yellow mb-1">{design.type}</Badge>
                    <h3 className="font-display font-bold text-white text-base truncate">{design.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{design.specs}</p>
                    <div className="flex gap-2 mt-4">
                      <Button variant="gradient" size="sm" asChild>
                        <Link href="/customize/sticker-builder">Open in Studio</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === "addresses" && (
          <div className="space-y-6">
            <h2 className="font-display text-xl font-bold text-white mb-4">Saved Shipping Addresses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/60 border border-brand-yellow/40 rounded-3xl p-6 space-y-3 relative">
                <Badge className="bg-brand-yellow text-slate-950 font-bold text-xs uppercase">Default Shipping</Badge>
                <h3 className="font-bold text-white text-lg">Home Address</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Alex Rivera<br />
                  #42, 10th Main, Indiranagar<br />
                  Bengaluru, Karnataka — 560038<br />
                  Phone: +91 98765 43210
                </p>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="border-slate-700">Edit Address</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <Card className="bg-slate-900/60 border-slate-800 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold font-display">Profile Settings</CardTitle>
                <CardDescription>Update your personal information and preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Full Name</label>
                  <input type="text" defaultValue="Alex Rivera" className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-yellow" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
                  <input type="email" defaultValue="alex.rivera@example.com" className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-yellow" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Phone Number</label>
                  <input type="text" defaultValue="+91 98765 43210" className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-yellow" />
                </div>
                <div className="pt-4">
                  <Button variant="gradient" size="lg">Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Container>
    </div>
  );
}
