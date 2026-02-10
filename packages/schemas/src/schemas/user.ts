/**
 * User-related Zod schemas: who can log in, their role (user/admin), and what we send when they register or log in.
 */

import { z } from "zod";

export const UserRole = z.enum(["admin", "user"]);
export type UserRole = z.infer<typeof UserRole>;

export const UserStatus = z.enum(["active", "suspended"]);
export type UserStatus = z.infer<typeof UserStatus>;

/** Required username for entity: 3–30 chars, alphanumeric, underscore, hyphen. Uniqueness enforced in backend. In PATCH bodies use UsernameSchema.optional() so the field may be omitted; when sent it cannot be cleared. */
export const UsernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscore, and hyphen");

export const UserSchema = z.object({
  email: z.string().email("Invalid email"),
  username: UsernameSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(), // optional when reading (hashed)
  role: UserRole.default("user"),
  status: UserStatus.default("active"),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type User = z.infer<typeof UserSchema>;

/** For login request body: login is email or username; optional role to disambiguate when same email has admin and user accounts. */
export const LoginSchema = z.object({
  login: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
  role: UserRole.optional(),
});
export type Login = z.infer<typeof LoginSchema>;

/** For registration request body (no role - assigned by backend) */
export const UserCreateSchema = UserSchema.omit({
  role: true,
  createdAt: true,
  updatedAt: true,
}).required({ password: true });
export type UserCreate = z.infer<typeof UserCreateSchema>;

/** For admin registration request body (email, password, username + adminSecret; role set by backend). */
export const AdminRegisterSchema = UserCreateSchema.extend({
  adminSecret: z.string().min(1, "Admin secret is required"),
});
export type AdminRegister = z.infer<typeof AdminRegisterSchema>;

/** For PATCH user (partial update; all fields optional, same validations as create when present). */
export const UserUpdateSchema = z.object({
  email: z.string().email("Invalid email").optional(),
  username: UsernameSchema.optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  status: UserStatus.optional(),
});
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

/** For admin PATCH user role (promote/demote). */
export const AdminUserRoleBodySchema = z.object({
  role: UserRole,
});
export type AdminUserRoleBody = z.infer<typeof AdminUserRoleBodySchema>;

/** For admin PATCH user status (suspend/activate). */
export const AdminUserStatusBodySchema = z.object({
  status: UserStatus,
});
export type AdminUserStatusBody = z.infer<typeof AdminUserStatusBodySchema>;

/** Query params for admin GET users list (pagination and filters). */
export const AdminUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: UserRole.optional(),
  status: UserStatus.optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
export type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;

/** Body for admin POST create user (email, username, password, role). */
export const AdminCreateUserBodySchema = z.object({
  email: z.string().email("Invalid email"),
  username: UsernameSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: UserRole.default("user"),
});
export type AdminCreateUserBody = z.infer<typeof AdminCreateUserBodySchema>;

/** Body for admin PATCH user (email, username). */
export const AdminUpdateUserBodySchema = z.object({
  email: z.string().email("Invalid email").optional(),
  username: UsernameSchema.optional(),
});
export type AdminUpdateUserBody = z.infer<typeof AdminUpdateUserBodySchema>;
