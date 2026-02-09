/**
 * Form field: label + control (slot) with consistent spacing and optional error message. Used by forms to reduce repetition.
 */

"use client";

import { Label } from "@ui/components";

interface FormFieldProps {
  id: string;
  label: React.ReactNode;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}

/** Renders a labeled form control with optional error; use htmlFor on Label so the control receives focus on label click. */
export function FormField({
  id,
  label,
  children,
  error,
  required,
}: FormFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {required && !String(label).endsWith(" *") ? " *" : null}
      </Label>
      {children}
      {error != null && error !== "" && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
