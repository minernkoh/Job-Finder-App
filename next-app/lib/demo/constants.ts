/**
 * Guest preview session constants: fake user identity and localStorage keys.
 */

import type { AuthUser } from "@/contexts/AuthContext";

export const DEMO_STORAGE_PREFIX = "jobfinder:demo:";
export const DEMO_ACTIVE_KEY = "jobfinder:demo";
export const DEMO_DISMISSED_KEY = "jobfinder:demo-dismissed";

/** Fake user shown while in guest preview mode. */
export const DEMO_USER: AuthUser = {
  id: "preview-user",
  email: "preview@example.com",
  role: "user",
  username: "Preview",
  aiEnabled: true,
};
