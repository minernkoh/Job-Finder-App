/**
 * Listing form: shared create/edit form for job listings (title, company, location, description, country, sourceUrl). Used by admin listings page.
 */

"use client";

import { Button, Input, Label } from "@ui/components";
import { FormField } from "@/components/form-field";
import { InlineError } from "@/components/page-state";

export interface ListingFormValue {
  title: string;
  company: string;
  location?: string;
  description?: string;
  country: string;
  sourceUrl?: string;
}

interface ListingFormProps {
  mode: "create" | "edit";
  value: ListingFormValue;
  onChange: (patch: Partial<ListingFormValue>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitLabel: string;
  submitting: boolean;
  error: string | null;
  /** Prefix for input ids to avoid duplicate ids when create and edit are both in DOM (e.g. "create-", "edit-"). */
  idPrefix: string;
}

const textareaClass =
  "min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

/** Renders the six-field listing form; parent owns state and passes value, onChange, and submit handler. */
export function ListingForm({
  mode,
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  submitting,
  error,
  idPrefix,
}: ListingFormProps) {
  const p = idPrefix;
  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <FormField id={`${p}title`} label="Title *" required>
        <Input
          id={`${p}title`}
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          required
          placeholder={mode === "create" ? "Job title" : undefined}
        />
      </FormField>
      <FormField id={`${p}company`} label="Company *" required>
        <Input
          id={`${p}company`}
          value={value.company}
          onChange={(e) => onChange({ company: e.target.value })}
          required
          placeholder={mode === "create" ? "Company name" : undefined}
        />
      </FormField>
      <FormField id={`${p}location`} label="Location">
        <Input
          id={`${p}location`}
          value={value.location ?? ""}
          onChange={(e) => onChange({ location: e.target.value })}
          placeholder={mode === "create" ? "e.g. Singapore" : undefined}
        />
      </FormField>
      <div className="grid gap-2">
        <Label htmlFor={`${p}description`}>Description</Label>
        <textarea
          id={`${p}description`}
          className={textareaClass}
          value={value.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={mode === "create" ? "Job description (optional)" : undefined}
        />
      </div>
      <FormField id={`${p}country`} label="Country (2-letter)">
        <Input
          id={`${p}country`}
          value={value.country ?? "sg"}
          onChange={(e) =>
            onChange({ country: e.target.value.slice(0, 2) })
          }
          placeholder="sg"
        />
      </FormField>
      <FormField id={`${p}sourceUrl`} label="Source URL">
        <Input
          id={`${p}sourceUrl`}
          type="url"
          value={value.sourceUrl ?? ""}
          onChange={(e) => onChange({ sourceUrl: e.target.value })}
          placeholder={mode === "create" ? "https://..." : undefined}
        />
      </FormField>
      {error != null && error !== "" && <InlineError message={error} />}
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? (mode === "create" ? "Creating…" : "Saving…") : submitLabel}
        </Button>
        {onCancel != null && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
