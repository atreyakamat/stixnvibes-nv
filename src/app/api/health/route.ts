/**
 * Health check endpoint.
 * GET /api/health
 *
 * Returns system health status including database connectivity.
 */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "healthy", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: "unhealthy", latencyMs: Date.now() - dbStart };
  }

  // App check
  checks.app = { status: "healthy" };

  const allHealthy = Object.values(checks).every(
    (c) => c.status === "healthy"
  );

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      checks,
      version: process.env.APP_VERSION ?? "dev",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 }
  );
}
