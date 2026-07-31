import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { POST as adminLogin } from "@/app/api/admin/login/route";

function makeRequest(path: string, body?: unknown) {
  const req = new NextRequest(`http://localhost${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return req;
}

describe("admin auth hardening", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string };
    env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fails closed for protected admin routes when Supabase auth is misconfigured", async () => {
    const response = await updateSession(makeRequest("/api/admin/orders"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/misconfigured|unavailable/i);
  });

  it("rejects static admin login in production when auth backend is unavailable", async () => {
    const response = await adminLogin(makeRequest("/api/admin/login", {
      email: "admin@stixnvibes.com",
      password: "stixnvibes123",
    }) as NextRequest);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/misconfigured|unavailable/i);
  });
});
