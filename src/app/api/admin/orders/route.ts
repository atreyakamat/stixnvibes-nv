export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const admin = createService();
  if (!admin) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  const { data, error } = await admin
    .from("orders")
    .select("id, created_at, customer_name, total_cents, status, whatsapp_url")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
