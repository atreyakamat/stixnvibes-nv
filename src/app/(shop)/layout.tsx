import { CartProvider } from "@/components/cart/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { GlassSheen } from "@/components/glass-sheen";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { campaignBanner } from "@/lib/pricing";
import { getShopState } from "@/lib/shop";

// Header notice and offers read settings; refresh the cached shell every minute.
export const revalidate = 60;

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const { settings, offers } = await getShopState();
  const notice = campaignBanner(offers) || settings.announcement || (!settings.storeOpen ? "Online orders are paused. Message us on Instagram to order." : "");
  const config = {
    offers,
    storeOpen: settings.storeOpen,
    instagramHandle: settings.instagramHandle,
    orderNote: settings.orderNote,
    bulkNote: settings.bulkNote,
    freeShippingAbovePaise: settings.freeShippingAbovePaise,
    mrpMarkupPercent: settings.mrpMarkupPercent,
  };

  return (
    <CartProvider config={config}>
      <a href="#main" className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80]">
        Skip to content
      </a>
      <SiteHeader notice={notice} />
      <main id="main" className="flex-1">
        <GlassSheen />
        {children}
      </main>
      <SiteFooter />
      <CartDrawer />
      <div className="grain" aria-hidden="true" />
    </CartProvider>
  );
}
