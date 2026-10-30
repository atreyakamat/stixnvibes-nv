import { handle } from "@/lib/admin/app-api";

// The Android admin app's API. Routes and auth are in lib/admin/app-api.ts;
// docs/ADMIN_APP_API.md lists them.

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/app/admin/[...path]">;
const serve = async (req: Request, ctx: Ctx) => handle(req, (await ctx.params).path);

export { serve as GET, serve as POST, serve as PUT, serve as PATCH, serve as DELETE };
