/**
 * Cron endpoint to expire stale inventory reservations.
 * Call this every 5 minutes via cron job or Termux loop script.
 *
 * POST /api/cron/expire-reservations
 * Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server";
import { expireStaleReservations } from "@/lib/services/inventory-atomic.service";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const released = await expireStaleReservations();
    return NextResponse.json({
      released,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/expire-reservations] Error:", error);
    return NextResponse.json(
      { error: "Failed to expire reservations" },
      { status: 500 }
    );
  }
}
