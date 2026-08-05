"use client";
import { FileText } from "lucide-react";

export default function AdminPagesPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-border/80 pb-4">
        <FileText className="size-6 text-brand-yellow" />
        <h1 className="font-display text-2xl font-bold tracking-tight">Page Builder</h1>
      </div>
      <div className="rounded-2xl border border-border/80 bg-slate-900/60 p-12 text-center">
        <p className="text-muted-foreground text-sm">Module loading...</p>
      </div>
    </div>
  );
}
