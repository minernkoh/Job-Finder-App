/**
 * Shared types for listings. Single source of truth for ListingsFilters so both API client and server services can import without cross-layer coupling.
 */

/** Filter options for job search; aligned with Adzuna API and GET /api/v1/listings. */
export interface ListingsFilters {
  where?: string;
  category?: string;
  fullTime?: boolean;
  permanent?: boolean;
  salaryMin?: number;
  sortBy?: string;
}
