/**
 * Summarize page: paste job URL or raw job description text and get an AI summary. Protected.
 */

"use client";

import { toast } from "sonner";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { Button, Card, CardContent, Label } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { AISummaryCard } from "@/components/ai-summary-card";
import { PageShell } from "@/components/page-shell";
import { InlineError } from "@/components/page-state";
import { UserOnlyRoute } from "@/components/user-only-route";
import { createSummary } from "@/lib/api/summaries";
import type { SummaryWithId } from "@/lib/api/summaries";
import { useState, Suspense } from "react";

/** Inner content: paste URL or text, summarize button, summary or error. */
function SummarizeContent() {
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState<SummaryWithId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: { url?: string; text?: string }) => createSummary(body),
    onSuccess: (data) => {
      setSummary(data);
      setError(null);
      toast.success("Summary generated");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to summarize");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setError(null);
    const isUrl = /^https?:\/\//i.test(trimmed);
    mutation.mutate(isUrl ? { url: trimmed } : { text: trimmed });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2">
          <Link
            href="/browse"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon size={16} />
            Back to browse
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        className={cn(
          "mx-auto w-full flex-1 space-y-8 px-4 py-8 sm:px-6",
          summary ? "max-w-5xl" : "max-w-2xl",
        )}
      >
        <PageShell title="Summarize with AI">
          <p className="text-sm text-muted-foreground">
            Paste a job posting URL or raw job description text below.
          </p>

          {summary ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_1fr] lg:gap-8">
              <div className="space-y-3">
                <h2 className={"eyebrow"}>AI Summary</h2>
                <AISummaryCard summary={summary} />
                <Button
                  variant="outline"
                  onClick={() => {
                    setSummary(null);
                    setInput("");
                  }}
                >
                  Summarize another
                </Button>
              </div>
              <div className="space-y-2">
                <h2 className={"eyebrow"}>Description</h2>
                <Card variant="elevated" className="text-sm">
                  <CardContent className="p-4">
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
                <Label htmlFor="summarize-input" className={"eyebrow"}>
                  URL or job description
                </Label>
                <textarea
                  id="summarize-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste a job URL (e.g. https://...) or paste the full job description text"
                  rows={8}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y min-h-[120px]"
                />
              </div>
              <Button
                type="submit"
                variant="default"
                disabled={mutation.isPending || !input.trim()}
                icon={
                  !mutation.isPending ? (
                    <SparkleIcon size={16} weight="bold" />
                  ) : undefined
                }
                iconRight={
                  !mutation.isPending ? (
                    <ArrowRightIcon weight="bold" />
                  ) : undefined
                }
              >
                {mutation.isPending ? "Summarizing…" : "Summarize with AI"}
              </Button>
              {error && <InlineError message={error} />}
            </form>
          )}
        </PageShell>
      </main>
    </div>
  );
}

/** Summarize page: protected. */
export default function SummarizePage() {
  return (
    <Suspense fallback={null}>
      <UserOnlyRoute>
        <SummarizeContent />
      </UserOnlyRoute>
    </Suspense>
  );
}
