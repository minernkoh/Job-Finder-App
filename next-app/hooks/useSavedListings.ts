/**
 * Hook for saved listings: fetches saved list, derived savedIds/isSaved, and save/unsave mutations. Used by jobs page, job detail, and trending.
 */

"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchSavedListings,
  saveListing,
  unsaveListing,
} from "@/lib/api/saved";
import { savedCheckKeys, savedKeys } from "@/lib/query-keys";

/** Returns saved listings data, savedIds set, isSaved helper, and save/unsave mutations with cache invalidation. */
export function useSavedListings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedListings = [], isLoading: isLoadingSaved } = useQuery({
    queryKey: savedKeys.all,
    queryFn: fetchSavedListings,
    enabled: !!user,
  });

  const savedIds = useMemo(
    () => new Set(savedListings.map((s) => s.listingId)),
    [savedListings]
  );

  const isSaved = (listingId: string) => savedIds.has(listingId);

  const saveMutation = useMutation({
    mutationFn: saveListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedKeys.all });
      queryClient.invalidateQueries({ queryKey: savedCheckKeys.all });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: unsaveListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedKeys.all });
      queryClient.invalidateQueries({ queryKey: savedCheckKeys.all });
    },
  });

  return {
    savedListings,
    savedIds,
    isSaved,
    isLoadingSaved,
    saveMutation,
    unsaveMutation,
  };
}
