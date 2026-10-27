import Link from "next/link";
import type { GoalReport } from "@/lib/costs";
import { formatINR } from "@/lib/money";
import { typeLabel } from "@/lib/types";

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Profit so far against the goal, and what each week still needs. */
export function GoalCard({ r, start, by }: { r: GoalReport; start: string; by: string }) {
  const pct = Math.round(r.progress * 100);
  const parts = [
    { label: "Online sales", value: r.online.revenuePaise },
    { label: "Stall sales", value: r.stalls.revenuePaise },
    { label: "Stock cost", value: -(r.online.costPaise + r.stalls.costPaise) },
    { label: "Stall fees and costs", value: -r.stallCostsPaise },
  ];
  return (
    <section aria-labelledby="goal" className="space-y-4 rounded-2xl border border-lemon/40 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="goal" className="font-medium">
          Profit goal: {formatINR(r.goalPaise)} by {day.format(new Date(by))}
        </h2>
        <Link href="/admin/settings#costs" className="text-xs text-mute hover:text-lemon">
          Change goal or costs
        </Link>
      </div>
      <div>
        <p className="text-3xl font-semibold tabular-nums" data-testid="goal-profit">
          {formatINR(r.profitPaise)} <span className="text-base font-normal text-mute">profit since {day.format(new Date(start))} · {pct}%</span>
        </p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-paper/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to goal">
          <div className="h-full rounded-full bg-lemon" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-mute">
          {r.daysLeft > 0
            ? `${r.daysLeft} days left. To get there, make ${formatINR(r.perWeekPaise)} profit a week from here.`
            : "The goal date has passed. Set a new one in Settings."}
        </p>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-4">
        {parts.map((x) => (
          <div key={x.label} className="rounded-xl bg-paper/5 px-3 py-2">
            <dt className="text-xs text-mute">{x.label}</dt>
            <dd className="tabular-nums">{formatINR(x.value)}</dd>
          </div>
        ))}
      </dl>
      {r.missing.length > 0 && (
        <p className="text-xs text-[#ffb020]">
          No unit cost set for {r.missing.map(typeLabel).join(", ")}, so profit reads high. Add it in Settings.
        </p>
      )}
    </section>
  );
}
