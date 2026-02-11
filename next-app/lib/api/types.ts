/**
 * Shared API response types. Single source of truth for client-side API response shapes.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: {
    items: T[];
    totalCount: number;
    page: number;
  };
  message?: string;
}
