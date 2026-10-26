"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" className="btn btn-primary !py-2 text-sm" onClick={() => window.print()}>
      {label}
    </button>
  );
}
