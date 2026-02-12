/**
 * Summarize page: paste job URL or raw job description text and get a streaming AI summary. Protected.
 */

"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { Button, Card, CardContent, Label } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";
import { fetchProfile } from "@/lib/api/profile";
import { createSummaryStream, consumeSummaryStream } from "@/lib/api/summaries";
import type { SummaryWithId } from "@/lib/api/summaries";
import {
  isRateLimitMessage,
  isSummaryNotConfiguredMessage,
  SUMMARY_NOT_AVAILABLE_UI_MESSAGE,
} from "@/lib/api/errors";
import { toast } from "sonner";
import { useState, useCallback, Suspense } from "react";
import { profileKeys } from "@/lib/query-keys";
import {
  CARD_PADDING_COMPACT,
  PAGE_PX,
  TEXTAREA_BASE_CLASS,
} from "@/lib/layout";
import { EYEBROW_CLASS } from "@/lib/styles";
import { InlineError } from "@/components/page-state";
import { AISummaryCard } from "@/components/ai-summary-card";

/** Inner content: paste URL or text, summarize button, streaming summary or error. */
function SummarizeContent() {
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState<Partial<SummaryWithId> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: profileKeys.all,
    queryFn: fetchProfile,
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;
      setError(null);
      setSummary(null);
      setIsLoading(true);

      try {
        const isUrl = /^https?:\/\//i.test(trimmed);
        const body = isUrl ? { url: trimmed } : { text: trimmed };
        const result = await createSummaryStream(body);

        if (!result.stream) {
          /* Cache hit: full summary returned immediately. */
          setSummary(result.data);
          setIsLoading(false);
          return;
        }

        /* Cache miss: read NDJSON stream and merge partial updates. */
        await consumeSummaryStream(result.reader, (partial) => {
          setSummary((prev) => ({ ...prev, ...partial }));
        });
        setIsLoading(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to summarize";
        const status =
          err && typeof err === "object" && "status" in err
            ? (err as { status: number }).status
            : undefined;
        setError(
          status === 503 || isSummaryNotConfiguredMessage(message)
            ? SUMMARY_NOT_AVAILABLE_UI_MESSAGE
            : message,
        );
        setIsLoading(false);
        if (isRateLimitMessage(message)) {
          toast.error(
            "AI summary is temporarily unavailable due to rate limits. Please try again in a few minutes.",
          );
        }
      }
    },
    [input],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="nav-glass sticky top-0 z-50 mx-auto flex w-full max-w-2xl items-center border-b border-border/80 py-4">
        <Link
          href="/browse"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon size={16} />
          Back to browse
        </Link>
      </header>

      <main
        id="main-content"
        className={cn(
          "mx-auto w-full flex-1 space-y-8 py-8",
          PAGE_PX,
          summary ? "max-w-5xl" : "max-w-2xl",
        )}
      >
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Summarize with AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste a job posting URL or raw job description text below.
        </p>

        {summary && summary.tldr ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[3fr_1fr] md:gap-8">
            <div className="space-y-3">
              <h2 className={EYEBROW_CLASS}>AI Summary</h2>
              <AISummaryCard
                summary={summary as SummaryWithId}
                showJdMatch={false}
                hasSkills={(profile?.skills?.length ?? 0) > 0}
              />
              {!isLoading && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSummary(null);
                    setInput("");
                  }}
                >
                  Summarize another
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <h2 className={EYEBROW_CLASS}>Description</h2>
              <Card variant="elevated" className="text-sm">
                <CardContent className={CARD_PADDING_COMPACT}>
                  {/^https?:\/\//i.test(input) ? (
                    <p className="text-foreground text-sm">
                      Source:{" "}
                      <a
                        href={input}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:opacity-80"
                      >
                        {input}
                      </a>
                    </p>
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap text-sm">
                      {input}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="summarize-input" className={EYEBROW_CLASS}>
                URL or job description
              </Label>
              <textarea
                id="summarize-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste a job URL (e.g. https://...) or paste the full job description text"
                rows={8}
                className={cn(TEXTAREA_BASE_CLASS, "resize-y min-h-[120px]")}
              />
            </div>
            <Button
              type="submit"
              variant="default"
              disabled={isLoading || !input.trim()}
              icon={
                !isLoading ? <SparkleIcon size={16} weight="bold" /> : undefined
              }
              iconRight={
                !isLoading ? <ArrowRightIcon weight="bold" /> : undefined
              }
            >
              {isLoading ? "Summarizing…" : "Summarize with AI"}
            </Button>
            {error && <InlineError message={error} />}
          </form>
        )}
      </main>
    </div>
  );
}

/** Summarize page: protected; admins are redirected to /admin. */
export default function SummarizePage() {
  return (
    <Suspense fallback={null}>
      <ProtectedRoute blockAdmins>
        <SummarizeContent />
      </ProtectedRoute>
    </Suspense>
  );
}
