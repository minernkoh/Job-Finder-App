/**
 * AI summary card: renders tldr, key responsibilities, requirements, salary, JD match, and caveats in a consistent Card. Used by job detail, summarize, and compare pages.
 */

"use client";

import { useState } from "react";
import type { AISummary } from "@schemas";
import { Button, Card, CardContent } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { CARD_PADDING_DEFAULT } from "@/lib/layout";
import { EYEBROW_MB } from "@/lib/styles";

/** Summary shape for display: at least tldr; other fields optional so compare column can pass partial data. */
export type AISummaryCardSummary = Pick<AISummary, "tldr"> &
  Partial<Omit<AISummary, "tldr">>;

interface AISummaryCardProps {
  summary: AISummaryCardSummary;
  /** When true, render without Card wrapper (e.g. inside another card). Default false. */
  noCard?: boolean;
  /** When set, limit key responsibilities to this many (e.g. 3 for compare column). */
  maxResponsibilities?: number;
  /** When set, limit requirements to this many. */
  maxRequirements?: number;
}

/** Renders AI summary content: tldr, responsibilities, requirements, salary, JD match, caveats. */
export function AISummaryCard({
  summary,
  noCard = false,
  maxResponsibilities,
  maxRequirements,
}: AISummaryCardProps) {
  const [expandResponsibilities, setExpandResponsibilities] = useState(false);
  const [expandRequirements, setExpandRequirements] = useState(false);
  const listClass = "list-disc pl-5 space-y-0.5 text-foreground";
  const allResponsibilities = summary.keyResponsibilities ?? [];
  const allRequirements = summary.requirements ?? [];
  const responsibilitiesLimit =
    maxResponsibilities ?? allResponsibilities.length;
  const requirementsLimit = maxRequirements ?? allRequirements.length;
  const responsibilitiesShown =
    expandResponsibilities || responsibilitiesLimit >= allResponsibilities.length
      ? allResponsibilities
      : allResponsibilities.slice(0, responsibilitiesLimit);
  const requirementsShown =
    expandRequirements || requirementsLimit >= allRequirements.length
      ? allRequirements
      : allRequirements.slice(0, requirementsLimit);
  const hasMoreResponsibilities =
    allResponsibilities.length > responsibilitiesShown.length;
  const hasMoreRequirements = allRequirements.length > requirementsShown.length;

  const content = (
    <div className="space-y-4 text-sm">
      <p className="text-foreground">{summary.tldr}</p>
      {responsibilitiesShown.length > 0 && (
        <div>
          <h3 className={cn("eyebrow", EYEBROW_MB)}>Key responsibilities</h3>
          <ul className={listClass}>
            {responsibilitiesShown.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {hasMoreResponsibilities && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="mt-1 -ml-1"
              onClick={() => setExpandResponsibilities((v) => !v)}
            >
              {expandResponsibilities ? "Show less" : "Show more"}
            </Button>
          )}
        </div>
      )}
      {requirementsShown.length > 0 && (
        <div>
          <h3 className={cn("eyebrow", EYEBROW_MB)}>Requirements</h3>
          <ul className={listClass}>
            {requirementsShown.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {hasMoreRequirements && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="mt-1 -ml-1"
              onClick={() => setExpandRequirements((v) => !v)}
            >
              {expandRequirements ? "Show less" : "Show more"}
            </Button>
          )}
        </div>
      )}
      {summary.salarySgd && (
        <p className="text-foreground">
          <span className="eyebrow">Salary (SGD): </span>
          {summary.salarySgd}
        </p>
      )}
      {summary.jdMatch && (
        <div className="rounded-lg bg-primary/10 p-3 text-foreground">
          <p className="text-foreground">
            <span className="eyebrow font-bold">Match to your skills: </span>
            {typeof summary.jdMatch.matchScore === "number" && (
              <span className="font-medium">{summary.jdMatch.matchScore}%</span>
            )}
          </p>
          <p className="mt-1 text-xs text-foreground">
            <span className="eyebrow">Matched: </span>
            {summary.jdMatch.matchedSkills && summary.jdMatch.matchedSkills.length > 0
              ? summary.jdMatch.matchedSkills.join(", ")
              : "None"}
          </p>
          {summary.jdMatch.missingSkills &&
            summary.jdMatch.missingSkills.length > 0 && (
              <p className="mt-0.5 text-muted-foreground text-xs">
                <span className="eyebrow">Missing: </span>
                {summary.jdMatch.missingSkills.join(", ")}
              </p>
            )}
        </div>
      )}
      {summary.caveats && summary.caveats.length > 0 && (
        <p className="text-muted-foreground text-xs">
          <span className="eyebrow">Caveats: </span>
          {summary.caveats.join("; ")}
        </p>
      )}
    </div>
  );

  if (noCard) {
    return content;
  }
  return (
    <Card
      variant="elevated"
      className="text-sm shadow-[0_0_20px_rgba(90,70,200,0.15)]"
    >
      <CardContent className={cn(CARD_PADDING_DEFAULT, "space-y-4 sm:space-y-5")}>{content}</CardContent>
    </Card>
  );
}
