/**
 * Guest preview Gemini quota (parse + tailor combined per IP per UTC day).
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { GUEST_AI_DAILY_LIMIT } from "@/lib/ai-access";
import { guestAiQuotaKeys } from "@/lib/query-keys";

export type GuestAiQuota = {
  used: number;
  limit: number;
  remaining: number;
};

async function fetchGuestAiQuota(): Promise<GuestAiQuota> {
  const res = await fetch("/api/v1/demo/ai-quota");
  const json = (await res.json()) as {
    success: boolean;
    data?: GuestAiQuota;
    message?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? "Failed to load preview AI quota");
  }
  return json.data;
}

/** Loads remaining preview Gemini calls when guest preview is active. */
export function useGuestAiQuota() {
  const { isDemo } = useAuth();
  const query = useQuery({
    queryKey: guestAiQuotaKeys.all,
    queryFn: fetchGuestAiQuota,
    enabled: isDemo,
    staleTime: 30_000,
  });

  const limit = query.data?.limit ?? GUEST_AI_DAILY_LIMIT;
  const used = query.data?.used ?? 0;
  const remaining = query.data?.remaining ?? limit;

  return {
    ...query,
    limit,
    used,
    remaining,
    exhausted: remaining <= 0,
  };
}
