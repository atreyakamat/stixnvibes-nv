import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";

const STATIC_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const STATIC_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STATIC_ADMIN_TOKEN = process.env.ADMIN_STATIC_ACCESS_TOKEN;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export const POST = createApiHandler({
  bodySchema: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  handler: async ({ body }) => {
    const { email, password } = body;
    const emailLower = email.toLowerCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const authBackendConfigured = Boolean(supabaseUrl && serviceRoleKey && !supabaseUrl.includes("YOUR_"));

    if (isProduction() && !authBackendConfigured) {
      return new Response(JSON.stringify({ ok: false, error: "Server misconfigured: auth backend unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } });
    }

    const isDevAllowed = !isProduction();
    
    const isValidStaticEmail = STATIC_ADMIN_EMAIL ? (emailLower === STATIC_ADMIN_EMAIL.toLowerCase()) : (isDevAllowed && emailLower === "admin@stixnvibes.com");
    const isValidStaticPass = STATIC_ADMIN_PASSWORD ? (password === STATIC_ADMIN_PASSWORD) : (isDevAllowed && (password === "stixnvibes123" || password === "admin"));
    const tokenToUse = STATIC_ADMIN_TOKEN || (isDevAllowed ? "snv_admin_token_static_dev" : null);

    if (isValidStaticEmail && isValidStaticPass && tokenToUse) {
      return new Response(JSON.stringify({
        ok: true,
        accessToken: tokenToUse,
        user: { email: emailLower, role: "admin" },
        message: "Authenticated via static admin credentials",
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `snv_admin_token=${tokenToUse}; Path=/; HttpOnly; SameSite=Lax`,
        },
      });
    }

    if (authBackendConfigured) {
      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "apikey": serviceRoleKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: emailLower, password }),
        });
        const json = await res.json();
        if (res.ok && json?.access_token) {
          return new Response(JSON.stringify({
            ok: true,
            accessToken: json.access_token,
            refreshToken: json.refresh_token,
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": `snv_admin_token=${json.access_token}; Path=/; HttpOnly; SameSite=Lax`,
            },
          });
        }
      } catch (err) {
        console.warn("[admin/login] Supabase auth attempt failed:", err);
      }
    }

    return new Response(JSON.stringify({ ok: false, error: "Invalid admin email or password" }), { status: 401 });
  },
});
