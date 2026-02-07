/**
 * Profile page: profile/skills, trending listings, and saved listings for the current user. Saved listings link to the full job page. Protected.
 */

"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompare } from "@/contexts/CompareContext";
import { ProtectedRoute } from "@/components/protected-route";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { CompareBar } from "@/components/compare-bar";
import { savedListingToListingResult } from "@/lib/api/saved";
import { ListingCard } from "@/components/listing-card";
import { useSavedListings } from "@/hooks/useSavedListings";
import { TrendingListings } from "@/components/trending-listings";
import { fetchProfile, updateProfile, suggestSkills, parseResume, parseResumeFile } from "@/lib/api/profile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CONTENT_MAX_W, PAGE_PX, SECTION_GAP } from "@/lib/layout";
import { SkillsEditor } from "@/components/skills-editor";
import { cn } from "@ui/components/lib/utils";

/** Deduplicates and trims skill strings (case-insensitive). */
function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  return skills
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Inner content: header, compare bar, profile, trending, saved list (single column; saved cards link to full job page). */
function ProfileContent() {
  const { user, logout } = useAuth();
  const { savedListings, isLoadingSaved, unsaveMutation } = useSavedListings();
  const {
    compareSet,
    addToCompare,
    isInCompareSet,
  } = useCompare();
  const queryClient = useQueryClient();
  const [currentRole, setCurrentRole] = useState("");
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [draftSkills, setDraftSkills] = useState<string[] | null>(null);
  const [customSkill, setCustomSkill] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
  const isResumeFile = (f: File) => {
    const name = f.name?.toLowerCase() ?? "";
    return (
      f.type === "application/pdf" ||
      name.endsWith(".pdf") ||
      f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    );
  };

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
  const profileSkills = useMemo(() => profile?.skills ?? [], [profile?.skills]);
  const skills = draftSkills ?? profileSkills;

  const updateSkills = useCallback(
    (updater: (prev: string[]) => string[]) => {
      setDraftSkills((prev) => {
        const base = prev ?? profileSkills;
        return updater(base);
      });
    },
    [profileSkills]
  );

  const suggestMutation = useMutation({
    mutationFn: (role: string) => suggestSkills(role),
    onSuccess: (data) => {
      setSuggestedSkills(data.skills ?? []);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (skills: string[]) => updateProfile({ skills }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const parseMutation = useMutation({
    mutationFn: (input: string | File) =>
      typeof input === "string" ? parseResume(input) : parseResumeFile(input),
    onSuccess: (data) => {
      const newSkills = data?.skills ?? [];
      updateSkills((prev) => dedupeSkills([...prev, ...newSkills]));
      setResumeText("");
      setSelectedFile(null);
      setFileError(null);
      // Invalidate so other consumers see updated profile; sync effect will run but we've already merged locally.
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const addToMySkills = useCallback(
    (skill: string) => {
      const s = skill.trim();
      if (!s) return;
      updateSkills((prev) => dedupeSkills([...prev, s]));
    },
    [updateSkills]
  );

  const removeFromMySkills = useCallback(
    (index: number) => {
      updateSkills((prev) => prev.filter((_, i) => i !== index));
    },
    [updateSkills]
  );

  const handleAddCustom = useCallback(() => {
    addToMySkills(customSkill);
    setCustomSkill("");
  }, [customSkill, addToMySkills]);

  const handleSaveProfile = useCallback(() => {
    const nextSkills = dedupeSkills(skills);
    updateMutation.mutate(nextSkills);
  }, [skills, updateMutation]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setFileError(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isResumeFile(file)) {
      setFileError("Please drop a PDF or DOCX file under 5MB.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("Please drop a file under 5MB.");
      return;
    }
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isResumeFile(file)) {
      setFileError("Please choose a PDF or DOCX file under 5MB.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("Please choose a file under 5MB.");
      return;
    }
    setSelectedFile(file);
    e.target.value = "";
  };

  const handleParseSubmit = () => {
    if (selectedFile) {
      parseMutation.mutate(selectedFile);
    } else if (resumeText.trim()) {
      parseMutation.mutate(resumeText.trim());
    }
  };

  return (
    <div className={cn("min-h-screen flex flex-col", PAGE_PX)}>
      <AppHeader title="Profile" user={user} onLogout={logout} />
      <CompareBar />

      <main id="main-content" className={cn("mx-auto flex-1 w-full py-8", CONTENT_MAX_W, SECTION_GAP)}>
        <h1 className="sr-only">Profile</h1>
        <div className="min-w-0 flex-1 space-y-8">
          <section aria-label="Your profile" className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
              Your profile
            </h2>
            <SkillsEditor
              idPrefix="profile"
              introText="Add skills manually or from your resume for job match and search."
              showRoleBlock
              roleValue={currentRole}
              onRoleChange={setCurrentRole}
              onSuggest={() => currentRole.trim() && suggestMutation.mutate(currentRole.trim())}
              suggestPending={suggestMutation.isPending}
              suggestedSkills={suggestedSkills}
              onAddSuggestedSkill={addToMySkills}
              customSkill={customSkill}
              onCustomSkillChange={setCustomSkill}
              onAddCustom={handleAddCustom}
              showResumeBlock
              resumeProps={{
                selectedFile,
                setSelectedFile,
                setFileError,
                dragOver,
                setDragOver,
                fileError,
                resumeText,
                setResumeText,
                onParse: handleParseSubmit,
                parsePending: parseMutation.isPending,
                parseError: parseMutation.isError
                  ? (parseMutation.error instanceof Error
                      ? parseMutation.error.message
                      : "Failed to parse resume")
                  : null,
                onFileChange: handleFileChange,
                onDrop: handleDrop,
              }}
              skills={skills}
              onRemoveSkill={removeFromMySkills}
              emptySkillsMessage="No skills yet. Use current role + Suggest, add custom, or paste/upload resume above."
              showSaveBlock={!isLoadingProfile}
              onSave={handleSaveProfile}
              savePending={updateMutation.isPending}
              saveError={
                updateMutation.isError
                  ? updateMutation.error instanceof Error
                    ? updateMutation.error.message
                    : "Failed to save profile"
                  : null
              }
              saveButtonLabel="Save profile"
            />
          </section>

          <TrendingListings />

          <section aria-label="Saved listings" className="space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
              Saved listings
            </h2>
            {isLoadingSaved && (
              <div className="grid gap-4 sm:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            )}

            {!isLoadingSaved && savedListings.length === 0 && (
              <p className="text-muted-foreground">
                You haven&apos;t saved any listings yet.{" "}
                <Link href="/browse" className="text-primary hover:underline">
                  Browse jobs
                </Link>{" "}
                to save your favorites.
              </p>
            )}

            {!isLoadingSaved && savedListings.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  Select up to 3 jobs to compare them side by side.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {savedListings.map((s) => {
                    const listing = savedListingToListingResult(s);
                    return (
                      <ListingCard
                        key={s.id}
                        listing={listing}
                        href={`/browse/${listing.id}`}
                        isSaved
                        onUnsave={() => unsaveMutation.mutate(s.listingId)}
                        onView={() => {}}
                        onAddToCompare={() => addToCompare(listing.id)}
                        isInCompareSet={isInCompareSet(listing.id)}
                        compareSetSize={compareSet.length}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/** Profile page: protected; shows profile, trending, and saved listings (single column). */
export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProtectedRoute>
        <ProfileContent />
      </ProtectedRoute>
    </Suspense>
  );
}
