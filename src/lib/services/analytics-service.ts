import { createService } from "@/lib/supabase/service";
import type { Insert } from "@/types/supabase";

interface IncomingMetric {
  id?: string;
  name: "CLS" | "FCP" | "INP" | "LCP" | "TTFB" | "FID";
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  delta?: number;
  navigationType?: string;
}

export interface VitalsPayload {
  metrics?: IncomingMetric[];
  url?: string;
  referrer?: string | null;
  userAgent?: string;
}

const ALLOWED = new Set(["CLS", "FCP", "INP", "LCP", "TTFB", "FID"]);

export class AnalyticsService {
  async processVitals(body: VitalsPayload) {
    const metrics = (body?.metrics ?? []).filter(
      (m): m is IncomingMetric =>
        Boolean(m) &&
        typeof m === "object" &&
        typeof m.value === "number" &&
        Number.isFinite(m.value) &&
        typeof m.name === "string" &&
        ALLOWED.has(m.name)
    );

    try {
      const svc = createService();
      if (svc) {
        if (metrics.length > 0) {
          const rows: Insert<"analytics">[] = metrics.map((m) => ({
            event: `web_vital_${m.name.toLowerCase()}`,
            payload: {
              id: m.id ?? null,
              value: Number(m.value.toFixed(3)),
              rating: m.rating ?? null,
              delta: typeof m.delta === "number" ? Number(m.delta.toFixed(3)) : null,
              navigation_type: m.navigationType ?? null,
            },
            url: body?.url ?? null,
            user_agent: body?.userAgent ?? null,
          }));
          const { error } = await (svc as any).from("analytics").insert(rows);
          if (error) console.warn("[vitals] insert failed:", error.message);
        }
      }
    } catch (e) {
      console.warn("[vitals] unexpected:", e);
    }

    return { count: metrics.length };
  }
}
