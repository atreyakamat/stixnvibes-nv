"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Package, FolderTree, Tags as TagsIcon, Layers, Box,
  BarChart3, Users, ShoppingBag, FileText, Sliders,
  Activity, ShoppingCart, Printer, ShieldCheck, QrCode, Truck,
  Menu, LogOut, LayoutTemplate, Image as ImageIcon
} from "lucide-react";

class AdminErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Admin ErrorBoundary caught error]:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 space-y-4">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
            <h2 className="text-lg font-bold">Admin Component Error</h2>
            <p className="text-xs font-mono mt-2">{this.state.error?.message ?? "An unknown rendering error occurred."}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-3 py-1.5 rounded-lg bg-red-500/20 text-xs font-semibold text-red-300 hover:bg-red-500/30"
            >
              Try Reloading Component
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authed, setAuthed] = React.useState(false);
  const [checkingAuth, setCheckingAuth] = React.useState(true);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("snv.admin.accessToken") : null;
    const hasCookieToken = typeof document !== "undefined" && document.cookie.includes("snv_admin_token");
    
    if (!token && !hasCookieToken) {
      setCheckingAuth(false);
      router.replace("/login?redirect=" + encodeURIComponent(pathname || "/admin"));
      return;
    }
    setAuthed(true);
    setCheckingAuth(false);
  }, [router, pathname]);

  function logout() {
    localStorage.removeItem("snv.admin.accessToken");
    document.cookie = "snv_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.replace("/login");
  }

  if (checkingAuth || !authed) {
    return (
      <div className="grid min-h-screen bg-slate-950 place-items-center text-slate-100 font-sans">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <div className="grid size-8 place-items-center rounded-xl bg-brand-yellow font-black text-slate-950 animate-pulse">
            SNV
          </div>
          <span className="flex items-center gap-2">
            Loading Admin Session...
          </span>
        </div>
      </div>
    );
  }

  const currentModule = searchParams.get("module") || "ops_kanban";

  const opsItems = [
    { id: "ops_dashboard", label: "Production Dashboard", icon: <Activity className="size-4 shrink-0" /> },
    { id: "ops_kanban", label: "Order Management Engine", icon: <ShoppingCart className="size-4 shrink-0" /> },
    { id: "ops_print_queue", label: "Print Queue Engine", icon: <Printer className="size-4 shrink-0" /> },
    { id: "ops_qc", label: "Quality Control (QC)", icon: <ShieldCheck className="size-4 shrink-0" /> },
    { id: "ops_packing", label: "Packing Station", icon: <QrCode className="size-4 shrink-0" /> },
    { id: "ops_shipping", label: "Shipping Integration", icon: <Truck className="size-4 shrink-0" /> },
    { id: "ops_analytics", label: "Operations Analytics", icon: <BarChart3 className="size-4 shrink-0" /> },
  ];

  const pimItems = [
    { id: "pim_catalog", href: "/admin/products", label: "Product Catalog", icon: <Package className="size-4 shrink-0" /> },
    { id: "pim_collections", href: "/admin/collections", label: "Collections", icon: <FolderTree className="size-4 shrink-0" /> },
    { id: "pim_categories", href: "/admin/categories", label: "Categories", icon: <TagsIcon className="size-4 shrink-0" /> },
    { id: "pim_materials", href: "/admin/materials", label: "Materials", icon: <Layers className="size-4 shrink-0" /> },
    { id: "pim_sizes", href: "/admin/sizes", label: "Sizes", icon: <Box className="size-4 shrink-0" /> },
  ];

  const bizItems = [
    { id: "biz_dashboard", href: "/admin/dashboard", label: "Dashboard", icon: <BarChart3 className="size-4 shrink-0" /> },
    { id: "biz_homepage", href: "/admin/homepage", label: "Homepage Builder", icon: <LayoutTemplate className="size-4 shrink-0" /> },
    { id: "biz_media", href: "/admin/media", label: "Media Library", icon: <ImageIcon className="size-4 shrink-0" /> },
    { id: "biz_customers", href: "/admin/customers", label: "Customers", icon: <Users className="size-4 shrink-0" /> },
    { id: "biz_orders", href: "/admin/orders", label: "Orders", icon: <ShoppingBag className="size-4 shrink-0" /> },
    { id: "biz_pages", href: "/admin/pages", label: "Page Builder", icon: <FileText className="size-4 shrink-0" /> },
    { id: "biz_settings", href: "/admin/settings", label: "Settings", icon: <Sliders className="size-4 shrink-0" /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-yellow selection:text-slate-950">
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } shrink-0 border-r border-border/80 bg-slate-900/90 transition-all duration-200 flex flex-col justify-between p-3 z-30`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between px-2 py-3 border-b border-border/60 shrink-0">
            <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
              <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-yellow font-black text-slate-950 shadow-glow">
                SNV
              </div>
              {sidebarOpen && (
                <div>
                  <p className="font-display font-bold text-sm leading-none">Stix N Vibes</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Admin Portal v4.0</p>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
            >
              <Menu className="size-4" />
            </button>
          </div>

          <nav className="mt-4 space-y-6 text-xs font-semibold overflow-y-auto pb-4 [&::-webkit-scrollbar]:hidden">
            {/* Ops Section */}
            <div>
              {sidebarOpen && <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Operations Platform</p>}
              <div className="space-y-1">
                {opsItems.map((item) => {
                  const active = pathname === "/admin" && currentModule === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={`/admin?module=${item.id}`}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                        active
                          ? "bg-brand-yellow text-slate-950 font-bold shadow-soft"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Business Section */}
            <div>
              {sidebarOpen && <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Business Section</p>}
              <div className="space-y-1">
                {pimItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                        active
                          ? "bg-brand-yellow text-slate-950 font-bold shadow-soft"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Business Operations */}
            <div>
              {sidebarOpen && <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Business Operations</p>}
              <div className="space-y-1">
                {bizItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                        active
                          ? "bg-brand-yellow text-slate-950 font-bold shadow-soft"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {item.icon}
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        <div className="border-t border-border/60 pt-3 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center justify-between px-2">
              <div className="truncate">
                <p className="text-xs font-bold truncate">Admin User</p>
                <p className="text-[10px] text-muted-foreground truncate">admin@stixnvibes.com</p>
              </div>
              <button type="button" onClick={logout} className="text-muted-foreground hover:text-red-400 p-1" title="Logout">
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={logout} className="w-full flex justify-center py-2 text-muted-foreground hover:text-red-400">
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-950">
        <AdminErrorBoundary>
          {children}
        </AdminErrorBoundary>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense
      fallback={
        <div className="grid min-h-screen bg-slate-950 place-items-center text-slate-100 font-sans">
          <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            <div className="grid size-8 place-items-center rounded-xl bg-brand-yellow font-black text-slate-950 animate-pulse">
              SNV
            </div>
            <span>Loading Admin Portal...</span>
          </div>
        </div>
      }
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </React.Suspense>
  );
}
