/**
 * Logo: SVG wordmark with briefcase icon for JobFinder. Used in headers; links to home. Uses theme colors.
 */

import Link from "next/link";
import { cn } from "@ui/components/lib/utils";

const iconSizes = { default: 24, sm: 18 } as const;

/** Renders the JobFinder logo (icon + text) as a link to home. Use in headers for consistent branding. */
export function Logo({
  size = "default",
  className = "",
}: {
  /** Size variant: default (full) or sm (compact for sticky bars). */
  size?: "default" | "sm";
  /** Optional Tailwind classes for the wrapper link (e.g. text size, hover). */
  className?: string;
}) {
  const iconSize = iconSizes[size];
  return (
    <Link
      href="/"
      className={cn(
        "flex shrink-0 items-center gap-2 no-underline transition-opacity hover:opacity-80",
        size === "sm" && "gap-1.5",
        className
      )}
      aria-label="JobFinder home"
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 text-primary"
        aria-hidden
      >
        {/* Briefcase body */}
        <path
          d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Handle */}
        <path
          d="M8 9V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Magnifying glass accent (dot) */}
        <circle
          cx="14"
          cy="14"
          r="2.5"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
      <span
        className={cn(
          "font-semibold tracking-tight text-foreground",
          size === "default" ? "text-xl" : "text-base"
        )}
      >
        JobFinder
      </span>
    </Link>
  );
}
