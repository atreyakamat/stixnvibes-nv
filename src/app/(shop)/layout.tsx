import { CartProvider } from "@/components/cart/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { GlassSheen } from "@/components/glass-sheen";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getShopState } from "@/lib/shop";

// Header notice reads settings; refresh the cached shell every minute.
export const revalidate = 60;

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const { settings } = await getShopState();
  const notice = settings?.announcement || (settings && !settings.storeOpen ? "Online orders open soon. Message us on Instagram to order now." : "");

  return (
    <CartProvider>
      <a
        href="#main"
        className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80]"
      >
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
