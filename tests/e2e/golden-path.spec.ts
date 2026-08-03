import { test, expect } from "@playwright/test";

test.describe("Golden Path E2E Business Chain", () => {
  test("Customer purchase → DB order → Admin fulfillment → Shipment → Customer tracking", async ({ request, page }) => {
    // 1. Customer order payload with custom artwork
    const orderPayload = {
      customer_name: "RCOD E2E Customer",
      customer_phone: "+919876543210",
      customer_email: "rcod-e2e@stixnvibes.com",
      address: "42 Golden Path Street, Indiranagar",
      pincode: "560038",
      total_cents: 29900,
      items: [
        {
          product_id: "11111111-1111-1111-1111-111111111111",
          name: "RCOD Standard Sticker",
          quantity: 1,
          price_cents: 29900,
          customization_data: { artwork_url: "https://example.com/artwork.png", text: "STIX & VIBES" }
        }
      ]
    };

    // 2. Submit order creation to real backend RPC / API
    const createRes = await request.post("/api/orders/create", { data: orderPayload });
    expect(createRes.status()).toBe(200);
    const createData = await createRes.json();
    expect(createData.ok).toBe(true);
    expect(createData.persisted).toBe(true);
    const orderId = createData.orderId;
    expect(orderId).toBeTruthy();

    // 3. Admin verifies the order exists via Admin API
    const adminHeaders = { Authorization: "Bearer snv_admin_token_static_dev" };
    const adminOrdersRes = await request.get("/api/admin/orders", { headers: adminHeaders });
    expect(adminOrdersRes.status()).toBe(200);
    const adminOrders = await adminOrdersRes.json();
    expect(adminOrders.ok).toBe(true);
    const targetOrder = adminOrders.data?.find((o: any) => o.id === orderId);
    expect(targetOrder).toBeTruthy();
    expect(targetOrder.customer_name).toBe("RCOD E2E Customer");

    // 4. Admin advances order state according to state machine:
    // created -> payment_pending -> paid -> processing -> print_queue -> printing -> quality_check -> packing -> ready_for_dispatch -> shipped
    const transitions = ["payment_pending", "paid", "processing", "print_queue", "printing", "quality_check", "packing"];
    for (const status of transitions) {
      const res = await request.post("/api/admin/orders", {
        headers: adminHeaders,
        data: { id: orderId, status }
      });
      expect(res.status()).toBe(200);
    }

    // 5. Locate ProductionJob spawned for order item
    const opsRes = await request.get("/api/admin/operations?mode=jobs", { headers: adminHeaders });
    expect(opsRes.status()).toBe(200);
    const jobsData = await opsRes.json();
    const job = jobsData.jobs?.find((j: any) => j.order_item?.order_id === orderId);
    expect(job).toBeTruthy();
    const jobId = job.id;

    // 6. Execute QC Inspection: Pass
    const qcRes = await request.post("/api/admin/operations", {
      headers: adminHeaders,
      data: { action: "qc_inspection", productionJobId: jobId, result: "pass" }
    });
    expect(qcRes.status()).toBe(200);

    // 7. Execute Pack Order to generate Shipment
    const testAwb = `AWB-GOLDEN-${Date.now()}`;
    const packRes = await request.post("/api/admin/operations", {
      headers: adminHeaders,
      data: { action: "pack_order", orderId, courier: "BLUEDART_TEST", awb: testAwb }
    });
    expect(packRes.status()).toBe(200);
    const packData = await packRes.json();
    expect(packData.ok).toBe(true);

    // 8. Customer tracking page reflects real persisted shipment
    await page.goto(`/track?orderId=${orderId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(testAwb)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/BLUEDART_TEST/i)).toBeVisible({ timeout: 10_000 });
  });
});
