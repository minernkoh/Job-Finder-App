/**
 * Profile page: profile/skills and saved listings for the current user. Saved listings link to the full job page. Protected.
 */

"use client";

import { toast } from "sonner";
import { Suspense, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompare } from "@/contexts/CompareContext";
import { ProtectedRoute } from "@/components/protected-route";
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
import { profileKeys } from "@/lib/query-keys";
import {
  CARD_PADDING_COMPACT,
  CONTENT_MAX_W,
  EMPTY_STATE_PADDING,
  GAP_MD,
  PAGE_PX,
  SECTION_GAP,
} from "@/lib/layout";
import { EYEBROW_CLASS } from "@/lib/styles";
import { SkillsEditor } from "@/components/skills-editor";
import { InlineError } from "@/components/page-state";
import { Button, Card, CardContent } from "@ui/components";
import { TrashIcon, XIcon } from "@phosphor-icons/react";
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
    queryKey: profileKeys.all,
    queryFn: fetchProfile,
  });
  const profileSkills = useMemo(() => profile?.skills ?? [], [profile?.skills]);
  const skills = draftSkills ?? profileSkills;
  /** Unified list of suggested skills (from role + resume) not already in skills; shown in the "Skills to add" card. */
  const skillsToAdd = useMemo(
    () =>
      dedupeSkills([...suggestedSkills, ...lastParseSuggestedSkills]).filter(
        (s) => !skills.some((sk) => sk.toLowerCase() === s.toLowerCase()),
      ),
    [suggestedSkills, lastParseSuggestedSkills, skills],
  );
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
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
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
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
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

  /** Adds a suggested skill (from role or resume) to profile and removes it from role suggestions if present. */
  const handleAddSuggestedSkill = useCallback(
    (skill: string) => {
      const s = skill.trim();
      if (!s) return;
      addToMySkills(s);
      setSuggestedSkills((prev) =>
        prev.filter((item) => item.toLowerCase() !== s.toLowerCase()),
      );
    },
    [addToMySkills],
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
          "mx-auto flex-1 min-h-0 w-full py-8",
          CONTENT_MAX_W,
          SECTION_GAP,
          PAGE_PX,
        )}
      >
        <h1 className="sr-only">Profile</h1>
        {skillsToAdd.length > 0 ? (
          /* Two-row grid so "Skills to add" and "Your skills" cards share row 1 and stay equal height. */
          <div className="min-w-0 flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 md:grid-rows-[auto_1fr] gap-6 md:gap-8 md:items-stretch">
            {/* Row 1 left: Skills to add (same row as Your skills for equal height). */}
            <section
              aria-label="Skills to add"
              className="min-w-0 flex flex-col min-h-0 gap-4 md:gap-6"
            >
              <h2 className={cn(EYEBROW_CLASS, "shrink-0")}>Skills to add</h2>
              <Card
                variant="default"
                className="border-border flex-1 min-h-0 flex flex-col"
              >
                <CardContent
                  className={cn(
                    CARD_PADDING_COMPACT,
                    "space-y-3 flex-1 min-h-0 flex flex-col overflow-y-auto",
                  )}
                >
                  <p className="text-sm text-muted-foreground">
                    Click a skill to add it to Your skills (right column).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skillsToAdd.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleAddSuggestedSkill(skill)}
                        className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Row 1 right: Your skills. */}
            <section
              aria-label="Your skills"
              className="min-w-0 flex flex-col min-h-0 gap-4 md:gap-6"
            >
              <h2 className={cn(EYEBROW_CLASS, "shrink-0")}>Your skills</h2>
              <Card
                variant="default"
                className="border-border flex-1 min-h-0 flex flex-col"
              >
                <CardContent
                  className={cn(
                    CARD_PADDING_COMPACT,
                    "space-y-3 flex-1 min-h-0 flex flex-col overflow-y-auto",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {skills.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-muted-foreground hover:text-destructive h-auto py-1 ml-auto"
                        onClick={removeAllSkills}
                        aria-label="Remove all skills"
                      >
                        <TrashIcon className="mr-1 size-3.5" aria-hidden />
                        Remove all
                      </Button>
                    )}
                  </div>
                  {skills.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No skills yet. Add your skills or generate them using your
                      current role and/or resume on the left.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm bg-muted border border-border text-foreground"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeFromMySkills(index)}
                            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                            aria-label={`Remove ${skill}`}
                          >
                            <XIcon className="size-3.5" aria-hidden />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {!isLoadingProfile && (
                    <>
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          disabled={
                            skills.length === 0 || updateMutation.isPending
                          }
                          onClick={handleSaveProfile}
                          aria-label="Save profile"
                        >
                          {updateMutation.isPending
                            ? "Saving…"
                            : "Save profile"}
                        </Button>
                      </div>
                      {updateMutation.isError && (
                        <InlineError
                          message={
                            updateMutation.error instanceof Error
                              ? updateMutation.error.message
                              : "Failed to save profile"
                          }
                        />
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Row 2 left: Skills generator. */}
            <section
              aria-label="Skills generator"
              className="min-w-0 flex flex-col min-h-0 gap-4 md:gap-6"
            >
              <h2 className={cn(EYEBROW_CLASS, "shrink-0")}>Skills generator</h2>
              <div className="min-h-0 flex-1 min-w-0 flex flex-col">
                <SkillsEditor
                  hideYourSkillsBlock
                  hideSuggestedSkillsPills
                  idPrefix="profile"
                  introText="Generate skill suggestions from current role"
                  yearsValue={yearsDisplayValue}
                  onYearsChange={setDraftYears}
                  yearsLabel="Years of experience"
                  showRoleBlock
                  roleValue={currentRole}
                  onRoleChange={setCurrentRole}
                  onSuggest={() =>
                    currentRole.trim() &&
                    suggestMutation.mutate(currentRole.trim())
                  }
                  suggestPending={suggestMutation.isPending}
                  suggestedSkills={suggestedSkills}
                  onAddSuggestedSkill={handleAddSuggestedSkill}
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
                  emptySkillsMessage="No skills yet. Add your skills or generate them using your current role and/or resume on the left."
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
                      !skills.some(
                        (sk) => sk.toLowerCase() === s.toLowerCase(),
                      ),
                  )}
                  onAddResumeSuggestedSkill={addToMySkills}
                />
              </div>
            </section>

            {/* Row 2 right: Saved listings. */}
            <section
              aria-label="Saved listings"
              className={cn(
                "min-w-0 flex flex-col min-h-0 gap-4 md:gap-6",
                "md:min-h-0",
              )}
            >
              <h2 className={cn(EYEBROW_CLASS, "shrink-0")}>Saved listings</h2>
              {isLoadingSaved && (
                <Card
                  variant="default"
                  className="border-border flex-1 min-h-0 flex flex-col overflow-hidden"
                >
                  <CardContent
                    className={cn(
                      CARD_PADDING_COMPACT,
                      "flex-1 min-h-0 overflow-y-auto",
                    )}
                  >
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
                  className="border-border flex-1 min-h-0 flex flex-col overflow-hidden"
                >
                  <CardContent
                    className={cn(
                      EMPTY_STATE_PADDING,
                      "flex flex-col flex-1 min-h-0 justify-start items-center gap-4 overflow-y-auto",
                    )}
                  >
                    <p className="text-muted-foreground text-center mb-0">
                      You haven&apos;t saved any listings yet. Browse jobs to
                      save your favorites.
                    </p>
                    <Button
                      asChild
                      variant="default"
                      size="sm"
                      className="w-fit"
                    >
                      <Link href="/browse">Browse jobs</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!isLoadingSaved && savedListings.length > 0 && (
                <Card
                  variant="default"
                  className="border-border flex-1 min-h-0 flex flex-col overflow-hidden"
                >
                  <CardContent
                    className={cn(
                      CARD_PADDING_COMPACT,
                      "overflow-y-auto min-h-0 flex-1",
                    )}
                  >
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
        ) : (
          /* No skills to add: keep two-column flex layout. */
          <div className="min-w-0 flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 md:items-stretch">
            <div className="min-w-0 flex flex-col gap-6 md:gap-8">
              <section
                aria-label="Skills generator"
                className={cn(
                  "min-w-0 flex flex-col min-h-0 flex-1 gap-4 md:gap-6",
                )}
              >
                <h2 className={cn(EYEBROW_CLASS, "shrink-0")}>Skills generator</h2>
                <div className="min-h-0 flex-1 min-w-0 flex flex-col">
                  <SkillsEditor
                    hideYourSkillsBlock
                    hideSuggestedSkillsPills
                    idPrefix="profile"
                    introText="Generate skill suggestions from current role"
                    yearsValue={yearsDisplayValue}
                    onYearsChange={setDraftYears}
                    yearsLabel="Years of experience"
                    showRoleBlock
                    roleValue={currentRole}
                    onRoleChange={setCurrentRole}
                    onSuggest={() =>
                      currentRole.trim() &&
                      suggestMutation.mutate(currentRole.trim())
                    }
                    suggestPending={suggestMutation.isPending}
                    suggestedSkills={suggestedSkills}
                    onAddSuggestedSkill={handleAddSuggestedSkill}
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
                    emptySkillsMessage="No skills yet. Add your skills or generate them using your current role and/or resume on the left."
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
                        !skills.some(
                          (sk) => sk.toLowerCase() === s.toLowerCase(),
                        ),
                    )}
                    onAddResumeSuggestedSkill={addToMySkills}
                  />
                </div>
              </section>
            </div>

            <div className="min-w-0 flex flex-col gap-6 md:gap-8">
              <section
                aria-label="Your skills"
                className={cn(
                  "min-w-0 flex flex-col min-h-0 gap-4 md:gap-6",
                  "md:min-h-0",
                )}
              >
                <h2 className={cn(EYEBROW_CLASS, "shrink-0")}>Your skills</h2>
                <Card
                  variant="default"
                  className="border-border flex-1 min-h-0 flex flex-col"
                >
                <CardContent
                  className={cn(
                    CARD_PADDING_COMPACT,
                    "space-y-3 flex-1 min-h-0 flex flex-col",
                  )}
                >
                  {skills.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No skills yet. Add your skills or generate them using your
                      current role and/or resume on the left.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {skills.map((skill, index) => (
                        <span
                          key={`${skill}-${index}`}
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm bg-muted border border-border text-foreground"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeFromMySkills(index)}
                            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                            aria-label={`Remove ${skill}`}
                          >
                            <XIcon className="size-3.5" aria-hidden />
                          </button>
                        </span>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-muted-foreground hover:text-destructive h-auto py-1 shrink-0"
                        onClick={removeAllSkills}
                        aria-label="Remove all skills"
                      >
                        <TrashIcon className="mr-1 size-3.5" aria-hidden />
                        Remove all
                      </Button>
                    </div>
                  )}
                  {!isLoadingProfile && (
                    <>
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          disabled={
                            skills.length === 0 || updateMutation.isPending
                          }
                          onClick={handleSaveProfile}
                          aria-label="Save profile"
                        >
                          {updateMutation.isPending
                            ? "Saving…"
                            : "Save profile"}
                        </Button>
                      </div>
                      {updateMutation.isError && (
                        <InlineError
                          message={
                            updateMutation.error instanceof Error
                              ? updateMutation.error.message
                              : "Failed to save profile"
                          }
                        />
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </section>

            <section
              aria-label="Saved listings"
              className={cn(
                "min-w-0 flex flex-col min-h-0 flex-1 gap-4 md:gap-6",
              )}
            >
              <h2 className={cn(EYEBROW_CLASS, "shrink-0")}>Saved listings</h2>
              {isLoadingSaved && (
                <Card
                  variant="default"
                  className="border-border flex-1 min-h-0 flex flex-col overflow-hidden"
                >
                  <CardContent
                    className={cn(
                      CARD_PADDING_COMPACT,
                      "flex-1 min-h-0 overflow-y-auto",
                    )}
                  >
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
                  className="border-border flex-1 min-h-0 flex flex-col overflow-hidden"
                >
                  <CardContent
                    className={cn(
                      EMPTY_STATE_PADDING,
                      "flex flex-col flex-1 min-h-0 justify-start items-center gap-4 overflow-y-auto",
                    )}
                  >
                    <p className="text-muted-foreground text-center mb-0">
                      You haven&apos;t saved any listings yet. Browse jobs to
                      save your favorites.
                    </p>
                    <Button
                      asChild
                      variant="default"
                      size="sm"
                      className="w-fit"
                    >
                      <Link href="/browse">Browse jobs</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!isLoadingSaved && savedListings.length > 0 && (
                <Card
                  variant="default"
                  className="border-border flex-1 min-h-0 flex flex-col overflow-hidden"
                >
                  <CardContent
                    className={cn(
                      CARD_PADDING_COMPACT,
                      "overflow-y-auto min-h-0 flex-1",
                    )}
                  >
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
          </div>
        )}
      </main>
    </div>
  );
}

/** Profile page: protected; two columns on lg (resume/skills left, saved listings right). */
export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProtectedRoute blockAdmins>
        <ProfileContent />
      </ProtectedRoute>
    </Suspense>
  );
}
