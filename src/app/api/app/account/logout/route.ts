import { cookies } from "next/headers";
import { json } from "@/lib/api";
import { CUSTOMER_COOKIE } from "@/lib/account";

// Website sign-out. The app just forgets its token.
export async function POST() {
  (await cookies()).delete(CUSTOMER_COOKIE);
  return json({ ok: true });
}
