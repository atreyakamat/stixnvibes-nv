import { NextResponse } from "next/server";
import { createService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  const dbConfigured = Boolean(createService());

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(uptime),
    dbConfigured,
    memory: {
      rssMB: Math.round(memory.rss / (1024 * 1024)),
      heapTotalMB: Math.round(memory.heapTotal / (1024 * 1024)),
      heapUsedMB: Math.round(memory.heapUsed / (1024 * 1024)),
    },
  });
}
