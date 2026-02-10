/**
 * API helpers for user account: update own profile (email, username, password). Used by profile account edit.
 */

import { apiClient } from "./client";
import { getErrorMessage } from "./errors";

export interface UserUpdateBody {
  email?: string;
  username?: string;
  password?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  username: string;
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
    throw new Error(getErrorMessage(err, "Failed to update user"));
  }
}

/** Deletes the current user's account. Throws with server message on failure (e.g. last admin). */
export async function deleteOwnAccount(userId: string): Promise<void> {
  try {
    const res = await apiClient.delete<{ success: boolean; message?: string }>(
      `/api/v1/users/${userId}`
    );
    if (!res.data.success) throw new Error(res.data.message ?? "Failed to delete account");
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, "Failed to delete account"));
  }
}
