import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
}

export class ApiResponse {
  static success<T>(data: T, meta?: Record<string, unknown>, status = 200) {
    const payload: ApiSuccessResponse<T> = { ok: true, data };
    if (meta) payload.meta = meta;
    return NextResponse.json(payload, { status });
  }

  static error(message: string, code = "BAD_REQUEST", status = 400, details?: unknown) {
    const payload: ApiErrorResponse = {
      ok: false,
      error: message,
      code,
      details,
    };
    return NextResponse.json(payload, { status });
  }

  static unauthorized(message = "Unauthorized access") {
    return ApiResponse.error(message, "UNAUTHORIZED", 401);
  }

  static forbidden(message = "Forbidden access") {
    return ApiResponse.error(message, "FORBIDDEN", 403);
  }

  static notFound(message = "Resource not found") {
    return ApiResponse.error(message, "NOT_FOUND", 404);
  }

  static unavailable(message = "Database service unavailable") {
    return ApiResponse.error(message, "SERVICE_UNAVAILABLE", 503);
  }

  static internal(message = "Internal server error", details?: unknown) {
    return ApiResponse.error(message, "INTERNAL_ERROR", 500, details);
  }
}

import { AppError } from "./errors";

export function isConnectionError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnrefused") ||
    msg.includes("networkerror") ||
    msg.includes("failed to fetch") ||
    msg.includes("connect econnrefused")
  );
}

export function handleApiError(err: unknown) {
  console.error("[API ERROR]", err);
  
  if (err instanceof AppError) {
    return ApiResponse.error(err.message, err.code, err.statusCode, err.details);
  }

  const message = err instanceof Error ? err.message : String(err);
  if (isConnectionError(message)) {
    return ApiResponse.unavailable(`Database connection failed: ${message}`);
  }
  return ApiResponse.internal(message, err instanceof Error ? err.stack : undefined);
}
