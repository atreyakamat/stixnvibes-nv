import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin/session";
import { storeMode } from "@/lib/env";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const demo = storeMode() === "demo";
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="print:hidden border-b border-line bg-surface md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <AdminNav email={admin.email} logout={logoutAction} />
      </aside>
      <div className="min-w-0 flex-1">
        {demo && (
          <p className="bg-lemon px-4 py-2 text-center text-sm font-medium text-ink print:hidden">
            Preview mode: data is in memory, resets on redeploy, and nothing here is real.
          </p>
        )}
        <div className="px-4 py-8 md:px-10 md:py-10">{children}</div>
      </div>
    </div>
  );
}
