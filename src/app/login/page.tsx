"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/layout/container";

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErr(json?.error ?? "Login failed");
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("snv.admin.accessToken", json.accessToken);
      }
      let next = searchParams.get("redirect") ?? "/admin";
      next = next.trim().replace(/[\.\s]+$/, "");
      if (!next.startsWith("/")) next = "/admin";
      router.push(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="grid min-h-[80vh] place-items-center py-20">
      <div className="w-full max-w-sm">
        <div className="grid place-items-center text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-gradient text-primary-foreground shadow-glow">
            <ShieldCheck className="size-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">Admin sign-in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stix N Vibes — back-office access only.
          </p>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@stixnvibes.com" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {err && <p className="text-sm text-accent" role="alert">{err}</p>}
          <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowRight className="size-3 rotate-180" /> Back to site
          </Link>
        </p>
      </div>
    </Container>
  );
}
