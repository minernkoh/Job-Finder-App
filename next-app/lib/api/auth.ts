/**
 * API helpers for unlocking Gemini features with the master access code.
 */

import { apiClient } from "./client";
import { assertApiSuccess, getErrorMessage } from "./errors";
import type { ApiResponse } from "./types";

export interface UnlockedUser {
  id: string;
  email: string;
  username: string;
  role: "admin" | "user";
  aiEnabled: boolean;
}

export async function unlockAi(password: string): Promise<UnlockedUser> {
  try {
    const res = await apiClient.post<ApiResponse<UnlockedUser>>(
      "/api/v1/auth/unlock-ai",
      { password },
    );
    assertApiSuccess(res.data, "Failed to unlock AI");
    return res.data.data;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, "Failed to unlock AI"));
  }
}
