/**
 * Summarize page: paste job URL or raw job description text and get an AI summary. Protected.
 */

"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeftIcon, ArrowRightIcon, SparkleIcon } from "@phosphor-icons/react";
import { Button, Card, CardContent, Label } from "@ui/components";
import { cn } from "@ui/components/lib/utils";
import { ProtectedRoute } from "@/components/protected-route";
import { createSummary } from "@/lib/api/summaries";
import type { SummaryWithId } from "@/lib/api/summaries";
import { useState } from "react";

const eyebrowClass = "text-xs uppercase tracking-widest text-muted-foreground";

/** Renders AI summary: tldr, responsibilities, requirements, SG signals, caveats. */
function SummaryPanel({ summary }: { summary: SummaryWithId }) {
  return (
    <Card variant="elevated" className="text-sm">
      <CardContent className="p-4 space-y-4">
        <p className="text-foreground">{summary.tldr}</p>
        {summary.keyResponsibilities &&
          summary.keyResponsibilities.length > 0 && (
            <div>
              <h3 className={cn(eyebrowClass, "mb-1")}>Key responsibilities</h3>
              <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                {summary.keyResponsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        {summary.requirements && summary.requirements.length > 0 && (
          <div>
            <h3 className={cn(eyebrowClass, "mb-1")}>Requirements</h3>
            <ul className="list-disc pl-5 space-y-0.5 text-foreground">
              {summary.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.salarySgd && (
          <p className="text-foreground">
            <span className={cn(eyebrowClass)}>Salary (SGD): </span>
            {summary.salarySgd}
          </p>
        )}
        {summary.skillsFutureKeywords &&
          summary.skillsFutureKeywords.length > 0 && (
            <p className="text-foreground">
              <span className={cn(eyebrowClass)}>SkillsFuture: </span>
              {summary.skillsFutureKeywords.join(", ")}
            </p>
          )}
        {summary.caveats && summary.caveats.length > 0 && (
          <p className="text-muted-foreground text-xs">
            <span className={eyebrowClass}>Caveats: </span>
            {summary.caveats.join("; ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

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
    <div className="min-h-screen bg-background p-4">
      <header className="mx-auto flex max-w-2xl items-center border-b border-border py-4">
        <Link
          href="/jobs"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon size={16} />
          Back to jobs
        </Link>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 py-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Summarize with AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste a job posting URL or raw job description text below.
        </p>

        {summary ? (
          <div className="space-y-3">
            <h2 className={eyebrowClass}>Summary</h2>
            <SummaryPanel summary={summary} />
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
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="summarize-input" className={eyebrowClass}>
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
              variant="cta"
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
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        )}
      </main>
    </div>
  );
}

/** Summarize page: protected. */
export default function SummarizePage() {
  return (
    <ProtectedRoute>
      <SummarizeContent />
    </ProtectedRoute>
  );
}
