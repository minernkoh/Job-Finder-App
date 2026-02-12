/**
 * AI summary card: renders tldr, key responsibilities, requirements, salary, JD match, and caveats in a consistent Card.
 * Used by job detail, summarize, compare, and browse pages. Unified from the former SummaryPanel and AISummaryCard.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import type { AISummary } from "@schemas";
import { Button, Card, CardContent } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { CARD_PADDING_DEFAULT_RESPONSIVE, GAP_MD } from "@/lib/layout";
import { EYEBROW_CLASS, EYEBROW_MB } from "@/lib/styles";

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
  /** When true (default), show jdMatch section. Set false for pages with no listing context (e.g. summarize). */
  showJdMatch?: boolean;
  /** When false, show a prompt to add skills in profile. Omit when unknown. */
  hasSkills?: boolean;
}

/** Renders AI summary content: tldr, responsibilities, requirements, salary, JD match, caveats. */
export function AISummaryCard({
  summary,
  noCard = false,
  maxResponsibilities,
  maxRequirements,
  showJdMatch = true,
  hasSkills,
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
    <div className={`${GAP_MD} text-sm`}>
      {hasSkills === false && (
        <div className="rounded-lg bg-primary/10 p-3 text-foreground">
          <p className="text-sm">
            Add your skills in your profile to get personalized match scores and recommendations.{" "}
            <Link href="/profile" className="text-primary underline hover:opacity-80">
              Add skills in Profile
            </Link>
          </p>
        </div>
      )}
      <p className="text-foreground">{summary.tldr}</p>
      {responsibilitiesShown.length > 0 && (
        <div>
          <h3 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>Key responsibilities</h3>
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
          <h3 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>Requirements</h3>
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
          <span className={EYEBROW_CLASS}>Salary (SGD): </span>
          {summary.salarySgd}
        </p>
      )}
      {showJdMatch && summary.jdMatch && (
        <div className="rounded-lg bg-primary/10 p-3 text-foreground">
          <p className="text-foreground">
            <span className={cn(EYEBROW_CLASS, "font-bold")}>Match to your skills: </span>
            {typeof summary.jdMatch.matchScore === "number" && (
              <span className="font-medium">{summary.jdMatch.matchScore}%</span>
            )}
          </p>
          <p className="mt-1 text-xs text-foreground">
            <span className={EYEBROW_CLASS}>Matched: </span>
            {summary.jdMatch.matchedSkills && summary.jdMatch.matchedSkills.length > 0
              ? summary.jdMatch.matchedSkills.join(", ")
              : "None"}
          </p>
          {summary.jdMatch.missingSkills &&
            summary.jdMatch.missingSkills.length > 0 && (
              <p className="mt-0.5 text-muted-foreground text-xs">
                <span className={EYEBROW_CLASS}>Missing: </span>
                {summary.jdMatch.missingSkills.join(", ")}
              </p>
            )}
        </div>
      )}
      {summary.caveats && summary.caveats.length > 0 && (
        <p className="text-muted-foreground text-xs">
          <span className={EYEBROW_CLASS}>Caveats: </span>
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
      <CardContent className={cn(CARD_PADDING_DEFAULT_RESPONSIVE, GAP_MD, "sm:space-y-5")}>{content}</CardContent>
    </Card>
  );
}
