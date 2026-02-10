/**
 * Mongoose User model: stores email, username, hashed password, and role (user/admin). Passwords are hashed before save. Admin users are created via /admin signup only.
 */

import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import type { User as UserType, UserRole } from "@schemas";

export interface IUserDocument extends Omit<UserType, "password"> {
  _id: mongoose.Types.ObjectId;
  password: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "user"] as UserRole[],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1, role: 1 }, { unique: true });

// Hash password before saving (create or update when password is modified)
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/** Checks if a plain-text password matches the stored hash (used on login). */
export function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Use existing model if present (for hot reload)
export const User: Model<IUserDocument> =
  mongoose.models.User ?? mongoose.model<IUserDocument>("User", UserSchema);
