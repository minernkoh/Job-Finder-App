/**
 * Onboarding page: after signup, user adds skills (manual with AI suggest + pills, or resume). Protected; redirects if already has skills.
 */

"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/protected-route";
import { AppHeader } from "@/components/app-header";
import { fetchProfile, updateProfile, suggestSkills, parseResume, parseResumeFile } from "@/lib/api/profile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components";
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

type Tab = "manual" | "resume";

/** Inner onboarding content: manual (role + suggest + pills) or resume; Continue saves and redirects. */
function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const redirectTo = searchParams?.get("redirect") ?? "/browse";

  const [tab, setTab] = useState<Tab>("manual");
  const [currentRole, setCurrentRole] = useState("");
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [mySkills, setMySkills] = useState<string[]>([]);
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

  // If user already has skills, redirect.
  useEffect(() => {
    if (isLoadingProfile) return;
    const skills = profile?.skills ?? [];
    if (skills.length > 0) {
      router.replace(redirectTo);
    }
  }, [profile?.skills, isLoadingProfile, redirectTo, router]);

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
      router.replace(redirectTo);
    },
  });

  const parseMutation = useMutation({
    mutationFn: (input: string | File) =>
      typeof input === "string" ? parseResume(input) : parseResumeFile(input),
    onSuccess: (data) => {
      const newSkills = data?.skills ?? [];
      setMySkills((prev) => dedupeSkills([...prev, ...newSkills]));
      setResumeText("");
      setSelectedFile(null);
      setFileError(null);
    },
  });

  const handleSuggest = useCallback(() => {
    const role = currentRole.trim();
    if (!role) return;
    suggestMutation.mutate(role);
  }, [currentRole, suggestMutation]);

  const addToMySkills = useCallback((skill: string) => {
    const s = skill.trim();
    if (!s) return;
    setMySkills((prev) => dedupeSkills([...prev, s]));
  }, []);

  const removeFromMySkills = useCallback((index: number) => {
    setMySkills((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddCustom = useCallback(() => {
    addToMySkills(customSkill);
    setCustomSkill("");
  }, [customSkill, addToMySkills]);

  const handleContinue = useCallback(() => {
    const skills = dedupeSkills(mySkills);
    if (skills.length === 0) return;
    updateMutation.mutate(skills);
  }, [mySkills, updateMutation]);

  const handleSkip = useCallback(() => {
    router.replace(redirectTo);
  }, [redirectTo, router]);

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

  const canContinue = dedupeSkills(mySkills).length > 0 && !updateMutation.isPending;

  if (isLoadingProfile) {
    return (
      <div className={cn("min-h-screen flex flex-col", PAGE_PX)}>
        <AppHeader user={user} onLogout={logout} />
        <main id="main-content" className={cn("mx-auto flex-1 w-full py-8", CONTENT_MAX_W, SECTION_GAP)}>
          <p className="text-muted-foreground">Loading…</p>
        </main>
      </div>
    );
  }

  const skills = profile?.skills ?? [];
  if (skills.length > 0) {
    return (
      <div className={cn("min-h-screen flex flex-col", PAGE_PX)}>
        <AppHeader user={user} onLogout={logout} />
        <main id="main-content" className={cn("mx-auto flex-1 w-full py-8", CONTENT_MAX_W, SECTION_GAP)}>
          <p className="text-muted-foreground">Redirecting…</p>
        </main>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen flex flex-col", PAGE_PX)}>
      <AppHeader user={user} onLogout={logout} />

      <main id="main-content" className={cn("mx-auto flex-1 w-full py-8", CONTENT_MAX_W, SECTION_GAP)}>
        <section aria-label="Onboarding" className="max-w-xl mx-auto space-y-6">
          <h1 className="text-2xl font-semibold text-foreground">
            Add your skills for better job matches
          </h1>
          <p className="text-muted-foreground">
            Add skills manually or from your resume. We use them to show match scores on job listings.
          </p>

          <div className="flex gap-2 border-b border-border" role="tablist">
            <button
              type="button"
              onClick={() => setTab("manual")}
              role="tab"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors",
                tab === "manual"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              aria-selected={tab === "manual"}
              aria-controls="onboarding-manual"
              id="tab-manual"
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setTab("resume")}
              role="tab"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors",
                tab === "resume"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              aria-selected={tab === "resume"}
              aria-controls="onboarding-resume"
              id="tab-resume"
            >
              Resume
            </button>
          </div>

          {tab === "manual" && (
            <div id="onboarding-manual" role="tabpanel" aria-labelledby="tab-manual" className="space-y-4">
              <SkillsEditor
                idPrefix="onboarding-manual"
                showRoleBlock
                roleValue={currentRole}
                onRoleChange={setCurrentRole}
                onSuggest={handleSuggest}
                suggestPending={suggestMutation.isPending}
                suggestedSkills={suggestedSkills}
                onAddSuggestedSkill={addToMySkills}
                customSkill={customSkill}
                onCustomSkillChange={setCustomSkill}
                onAddCustom={handleAddCustom}
                showResumeBlock={false}
                skills={mySkills}
                onRemoveSkill={removeFromMySkills}
                emptySkillsMessage="No skills added yet. Use suggestions above or add custom."
              />
            </div>
          )}

          {tab === "resume" && (
            <div id="onboarding-resume" role="tabpanel" aria-labelledby="tab-resume" className="space-y-4">
              <SkillsEditor
                idPrefix="onboarding-resume"
                introText="Upload a PDF or DOCX or paste resume text. We extract skills and add them to your list."
                showRoleBlock={false}
                roleValue=""
                onRoleChange={() => {}}
                onSuggest={() => {}}
                suggestPending={false}
                suggestedSkills={[]}
                onAddSuggestedSkill={() => {}}
                customSkill=""
                onCustomSkillChange={() => {}}
                onAddCustom={() => {}}
                showCustomBlock={false}
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
                  parseButtonLabel: "Parse resume",
                }}
                skills={mySkills}
                onRemoveSkill={removeFromMySkills}
                emptySkillsMessage="No skills extracted yet. Upload or paste a resume above."
                yourSkillsHeading="Your skills (from resume + manual)"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-4">
            <Button
              type="button"
              variant="default"
              size="default"
              disabled={!canContinue}
              onClick={handleContinue}
              aria-label="Continue to browse jobs"
            >
              Continue
            </Button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Skip for now
            </button>
            {updateMutation.isError && (
              <p className="text-sm text-destructive" role="alert">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : "Failed to save profile"}
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/** Onboarding page: protected; redirects if user already has skills; otherwise manual or resume skills, then redirect. */
export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <ProtectedRoute>
        <OnboardingContent />
      </ProtectedRoute>
    </Suspense>
  );
}
