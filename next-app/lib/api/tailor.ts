/**
 * API helpers for JD resume tailoring and document download.
 */

import type { TailoredResumeResult } from "@schemas";
import { apiClient } from "./client";
import { assertApiSuccess, getErrorMessage } from "./errors";
import type { ApiResponse } from "./types";

export async function tailorResume(
  listingId: string,
  forceRegenerate = false,
): Promise<TailoredResumeResult> {
  try {
    const res = await apiClient.post<ApiResponse<TailoredResumeResult>>(
      "/api/v1/resume/tailor",
      { listingId, forceRegenerate },
    );
    assertApiSuccess(res.data, "Failed to tailor resume");
    return res.data.data;
  } catch (err: unknown) {
    throw new Error(getErrorMessage(err, "Failed to tailor resume"));
  }
}

export async function downloadTailoredFile(
  tailorId: string,
  kind: "resume" | "cover",
  format: "docx" | "pdf",
): Promise<void> {
  const res = await apiClient.get<Blob>(
    `/api/v1/resume/tailor/${tailorId}/file?kind=${kind}&format=${format}`,
    { responseType: "blob" },
  );
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${kind}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
