// A stand-in for YouPI PG in browser tests: creates payment sessions, shows a
// checkout page with a "Pay" button, and sends the signed webhook like the
// real gateway (packages/core/src/webhook-engine.js). POST /__down and
// /__up switch it off and on to test the QR fallback.
import { createHmac, randomUUID } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_YOUPI_PORT ?? 3199);
const SHOP = process.env.MOCK_YOUPI_SHOP ?? "http://localhost:3100";
const SECRET = process.env.YOUPI_WEBHOOK_SECRET ?? "";
const sessions = new Map();
let down = false;

const read = (req) =>
  new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b));
  });
const hmac = (data) => createHmac("sha256", SECRET).update(data).digest("hex");
const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "Content-Type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "GET" && url.pathname === "/") return send(res, 200, { ok: true });
  if (req.method === "POST" && url.pathname === "/__down") return ((down = true), send(res, 200, { down }));
  if (req.method === "POST" && url.pathname === "/__up") return ((down = false), send(res, 200, { down }));

  if (req.method === "POST" && url.pathname === "/api/v1/payments") {
    if (down) return send(res, 503, { error: "down" });
    const body = JSON.parse(await read(req));
    const id = randomUUID();
    sessions.set(id, { ...body, id });
    return send(res, 201, { paymentId: id, orderId: body.orderId, amount: body.amount, status: "ACTIVE", checkoutUrl: `http://localhost:${PORT}/checkout/${id}` });
  }

  const m = /^\/checkout\/([\w-]+)(\/pay)?$/.exec(url.pathname);
  const s = m && sessions.get(m[1]);
  if (s && req.method === "GET" && !m[2])
    return send(res, 200, `<!doctype html><meta charset="utf-8"><title>Mock YouPI</title><h1>Pay ₹${s.amount} for ${s.orderId}</h1><form method="post" action="/checkout/${s.id}/pay"><button>Pay with mock UPI</button></form>`, "text/html");
  if (s && req.method === "POST" && m[2]) {
    const payload = JSON.stringify({
      event: "SUCCESS",
      deliveryId: randomUUID(),
      timestamp: Date.now(),
      paymentId: s.id,
      orderId: s.orderId,
      amount: s.amount,
      amountPaise: Math.round(Number(s.amount) * 100),
      currency: "INR",
      method: "UPI",
      utr: "998877665544",
    });
    const ts = String(Date.now());
    await fetch(`${SHOP}/api/payments/youpi`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Gateway-Signature": `sha256=${hmac(payload)}`, "X-Gateway-Signature-V2": `sha256=${hmac(`${ts}.${payload}`)}`, "X-Gateway-Timestamp": ts },
      body: payload,
    });
    res.writeHead(302, { Location: s.returnUrl });
    return res.end();
  }
  send(res, 404, { error: "not found" });
}).listen(PORT);
