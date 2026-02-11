/**
 * Profile page: profile/skills and saved listings for the current user. Saved listings link to the full job page. Protected.
 */

"use client";

import { toast } from "sonner";
import { Suspense, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompare } from "@/contexts/CompareContext";
import { UserOnlyRoute } from "@/components/user-only-route";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { savedListingToListingResult } from "@/lib/api/saved";
import { ListingCard } from "@/components/listing-card";
import { useSavedListings } from "@/hooks/useSavedListings";
import {
  fetchProfile,
  updateProfile,
  suggestSkills,
  parseResume,
  parseResumeFile,
} from "@/lib/api/profile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CARD_PADDING_COMPACT,
  CONTENT_MAX_W,
  EMPTY_STATE_PADDING,
  GAP_MD,
  PAGE_PX,
  SECTION_GAP,
} from "@/lib/layout";
import { SkillsEditor } from "@/components/skills-editor";
import { Button, Card, CardContent } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { dedupeSkills } from "@/lib/skills";

const YEARS_OF_EXPERIENCE_MAX = 70;

/** Inner content: header, compare bar, resume/skills left, saved listings right (two columns on lg). */
function ProfileContent() {
  const { user, logout } = useAuth();
  const { savedListings, isLoadingSaved, unsaveMutation } = useSavedListings();
  const { compareSet, addToCompare, isInCompareSet } = useCompare();
  const queryClient = useQueryClient();
  const [currentRole, setCurrentRole] = useState("");
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [draftSkills, setDraftSkills] = useState<string[] | null>(null);
  const [customSkill, setCustomSkill] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [lastParseAssessment, setLastParseAssessment] = useState<string | null>(
    null,
  );
  const [lastParseSuggestedSkills, setLastParseSuggestedSkills] = useState<
    string[]
  >([]);
  /** Local draft for years of experience; null means use profile value. */
  const [draftYears, setDraftYears] = useState<string | null>(null);
  const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

  const isResumeFile = (f: File) => {
    const name = f.name?.toLowerCase() ?? "";
    return (
      f.type === "application/pdf" ||
      name.endsWith(".pdf") ||
      f.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    );
  };

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
  const profileSkills = useMemo(() => profile?.skills ?? [], [profile?.skills]);
  const skills = draftSkills ?? profileSkills;
  const yearsDisplayValue =
    draftYears !== null
      ? draftYears
      : profile?.yearsOfExperience != null
        ? String(profile.yearsOfExperience)
        : "";

  const updateSkills = useCallback(
    (updater: (prev: string[]) => string[]) => {
      setDraftSkills((prev) => {
        const base = prev ?? profileSkills;
        return updater(base);
      });
    },
    [profileSkills],
  );

  const suggestMutation = useMutation({
    mutationFn: (role: string) => suggestSkills(role),
    onSuccess: (data) => {
      setSuggestedSkills(data.skills ?? []);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      skills: string[];
      yearsOfExperience?: number | null;
    }) => updateProfile(payload),
    onSuccess: () => {
      setDraftYears(null);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
  });

  const parseMutation = useMutation({
    mutationFn: (input: string | File) =>
      typeof input === "string" ? parseResume(input) : parseResumeFile(input),
    onSuccess: (data) => {
      setResumeText("");
      setSelectedFile(null);
      setFileError(null);
      setLastParseAssessment(data?.resumeAssessment ?? null);
      setLastParseSuggestedSkills(
        dedupeSkills([
          ...(data?.skills ?? []),
          ...(data?.suggestedSkills ?? []),
        ]),
      );
      if (data?.yearsOfExperience != null)
        setDraftYears(String(data.yearsOfExperience));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Resume parsed");
    },
  });

  const addToMySkills = useCallback(
    (skill: string) => {
      const s = skill.trim();
      if (!s) return;
      updateSkills((prev) => dedupeSkills([...prev, s]));
    },
    [updateSkills],
  );

  const removeFromMySkills = useCallback(
    (index: number) => {
      updateSkills((prev) => prev.filter((_, i) => i !== index));
    },
    [updateSkills],
  );

  const removeAllSkills = useCallback(() => {
    setDraftSkills([]);
    updateMutation.mutate({ skills: [] });
  }, [updateMutation]);

  const handleAddCustom = useCallback(() => {
    addToMySkills(customSkill);
    setCustomSkill("");
  }, [customSkill, addToMySkills]);

  const handleSaveProfile = useCallback(() => {
    const nextSkills = dedupeSkills(skills);
    const rawYears = yearsDisplayValue.trim();
    const yearsOfExperience: number | null =
      rawYears === ""
        ? null
        : Math.min(
            YEARS_OF_EXPERIENCE_MAX,
            Math.max(0, parseInt(rawYears, 10) || 0),
          );
    updateMutation.mutate({ skills: nextSkills, yearsOfExperience });
  }, [skills, yearsDisplayValue, updateMutation]);

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
    <div className="min-h-screen flex flex-col">
      <AppHeader user={user} onLogout={logout} />

      <main
        id="main-content"
        className={cn(
          "mx-auto flex-1 w-full py-8",
          CONTENT_MAX_W,
          SECTION_GAP,
          PAGE_PX,
        )}
      >
        <h1 className="sr-only">Profile</h1>
        <div className="min-w-0 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:items-stretch">
          <section aria-label="Resume and skills" className={cn("space-y-3 min-w-0")}>
            <h2 className="eyebrow">Resume &amp; skills</h2>
            <SkillsEditor
              idPrefix="profile"
              introText="Add skills manually or from your resume for job match and search."
              yearsValue={yearsDisplayValue}
              onYearsChange={setDraftYears}
              yearsLabel="Years of experience"
              showRoleBlock
              roleValue={currentRole}
              onRoleChange={setCurrentRole}
              onSuggest={() =>
                currentRole.trim() && suggestMutation.mutate(currentRole.trim())
              }
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
                  ? parseMutation.error instanceof Error
                    ? parseMutation.error.message
                    : "Failed to parse resume"
                  : null,
                onFileChange: handleFileChange,
                onDrop: handleDrop,
              }}
              skills={skills}
              onRemoveSkill={removeFromMySkills}
              onRemoveAllSkills={removeAllSkills}
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
              resumeAssessment={lastParseAssessment}
              resumeSuggestedSkills={lastParseSuggestedSkills.filter(
                (s) =>
                  !skills.some((sk) => sk.toLowerCase() === s.toLowerCase()),
              )}
              onAddResumeSuggestedSkill={addToMySkills}
            />
          </section>

          <section
            aria-label="Saved listings"
            className={cn(GAP_MD, "min-w-0 flex flex-col min-h-0")}
          >
            <h2 className="eyebrow">Saved listings</h2>
            {isLoadingSaved && (
              <Card
                variant="default"
                className="border-border flex-1 min-h-[26rem]"
              >
                <CardContent className={CARD_PADDING_COMPACT}>
                  <div className="flex flex-col gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-32 animate-pulse rounded-xl bg-muted"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!isLoadingSaved && savedListings.length === 0 && (
              <Card
                variant="default"
                className="border-border flex-1 min-h-[26rem] flex flex-col"
              >
                <CardContent className={cn(EMPTY_STATE_PADDING, "flex flex-col flex-1 justify-start items-center gap-4")}>
                  <p className="text-muted-foreground text-center mb-0">
                    You haven&apos;t saved any listings yet. Browse jobs to save
                    your favorites.
                  </p>
                  <Button asChild variant="default" size="sm" className="w-fit">
                    <Link href="/browse">Browse jobs</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isLoadingSaved && savedListings.length > 0 && (
              <Card
                variant="default"
                className="border-border flex-1 min-h-0 flex flex-col"
              >
<CardContent className={CARD_PADDING_COMPACT}>
                <div className="flex flex-col gap-4">
                  {savedListings.map((s) => {
                      const listing = savedListingToListingResult(s);
                      return (
                        <ListingCard
                          key={s.id}
                          listing={listing}
                          href={`/browse?job=${listing.id}`}
                          isSaved
                          onUnsave={() => unsaveMutation.mutate(s.listingId)}
                          onView={() => {}}
                          onAddToCompare={() =>
                            addToCompare({
                              id: listing.id,
                              title: listing.title,
                            })
                          }
                          isInCompareSet={isInCompareSet(listing.id)}
                          compareSetSize={compareSet.length}
                        />
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/** Profile page: protected; two columns on lg (resume/skills left, saved listings right). */
export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <UserOnlyRoute>
        <ProfileContent />
      </UserOnlyRoute>
    </Suspense>
  );
}
