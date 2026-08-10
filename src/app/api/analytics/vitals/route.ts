import { createApiHandler } from "@/lib/api-handler";
import { AnalyticsService } from "@/lib/services/analytics-service";
import { z } from "zod";

const analyticsService = new AnalyticsService();

export const GET = createApiHandler({
  handler: async () => {
    return { route: "vitals" };
  },
});

const incomingMetricSchema = z.object({
  id: z.string().optional(),
  name: z.enum(["CLS", "FCP", "INP", "LCP", "TTFB", "FID"]),
  value: z.number(),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  delta: z.number().optional(),
  navigationType: z.string().optional(),
});

const vitalsPayloadSchema = z.object({
  metrics: z.array(incomingMetricSchema).optional(),
  url: z.string().optional(),
  referrer: z.string().optional().nullable(),
  userAgent: z.string().optional(),
});

export const POST = createApiHandler({
  bodySchema: vitalsPayloadSchema,
  handler: async ({ body }) => {
    return await analyticsService.processVitals(body);
  },
});
