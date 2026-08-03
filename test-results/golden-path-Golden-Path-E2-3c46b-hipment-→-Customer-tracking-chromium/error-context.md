# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: golden-path.spec.ts >> Golden Path E2E Business Chain >> Customer purchase → DB order → Admin fulfillment → Shipment → Customer tracking
- Location: tests\e2e\golden-path.spec.ts:4:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 400
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Golden Path E2E Business Chain", () => {
  4  |   test("Customer purchase → DB order → Admin fulfillment → Shipment → Customer tracking", async ({ request, page }) => {
  5  |     // 1. Customer order payload with custom artwork
  6  |     const orderPayload = {
  7  |       customer_name: "RCOD E2E Customer",
  8  |       customer_phone: "+919876543210",
  9  |       customer_email: "rcod-e2e@stixnvibes.com",
  10 |       address: "42 Golden Path Street, Indiranagar",
  11 |       pincode: "560038",
  12 |       total_cents: 29900,
  13 |       items: [
  14 |         {
  15 |           product_id: "11111111-1111-1111-1111-111111111111",
  16 |           name: "RCOD Standard Sticker",
  17 |           quantity: 1,
  18 |           price_cents: 29900,
  19 |           customization_data: { artwork_url: "https://example.com/artwork.png", text: "STIX & VIBES" }
  20 |         }
  21 |       ]
  22 |     };
  23 | 
  24 |     // 2. Submit order creation to real backend RPC / API
  25 |     const createRes = await request.post("/api/orders/create", { data: orderPayload });
  26 |     expect(createRes.status()).toBe(200);
  27 |     const createData = await createRes.json();
  28 |     expect(createData.ok).toBe(true);
  29 |     expect(createData.persisted).toBe(true);
  30 |     const orderId = createData.orderId;
  31 |     expect(orderId).toBeTruthy();
  32 | 
  33 |     // 3. Admin verifies the order exists via Admin API
  34 |     const adminHeaders = { Authorization: "Bearer snv_admin_token_static_dev" };
  35 |     const adminOrdersRes = await request.get("/api/admin/orders", { headers: adminHeaders });
  36 |     expect(adminOrdersRes.status()).toBe(200);
  37 |     const adminOrders = await adminOrdersRes.json();
  38 |     expect(adminOrders.ok).toBe(true);
  39 |     const targetOrder = adminOrders.data?.find((o: any) => o.id === orderId);
  40 |     expect(targetOrder).toBeTruthy();
  41 |     expect(targetOrder.customer_name).toBe("RCOD E2E Customer");
  42 | 
  43 |     // 4. Admin advances order state according to state machine:
  44 |     // created -> payment_pending -> paid -> processing -> print_queue -> printing -> quality_check -> packing -> ready_for_dispatch -> shipped
  45 |     const transitions = ["payment_pending", "paid", "processing", "print_queue", "printing", "quality_check", "packing"];
  46 |     for (const status of transitions) {
  47 |       const res = await request.post("/api/admin/orders", {
  48 |         headers: adminHeaders,
  49 |         data: { id: orderId, status }
  50 |       });
> 51 |       expect(res.status()).toBe(200);
     |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  52 |     }
  53 | 
  54 |     // 5. Locate ProductionJob spawned for order item
  55 |     const opsRes = await request.get("/api/admin/operations?mode=jobs", { headers: adminHeaders });
  56 |     expect(opsRes.status()).toBe(200);
  57 |     const jobsData = await opsRes.json();
  58 |     const job = jobsData.jobs?.find((j: any) => j.order_item?.order_id === orderId);
  59 |     expect(job).toBeTruthy();
  60 |     const jobId = job.id;
  61 | 
  62 |     // 6. Execute QC Inspection: Pass
  63 |     const qcRes = await request.post("/api/admin/operations", {
  64 |       headers: adminHeaders,
  65 |       data: { action: "qc_inspection", productionJobId: jobId, result: "pass" }
  66 |     });
  67 |     expect(qcRes.status()).toBe(200);
  68 | 
  69 |     // 7. Execute Pack Order to generate Shipment
  70 |     const testAwb = `AWB-GOLDEN-${Date.now()}`;
  71 |     const packRes = await request.post("/api/admin/operations", {
  72 |       headers: adminHeaders,
  73 |       data: { action: "pack_order", orderId, courier: "BLUEDART_TEST", awb: testAwb }
  74 |     });
  75 |     expect(packRes.status()).toBe(200);
  76 |     const packData = await packRes.json();
  77 |     expect(packData.ok).toBe(true);
  78 | 
  79 |     // 8. Customer tracking page reflects real persisted shipment
  80 |     await page.goto(`/track?orderId=${orderId}`, { waitUntil: "domcontentloaded" });
  81 |     await expect(page.getByText(testAwb)).toBeVisible({ timeout: 10_000 });
  82 |     await expect(page.getByText(/BLUEDART_TEST/i)).toBeVisible({ timeout: 10_000 });
  83 |   });
  84 | });
  85 | 
```