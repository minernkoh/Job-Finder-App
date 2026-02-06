/**
 * Shared MongoDB ObjectId helpers. Centralizes validity checks and parsing used by API routes and services.
 */

import mongoose from "mongoose";

/**
 * Returns true if the string is a valid 24-char hex ObjectId; false otherwise.
 */
export function isValidObjectId(id: string | undefined | null): boolean {
  if (id == null || typeof id !== "string") return false;
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Parses a string to a MongoDB ObjectId. Returns the ObjectId or null if invalid.
 */
export function parseObjectId(
  id: string | undefined | null
): mongoose.Types.ObjectId | null {
  if (!isValidObjectId(id)) return null;
  return new mongoose.Types.ObjectId(id!);
}
