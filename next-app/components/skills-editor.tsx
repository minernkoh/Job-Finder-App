/**
 * Shared skills editor: role + suggest, custom skill, optional resume upload/paste, and skills list. Used by Profile and Onboarding to keep behavior and layout in sync.
 */

"use client";

import { Button, Card, CardContent, Input, Label } from "@ui/components";
import { FileTextIcon, SparkleIcon, UploadIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@ui/components/lib/utils";

export interface SkillsEditorResumeProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  setFileError: (e: string | null) => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  fileError: string | null;
  resumeText: string;
  setResumeText: (v: string) => void;
  onParse: () => void;
  parsePending: boolean;
  parseError: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  pasteLabel?: string;
  parseButtonLabel?: string;
}

export interface SkillsEditorProps {
  /** Prefix for input ids (e.g. "profile", "onboarding"). */
  idPrefix: string;
  /** Optional intro paragraph. */
  introText?: string;
  /** Show role + suggest block. */
  showRoleBlock: boolean;
  roleValue: string;
  onRoleChange: (v: string) => void;
  onSuggest: () => void;
  suggestPending: boolean;
  suggestedSkills: string[];
  onAddSuggestedSkill: (skill: string) => void;
  customSkill: string;
  onCustomSkillChange: (v: string) => void;
  onAddCustom: () => void;
  /** Show "Or add a custom skill" block (e.g. hide on onboarding resume tab). */
  showCustomBlock?: boolean;
  /** Show resume upload + paste + parse block. */
  showResumeBlock: boolean;
  resumeProps?: SkillsEditorResumeProps;
  skills: string[];
  onRemoveSkill: (index: number) => void;
  emptySkillsMessage: string;
  /** Override "Your skills" section heading (e.g. "Your skills (from resume + manual)"). */
  yourSkillsHeading?: string;
  /** Show "Your skills" section with optional Save button (Profile). */
  showSaveBlock?: boolean;
  onSave?: () => void;
  savePending?: boolean;
  saveError?: string | null;
  saveButtonLabel?: string;
}

/** Renders role input, suggest pills, custom skill, optional resume block, and skills list with optional save. */
export function SkillsEditor({
  idPrefix,
  introText,
  showRoleBlock,
  roleValue,
  onRoleChange,
  onSuggest,
  suggestPending,
  suggestedSkills,
  onAddSuggestedSkill,
  customSkill,
  onCustomSkillChange,
  onAddCustom,
  showCustomBlock = true,
  showResumeBlock,
  resumeProps,
  skills,
  onRemoveSkill,
  emptySkillsMessage,
  yourSkillsHeading,
  showSaveBlock = false,
  onSave,
  savePending = false,
  saveError = null,
  saveButtonLabel = "Save profile",
}: SkillsEditorProps) {
  return (
    <Card variant="default" className="border-border">
      <CardContent className="p-4 space-y-3">
        {introText && (
          <p className="text-sm text-muted-foreground">{introText}</p>
        )}
        {showRoleBlock && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-role`} className="text-sm">
                Current role (e.g. Frontend Developer)
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`${idPrefix}-role`}
                  type="text"
                  placeholder="e.g. Software Engineer"
                  value={roleValue}
                  onChange={(e) => onRoleChange(e.target.value)}
                  className="flex-1"
                  aria-label="Current role"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="default"
                  disabled={!roleValue.trim() || suggestPending}
                  onClick={onSuggest}
                  aria-label="Suggest skills"
                >
                  <SparkleIcon className="mr-1.5 size-4" aria-hidden />
                  {suggestPending ? "Suggesting…" : "Suggest skills"}
                </Button>
              </div>
            </div>
            {suggestedSkills.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Suggested skills — click to add
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedSkills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => onAddSuggestedSkill(skill)}
                      className="rounded-full px-3 py-1 text-sm bg-muted border border-border hover:bg-muted/80 text-foreground"
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {showCustomBlock && (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-custom`} className="text-sm">
              Or add a custom skill
            </Label>
            <div className="flex gap-2">
              <Input
                id={`${idPrefix}-custom`}
                type="text"
                placeholder="e.g. TypeScript"
                value={customSkill}
                onChange={(e) => onCustomSkillChange(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), onAddCustom())
                }
                className="flex-1"
                aria-label="Custom skill"
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                disabled={!customSkill.trim()}
                onClick={onAddCustom}
                aria-label="Add skill"
              >
                Add
              </Button>
            </div>
          </div>
        )}
        {showResumeBlock && resumeProps && (
          <>
            <div className="space-y-2">
              <Label className="text-sm">Or upload a PDF or DOCX (max 5MB)</Label>
              <input
                ref={resumeProps.fileInputRef}
                type="file"
                accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                aria-hidden
                onChange={resumeProps.onFileChange}
              />
              <div
                role="button"
                tabIndex={0}
                onDragOver={(e) => {
                  e.preventDefault();
                  resumeProps.setDragOver(true);
                }}
                onDragLeave={() => resumeProps.setDragOver(false)}
                onDrop={resumeProps.onDrop}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    resumeProps.fileInputRef.current?.click();
                  }
                }}
                onClick={() => resumeProps.fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 px-4 cursor-pointer transition-colors",
                  resumeProps.dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                )}
                aria-label="Drop PDF or DOCX here or click to choose file"
              >
                <UploadIcon className="size-8 text-muted-foreground" aria-hidden />
                <span className="text-sm text-muted-foreground">
                  {resumeProps.selectedFile
                    ? resumeProps.selectedFile.name
                    : "Drop a PDF or DOCX here or click to choose file"}
                </span>
              </div>
              {resumeProps.selectedFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    resumeProps.setSelectedFile(null);
                    resumeProps.setFileError(null);
                  }}
                >
                  Clear file
                </Button>
              )}
              {resumeProps.fileError && (
                <p className="text-sm text-destructive" role="alert">
                  {resumeProps.fileError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-resume-paste`} className="text-sm">
                {resumeProps.pasteLabel ?? "Or paste resume text"}
              </Label>
              <textarea
                id={`${idPrefix}-resume-paste`}
                placeholder="Paste resume or CV text here..."
                value={resumeProps.resumeText}
                onChange={(e) => resumeProps.setResumeText(e.target.value)}
                className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Resume text"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={
                !(
                  resumeProps.selectedFile != null ||
                  resumeProps.resumeText.trim().length > 0
                ) || resumeProps.parsePending
              }
              onClick={resumeProps.onParse}
              aria-label={resumeProps.parseButtonLabel ?? "Parse resume and save skills"}
            >
              <FileTextIcon className="mr-1.5 size-4" aria-hidden />
              {resumeProps.parsePending ? "Parsing…" : resumeProps.parseButtonLabel ?? "Parse resume"}
            </Button>
            {resumeProps.parseError && (
              <p className="text-sm text-destructive" role="alert">
                {resumeProps.parseError}
              </p>
            )}
          </>
        )}
        <div className="pt-2 border-t border-border space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {yourSkillsHeading ?? "Your skills"}
          </p>
          {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptySkillsMessage}</p>
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
                      onClick={() => onRemoveSkill(index)}
                      className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                      aria-label={`Remove ${skill}`}
                    >
                      <XIcon className="size-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            )}
          {showSaveBlock && (
            <>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={skills.length === 0 || savePending}
                onClick={onSave}
                aria-label={saveButtonLabel}
              >
                {savePending ? "Saving…" : saveButtonLabel}
              </Button>
              {saveError && (
                <p className="text-sm text-destructive" role="alert">
                  {saveError}
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
