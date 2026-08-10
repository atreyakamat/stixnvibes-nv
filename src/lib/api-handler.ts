import { NextRequest } from "next/server";
import { requireAdminAuth } from "@/lib/auth-guard";
import { ApiResponse, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import { ValidationError } from "@/lib/errors";

type RouteHandler<TContext = any> = (
  req: NextRequest,
  context: TContext
) => Promise<any> | any;

export interface ApiHandlerConfig<TBody = any, TQuery = any> {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  bodySchema?: z.ZodType<TBody>;
  querySchema?: z.ZodType<TQuery>;
  handler: (ctx: {
    req: NextRequest;
    body: TBody;
    query: TQuery;
    params: any;
  }) => Promise<any> | any;
}

export function createApiHandler<TBody = any, TQuery = any>(
  config: ApiHandlerConfig<TBody, TQuery>
) {
  return async function (req: NextRequest, context: any) {
    try {
      // 1. Authentication
      if (config.requireAdmin) {
        const authErr = await requireAdminAuth(req);
        if (authErr) return authErr;
      } else if (config.requireAuth) {
        // Implement standard user auth if needed
      }

      // 2. Validation (Query)
      let query = {} as TQuery;
      if (config.querySchema) {
        const searchParams = Object.fromEntries(new URL(req.url).searchParams.entries());
        const result = config.querySchema.safeParse(searchParams);
        if (!result.success) {
          throw new ValidationError("Invalid query parameters", result.error.flatten());
        }
        query = result.data;
      }

      // 3. Validation (Body)
      let body = {} as TBody;
      if (config.bodySchema) {
        if (!req.body) {
          throw new ValidationError("Missing request body");
        }
        let rawBody;
        try {
          rawBody = await req.json();
        } catch {
          throw new ValidationError("Invalid JSON body");
        }
        const result = config.bodySchema.safeParse(rawBody);
        if (!result.success) {
          throw new ValidationError("Invalid request body", result.error.flatten());
        }
        body = result.data;
      }

      // 4. Business Logic (Handler)
      const data = await config.handler({
        req,
        body,
        query,
        params: context?.params || {},
      });

      // 5. Response
      if (data instanceof Response) {
        return data; // Allow returning raw responses if necessary
      }
      // Return 200 by default for all verbs including POST unless otherwise needed
      return ApiResponse.success(data, undefined, 200);
      
    } catch (error) {
      // 6. Error Handling
      return handleApiError(error);
    }
  };
}
