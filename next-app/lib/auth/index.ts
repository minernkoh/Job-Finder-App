/**
 * Auth module barrel: JWT, request auth, guards, and cookie helpers. Single entry point for auth utilities.
 */

export type { AccessPayload } from "./jwt";
export {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./jwt";
export { requireAuth } from "./request";
export { requireAdmin, requireOwnOrAdmin } from "./guard";
export {
  buildSetCookieHeader,
  buildClearCookieHeader,
  getRefreshTokenFromCookie,
} from "./cookies";
