/**
 * Serializes a User document (or lean object) to the API response shape. Single source of truth for user JSON.
 */

export interface SerializedUserBase {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface SerializedUserWithTimestamps extends SerializedUserBase {
  createdAt: Date;
  updatedAt: Date;
}

type LeanUser = {
  _id: { toString(): string };
  email: string;
  username: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Converts a user document (or lean result) to the API response shape.
 * Set timestamps: false for /me and other responses that omit createdAt/updatedAt.
 */
export function serializeUser(
  user: LeanUser,
  options?: { timestamps?: boolean }
): SerializedUserBase | SerializedUserWithTimestamps {
  const base: SerializedUserBase = {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    role: user.role,
  };
  if (options?.timestamps === false) return base;
  return {
    ...base,
    createdAt: user.createdAt!,
    updatedAt: user.updatedAt!,
  };
}
