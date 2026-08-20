export const dynamic = "force-dynamic";
import { createApiHandler } from "@/lib/api-handler";
import { MediaService } from "@/lib/services/media-service";
import { z } from "zod";

const mediaService = new MediaService();

export const GET = createApiHandler({
  requireAdmin: true,
  handler: async () => {
    return await mediaService.getMediaFiles();
  },
});

export const POST = createApiHandler({
  requireAdmin: true,
  handler: async ({ req }) => {
    const formData = await req.formData().catch(() => {
      throw new Error("Invalid form data. Use multipart/form-data.");
    });

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      throw new Error("Missing file upload. Attach a file under the 'file' field.");
    }

    const result = await mediaService.uploadMediaFile(file as File);
    return new Response(JSON.stringify({ ok: true, data: result }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  },
});

export const DELETE = createApiHandler({
  requireAdmin: true,
  querySchema: z.object({
    path: z.string().min(1, "Missing required query parameter: path"),
  }),
  handler: async ({ query }) => {
    await mediaService.deleteMediaFile(query.path);
    return { deleted: true, path: query.path };
  },
});
