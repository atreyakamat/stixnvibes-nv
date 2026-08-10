import { createApiHandler } from "@/lib/api-handler";
import { SpotifyService } from "@/lib/services/spotify-service";
import { z } from "zod";

const spotifyService = new SpotifyService();

export const GET = createApiHandler({
  querySchema: z.object({
    url: z.string().optional(),
    id: z.string().optional(),
  }),
  handler: async ({ query }) => {
    const urlParam = query.url ?? query.id;
    if (!urlParam) {
      throw new Error("Missing 'url' or 'id' query parameter");
    }
    return await spotifyService.getTrackMetadata(urlParam);
  },
});
