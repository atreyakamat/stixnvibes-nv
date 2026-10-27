import type { Metadata, Viewport } from "next";
import { StallMode, type StallProduct } from "@/components/stall/stall-mode";
import { requireAdmin } from "@/lib/admin/session";
import { istToday } from "@/lib/costs";
import { liveOffers } from "@/lib/pricing";
import { getStore } from "@/lib/store";
import { tally } from "@/lib/stall";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stall mode", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#070707" };

/**
 * Stall mode: sell at a pop-up from the phone. Everything it needs comes
 * with the page, so once it has loaded it keeps working with no signal.
 */
export default async function StallPage() {
  await requireAdmin();
  const store = getStore();
  const today = istToday();
  const [products, offers, stalls, settings, recent] = await Promise.all([
    store.listProducts({ includeHidden: true }),
    store.listOffers(),
    store.listStalls(),
    store.getSettings(),
    store.listStallSales({ since: new Date(new Date().getTime() - 2 * 86_400_000).toISOString(), limit: 2000 }),
  ]);
  // Anything with a price can be sold at the stall, even if it's hidden online.
  const sellable: StallProduct[] = products
    .filter((p) => p.pricePaise !== null && p.status !== "upcoming")
    .map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      image: p.images[0] ?? null,
      pricePaise: p.pricePaise!,
      options: p.options,
      stock: p.stock,
      hidden: p.status === "hidden",
    }));
  const nearby = stalls.filter((s) => Math.abs(Date.parse(s.date) - Date.parse(today)) <= 14 * 86_400_000);
  const todays = stalls.find((s) => s.date === today) ?? null;
  // What's already on the server for each stall, from any phone.
  const synced = Object.fromEntries(nearby.map((s) => [s.id, { ...tally(recent.filter((x) => x.stallId === s.id)), ids: recent.filter((x) => x.stallId === s.id).map((x) => x.id) }]));

  return (
    <StallMode
      products={sellable}
      offers={liveOffers(offers)}
      stalls={nearby.map((s) => ({ id: s.id, name: s.name, date: s.date, venue: s.venue }))}
      defaultStallId={todays?.id ?? null}
      upi={settings.upiId ? { id: settings.upiId, name: settings.upiName } : null}
      synced={synced}
      loadedAt={new Date().toISOString()}
    />
  );
}
