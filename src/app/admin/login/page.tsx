import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Wordmark } from "@/components/wordmark";
import { getAdmin } from "@/lib/admin/session";
import { DEMO_ADMIN, storeMode } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  const demo = storeMode() === "demo";
  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <div className="ice w-full max-w-sm rounded-[1.5rem] border border-line p-8">
        <Wordmark className="text-2xl" />
        <h1 className="label mt-2 text-lemon">Shop admin</h1>
        <LoginForm />
        {demo && (
          <p className="mt-6 rounded-xl bg-lemon/10 p-3 text-sm text-paper/80">
            Preview mode. Log in with <span className="font-mono">{DEMO_ADMIN.email}</span> /{" "}
            <span className="font-mono">{DEMO_ADMIN.password}</span>.
          </p>
        )}
      </div>
    </main>
  );
}
