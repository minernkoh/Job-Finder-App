/**
 * Shared skills editor: role + suggest, custom skill, optional resume upload/paste, and skills list. Used by Profile to edit skills.
 */

"use client";

import { Button, Card, CardContent, Input, Label } from "@ui/components";
import {
  FileTextIcon,
  SparkleIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from "@phosphor-icons/react";
import { cn } from "@ui/components/lib/utils";
import { CARD_PADDING_COMPACT } from "@/lib/layout";

export interface SkillsEditorResumeProps {
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
  /** Prefix for input ids (e.g. "profile"). */
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
  /** Show "Or add a skill manually" block (e.g. hide on resume-only tab). */
  showCustomBlock?: boolean;
  /** Show resume upload + paste + parse block. */
  showResumeBlock: boolean;
  resumeProps?: SkillsEditorResumeProps;
  skills: string[];
  onRemoveSkill: (index: number) => void;
  /** Optional: callback to remove all skills (e.g. Profile page). If provided, shows "Remove all" when skills exist. */
  onRemoveAllSkills?: () => void;
  emptySkillsMessage: string;
  /** Override "Your skills" section heading (e.g. "Your skills (from resume + manual)"). */
  yourSkillsHeading?: string;
  /** Show "Your skills" section with optional Save button (Profile). */
  showSaveBlock?: boolean;
  onSave?: () => void;
  savePending?: boolean;
  saveError?: string | null;
  saveButtonLabel?: string;
  /** Optional resume assessment from last parse (AI feedback on resume quality). */
  resumeAssessment?: string | null;
  /** Optional suggested skills from last resume parse; click to add to Your skills. */
  resumeSuggestedSkills?: string[];
  /** Called when user adds a suggested skill from resume parse. */
  onAddResumeSuggestedSkill?: (skill: string) => void;
  /** Optional years of experience value (controlled). */
  yearsValue?: string;
  /** Called when years input changes. */
  onYearsChange?: (v: string) => void;
  /** Optional label (default: "Years of experience"). */
  yearsLabel?: string;
  /** Optional id for the input (default: `${idPrefix}-years`). */
  yearsInputId?: string;
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
  onRemoveAllSkills,
  emptySkillsMessage,
  yourSkillsHeading,
  showSaveBlock = false,
  onSave,
  savePending = false,
  saveError = null,
  saveButtonLabel = "Save profile",
  resumeAssessment,
  resumeSuggestedSkills = [],
  onAddResumeSuggestedSkill,
  yearsValue,
  onYearsChange,
  yearsLabel,
  yearsInputId,
}: SkillsEditorProps) {
  const fileInputId = `${idPrefix}-resume-file`;
  const yearsId = yearsInputId ?? `${idPrefix}-years`;

  return (
    <Card variant="default" className="border-border">
      <CardContent className={cn(CARD_PADDING_COMPACT, "space-y-3")}>
        {introText && (
          <p className="text-sm text-muted-foreground">{introText}</p>
        )}
        {showRoleBlock && yearsValue !== undefined && onYearsChange && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-role`} className="text-sm">
                  Current Role
                </Label>
                <Input
                  id={`${idPrefix}-role`}
                  type="text"
                  placeholder="e.g. Software Engineer"
                  value={roleValue}
                  onChange={(e) => onRoleChange(e.target.value)}
                  className="w-full h-9 min-w-0"
                  aria-label="Current role"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={yearsId} className="text-sm">
                  {yearsLabel ?? "Years of experience"}
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id={yearsId}
                    type="number"
                    min={0}
                    max={70}
                    placeholder="Optional"
                    value={yearsValue}
                    onChange={(e) => onYearsChange(e.target.value)}
                    className="w-24 h-9 shrink-0"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="default"
                    className="h-9 min-w-0 px-4 shrink-0"
                    disabled={!roleValue.trim() || suggestPending}
                    onClick={onSuggest}
                    aria-label="Suggest skills"
                  >
                    <SparkleIcon className="mr-1.5 size-4" aria-hidden />
                    {suggestPending ? "Suggesting…" : "Suggest skills"}
                  </Button>
                </div>
              </div>
            </div>
            {suggestedSkills.length > 0 && (
              <div className="space-y-1">
                <p className="eyebrow">Suggested skills — click to add</p>
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
        {showRoleBlock && (yearsValue === undefined || !onYearsChange) && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-role`} className="text-sm">
                Current Role
              </Label>
              <Input
                id={`${idPrefix}-role`}
                type="text"
                placeholder="e.g. Software Engineer"
                value={roleValue}
                onChange={(e) => onRoleChange(e.target.value)}
                className="w-full h-9 min-w-0"
                aria-label="Current role"
              />
            </div>
            <div>
              <Button
                type="button"
                variant="secondary"
                size="default"
                className="h-9 min-w-0 px-4"
                disabled={!roleValue.trim() || suggestPending}
                onClick={onSuggest}
                aria-label="Suggest skills"
              >
                <SparkleIcon className="mr-1.5 size-4" aria-hidden />
                {suggestPending ? "Suggesting…" : "Suggest skills"}
              </Button>
            </div>
            {suggestedSkills.length > 0 && (
              <div className="space-y-1">
                <p className="eyebrow">Suggested skills — click to add</p>
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
        {!showRoleBlock && yearsValue !== undefined && onYearsChange && (
          <div className="space-y-2">
            <Label htmlFor={yearsId} className="text-sm">
              {yearsLabel ?? "Years of experience"}
            </Label>
            <Input
              id={yearsId}
              type="number"
              min={0}
              max={70}
              placeholder="Optional"
              value={yearsValue}
              onChange={(e) => onYearsChange(e.target.value)}
              className="w-24"
            />
          </div>
        )}
        {showCustomBlock && (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-custom`} className="text-sm">
              Or add a skill manually
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                id={`${idPrefix}-custom`}
                type="text"
                placeholder="e.g. TypeScript"
                value={customSkill}
                onChange={(e) => onCustomSkillChange(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), onAddCustom())
                }
                className="flex-1 h-9"
                aria-label="Custom skill"
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                className="h-9 min-w-0 px-4"
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
              <Label htmlFor={fileInputId} className="text-sm">
                Or upload a PDF or DOCX (max 5MB)
              </Label>
              <input
                id={fileInputId}
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
                    document.getElementById(fileInputId)?.click();
                  }
                }}
                onClick={() => document.getElementById(fileInputId)?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 px-4 cursor-pointer transition-colors",
                  resumeProps.dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30 hover:bg-muted/50",
                )}
                aria-label="Drop PDF or DOCX here or click to choose file"
              >
                <UploadIcon
                  className="size-8 text-muted-foreground"
                  aria-hidden
                />
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
            <div className="flex justify-center">
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
                aria-label={
                  resumeProps.parseButtonLabel ?? "Parse resume and save skills"
                }
              >
                <FileTextIcon className="mr-1.5 size-4" aria-hidden />
                {resumeProps.parsePending
                  ? "Parsing…"
                  : (resumeProps.parseButtonLabel ?? "Parse resume")}
              </Button>
            </div>
            {resumeProps.parseError && (
              <p className="text-sm text-destructive" role="alert">
                {resumeProps.parseError}
              </p>
            )}
          </>
        )}
        {resumeAssessment != null && resumeAssessment.trim() !== "" && (
          <div className="space-y-1 pt-2 border-t border-border">
            <p className="eyebrow">Resume feedback</p>
            <p className="text-sm text-foreground">{resumeAssessment}</p>
          </div>
        )}
        {resumeSuggestedSkills.length > 0 && onAddResumeSuggestedSkill && (
          <div className="space-y-1 pt-2 border-t border-border">
            <p className="eyebrow">Skills from resume — click to add</p>
            <div className="flex flex-wrap gap-2">
              {resumeSuggestedSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onAddResumeSuggestedSkill(skill)}
                  className="rounded-full px-3 py-1 text-sm bg-muted border border-border hover:bg-muted/80 text-foreground"
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow m-0">{yourSkillsHeading ?? "Your skills"}</p>
            {onRemoveAllSkills && skills.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-muted-foreground hover:text-destructive h-auto py-1"
                onClick={onRemoveAllSkills}
                aria-label="Remove all skills"
              >
                <TrashIcon className="mr-1 size-3.5" aria-hidden />
                Remove all
              </Button>
            )}
          </div>
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {emptySkillsMessage}
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
              <div className="flex justify-center">
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
              </div>
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
