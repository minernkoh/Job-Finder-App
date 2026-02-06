/**
 * System settings schema: singleton config for cache TTL, rate limits, and admin-tunable options.
 */

import { z } from "zod";

/** System-wide settings stored as a single document (e.g. id "default"). */
export const SystemSettingsSchema = z.object({
  cacheTTL: z.number().min(0).optional(),
  rateLimitPerMinute: z.number().min(1).optional(),
  maxListingsPerUser: z.number().min(0).optional(),
  updatedAt: z.coerce.date().optional(),
  updatedBy: z.string().optional(),
});

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;

/** PATCH body for updating system settings (all fields optional). */
export const SystemSettingsUpdateSchema = SystemSettingsSchema.partial().omit({
  updatedAt: true,
  updatedBy: true,
});

export type SystemSettingsUpdate = z.infer<typeof SystemSettingsUpdateSchema>;
