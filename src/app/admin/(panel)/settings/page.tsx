import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/admin/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getStore().getSettings();
  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Settings</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
