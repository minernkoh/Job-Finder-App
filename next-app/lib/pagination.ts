/**
 * Shared pagination calculation. Single source of truth for page/limit/skip used by admin list endpoints.
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

/** Clamps page to at least 1 and limit to 1–100; returns page, limit, and skip for MongoDB. */
export function calculatePagination(
  params: PaginationParams = {}
): PaginationResult {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
