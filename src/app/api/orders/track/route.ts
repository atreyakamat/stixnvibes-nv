import { NextResponse, type NextRequest } from "next/server";
import { createService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ ok: false, error: "Order ID or phone number is required" }, { status: 400 });
  }

  const admin = createService();
  if (admin) {
    try {
      // Need to query shipments separately if the relation isn't recognized or just use a joined query
      const { data, error } = await (admin as any)
        .from("orders")
        .select("id, created_at, customer_name, customer_phone, total_cents, status, address, pincode, whatsapp_url, order_items(*), shipments(*)")
        .or(`id.eq.${query},customer_phone.eq.${query}`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error && data && data.length > 0) {
        const primary = data[0];
        const shipment = primary.shipments && primary.shipments.length > 0 ? primary.shipments[0] : null;

        return NextResponse.json({
          ok: true,
          found: true,
          data: {
            orderId: primary.id,
            customerName: primary.customer_name,
            placedDate: new Date(primary.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
            estimatedDelivery: shipment ? "2-4 Business Days" : "Pending Dispatch",
            courier: shipment ? shipment.courier : "TBD",
            awb: shipment ? shipment.awb : "TBD",
            currentStatus: shipment ? shipment.status : primary.status,
            destination: `${primary.address} (${primary.pincode})`,
            items: primary.order_items || [],
          },
        });
      }
    } catch (err) {
      console.warn("[orders/track] Supabase lookup error:", err);
    }
  }

  // Do not fabricate tracking state. If we cannot resolve the order from
  // persistent storage, return an honest not-found response.
  return NextResponse.json(
    {
      ok: false,
      found: false,
      error: `No order found matching "${query}". Please check your Order ID or registered mobile number. Tracking becomes available after the order is saved in the live system.`,
    },
    { status: 404 }
  );
}
