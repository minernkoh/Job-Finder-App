/**
 * Password hashing helpers. Previously lived on the Mongoose User model's pre-save hook;
 * now applied explicitly wherever a user is created or has their password changed.
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/** Hashes a plain-text password for storage. */
export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plainPassword, salt);
}

/** Checks if a plain-text password matches the stored hash (used on login). */
export function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
