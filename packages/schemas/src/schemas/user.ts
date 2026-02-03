/**
 * User-related Zod schemas: who can log in, their role (user/admin), and what we send when they register or log in.
 */

import { z } from "zod";

export const UserRole = z.enum(["admin", "user"]);
export type UserRole = z.infer<typeof UserRole>;

export const UserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(), // optional when reading (hashed)
  role: UserRole.default("user"),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type User = z.infer<typeof UserSchema>;

/** For login request body (email + password only) */
export const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
export type Login = z.infer<typeof LoginSchema>;

/** For registration request body (no role - assigned by backend) */
export const UserCreateSchema = UserSchema.omit({
  role: true,
  createdAt: true,
  updatedAt: true,
}).required({ password: true });
export type UserCreate = z.infer<typeof UserCreateSchema>;

/** For admin registration request body (name, email, password + adminSecret; role set by backend). */
export const AdminRegisterSchema = UserCreateSchema.extend({
  adminSecret: z.string().min(1, "Admin secret is required"),
});
export type AdminRegister = z.infer<typeof AdminRegisterSchema>;

/** For PATCH user (partial update; all fields optional, same validations as create when present). */
export const UserUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
});
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
