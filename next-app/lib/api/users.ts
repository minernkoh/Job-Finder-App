/**
 * API helpers for user account: update own profile (name, email, password). Used by profile account edit.
 */

import { apiClient } from "./client";

export interface UserUpdateBody {
  name?: string;
  email?: string;
  password?: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Updates the current user (or user by id when admin). Returns updated user. Throws with server message on 409 etc. */
export async function updateUser(
  userId: string,
  body: UserUpdateBody
): Promise<UserResponse> {
  try {
    const res = await apiClient.patch<{
      success: boolean;
      data?: UserResponse;
      message?: string;
    }>(`/api/v1/users/${userId}`, body);
    if (!res.data.success || !res.data.data)
      throw new Error(res.data.message ?? "Failed to update user");
    return res.data.data;
  } catch (err: unknown) {
    const msg =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message
        : undefined;
    throw new Error(msg ?? (err instanceof Error ? err.message : "Failed to update user"));
  }
}
