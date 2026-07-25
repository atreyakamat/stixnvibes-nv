"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[AppRouter Error Boundary]:", error);
  }, [error]);

  return (
    <Container className="pt-32 pb-20 text-center">
      <div className="mx-auto max-w-md bg-slate-900/70 border border-red-500/30 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl">
        <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-brand-red mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          An unexpected runtime error occurred. Our team has been notified. Please try refreshing or return home.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={() => reset()} variant="gradient" size="default">
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
          <Button asChild variant="outline" size="default" className="border-slate-800">
            <Link href="/"><Home className="w-4 h-4 mr-2" /> Back to Home</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
