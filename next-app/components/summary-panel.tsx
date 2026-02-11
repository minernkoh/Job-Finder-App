/**
 * Shared AI summary panel: tldr, responsibilities, requirements, SG signals, caveats. Used by job detail and summarize pages.
 */

import { Card, CardContent } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { CARD_PADDING_COMPACT } from "@/lib/layout";
import { EYEBROW_CLASS, EYEBROW_MB } from "@/lib/styles";
import type { SummaryWithId } from "@/lib/api/summaries";

interface SummaryPanelProps {
  summary: SummaryWithId;
  /** When true (default), show jdMatch section. Set false for summarize page which has no listing context. */
  showJdMatch?: boolean;
}

export function SummaryPanel({ summary, showJdMatch = true }: SummaryPanelProps) {
  return (
    <Card variant="elevated" className="text-sm">
      <CardContent className={cn(CARD_PADDING_COMPACT, "space-y-4")}>
        <p className="text-foreground">{summary.tldr}</p>
        {summary.keyResponsibilities &&
          summary.keyResponsibilities.length > 0 && (
            <div>
              <h3 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>Key responsibilities</h3>
              <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                {summary.keyResponsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        {summary.requirements && summary.requirements.length > 0 && (
          <div>
            <h3 className={cn(EYEBROW_CLASS, EYEBROW_MB)}>Requirements</h3>
            <ul className="list-disc pl-5 space-y-0.5 text-foreground">
              {summary.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.salarySgd && (
          <p className="text-foreground">
            <span className={cn(EYEBROW_CLASS)}>Salary (SGD): </span>
            {summary.salarySgd}
          </p>
        )}
        {showJdMatch && summary.jdMatch && (
          <div className="space-y-1">
            <p className="text-foreground">
              <span className={EYEBROW_CLASS}>Match to your skills: </span>
              {typeof summary.jdMatch.matchScore === "number" && (
                <span className="font-medium">{summary.jdMatch.matchScore}%</span>
              )}
            </p>
            {summary.jdMatch.matchedSkills &&
              summary.jdMatch.matchedSkills.length > 0 && (
                <p className="text-foreground text-xs">
                  <span className={EYEBROW_CLASS}>Matched: </span>
                  {summary.jdMatch.matchedSkills.join(", ")}
                </p>
              )}
            {summary.jdMatch.missingSkills &&
              summary.jdMatch.missingSkills.length > 0 && (
                <p className="text-muted-foreground text-xs">
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
      </CardContent>
    </Card>
  );
}
