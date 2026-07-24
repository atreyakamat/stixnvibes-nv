import { NextResponse, type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface IncomingMetric {
  id?: string;
  name: "CLS" | "FCP" | "INP" | "LCP" | "TTFB" | "FID";
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  delta?: number;
  navigationType?: string;
}

interface VitalsPayload {
  metrics?: IncomingMetric[];
  url?: string;
  referrer?: string | null;
  userAgent?: string;
}

const ALLOWED = new Set(["CLS", "FCP", "INP", "LCP", "TTFB", "FID"]);

async function parseBody(req: NextRequest): Promise<VitalsPayload | null> {
  try {
    const text = await req.text();
    if (!text) return null;
    const data = JSON.parse(text);
    return data && typeof data === "object" ? (data as VitalsPayload) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await parseBody(req);
  const metrics = (body?.metrics ?? []).filter(
    (m): m is IncomingMetric =>
      Boolean(m) &&
      typeof m === "object" &&
      typeof m.value === "number" &&
      Number.isFinite(m.value) &&
      typeof m.name === "string" &&
      ALLOWED.has(m.name)
  );

  // Try to persist via service role; degrade gracefully when not configured.
  try {
    const svc = createService();
    if (svc) {
      const client = svc as ReturnType<typeof createService>;
      if (metrics.length > 0) {
        const rows = metrics.map((m) => ({
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
        const { error } = await client.from("analytics").insert(rows);
        if (error) console.warn("[vitals] insert failed:", error.message);
      }
    }
  } catch (e) {
    console.warn("[vitals] unexpected:", e);
  }

  return NextResponse.json({ ok: true, count: metrics.length }, { status: 200 });
}

export function GET() {
  return NextResponse.json({ ok: true, route: "vitals" });
}
