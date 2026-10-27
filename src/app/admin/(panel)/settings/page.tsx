import type { Metadata } from "next";
import { CostsForm, type CostRow } from "@/components/admin/costs-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/admin/session";
import { costKey } from "@/lib/costs";
import { getStore } from "@/lib/store";
import { PRODUCT_TYPES } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const store = getStore();
  const [settings, products] = await Promise.all([store.getSettings(), store.listProducts({ includeHidden: true })]);

  // One row per type, then one per option choice that changes the price
  // (A3 costs more to print than A4; paper or waterproof doesn't change it).
  const rows: CostRow[] = [];
  for (const t of PRODUCT_TYPES) {
    rows.push({ key: t.id, label: t.label, indent: false });
    const seen = new Set<string>();
    for (const p of products.filter((x) => x.type === t.id))
      for (const g of p.options)
        for (const v of g.values) {
          const key = costKey(t.id, v.id);
          if (seen.has(key) || (v.priceDeltaPaise === 0 && settings.unitCosts[key] === undefined)) continue;
          seen.add(key);
          rows.push({ key, label: `${g.name}: ${v.label}`, indent: true });
        }
  }

  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Settings</h1>
      <SettingsForm settings={settings} />
      <section id="costs" className="space-y-4 rounded-2xl border border-line p-5">
        <h2 className="font-medium">Unit costs and profit goal</h2>
        <CostsForm rows={rows} costs={settings.unitCosts} goal={{ paise: settings.goalPaise, start: settings.goalStart, by: settings.goalBy }} />
      </section>
    </div>
  );
}
