/**
 * Select: controlled dropdown with trigger button and portal-rendered listbox.
 * Dark mode; styled to match Input (height, border, radius). No external icon deps.
 */

"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@ui/components/lib/utils";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Chevron down icon (inline SVG). */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Chevron up icon (inline SVG). */
function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

/** Check icon for selected option (inline SVG). */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
}

/**
 * Controlled select dropdown. Trigger matches Input styling; panel is portal-rendered, dark theme.
 */
function Select({
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  fullWidth = true,
  id,
  name,
  "aria-label": ariaLabel = "Select",
  className,
  triggerClassName,
  panelClassName,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] =
    React.useState<React.CSSProperties | null>(null);

  const selected = options.find((o) => o.value === value);
  const displayText =
    (selected?.label ?? (value ? String(value) : "")) ||
    placeholder ||
    "Select…";

  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    if (disabled) close();
  }, [disabled, close]);

  const recomputePosition = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const desiredMaxHeight = 288;
    const width = Math.min(
      rect.width,
      Math.max(0, window.innerWidth - margin * 2)
    );
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const left = clamp(rect.left, margin, maxLeft);
    const availableBelow = Math.max(
      0,
      window.innerHeight - rect.bottom - margin
    );
    const availableAbove = Math.max(0, rect.top - margin);
    const openUp = availableBelow < 160 && availableAbove > availableBelow;
    const maxHeight = Math.min(
      desiredMaxHeight,
      openUp ? availableAbove : availableBelow
    );
    setPanelStyle({
      position: "fixed",
      left,
      width,
      zIndex: 200,
      maxHeight,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + margin }
        : { top: rect.bottom + margin }),
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    recomputePosition();
    const onScrollOrResize = () => recomputePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, recomputePosition]);

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current?.contains(event.target as Node) ||
        panelRef.current?.contains(event.target as Node)
      )
        return;
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  const handleSelect = (opt: SelectOption) => {
    if (disabled) return;
    onChange(opt.value);
    close();
  };

  const isPlaceholderSelected = !value;
  const triggerClasses = cn(
    "flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    fullWidth && "w-full",
    disabled && "cursor-not-allowed opacity-50",
    isPlaceholderSelected ? "text-muted-foreground" : "text-foreground",
    triggerClassName
  );

  const panel =
    open && panelStyle && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className={cn(
              "overflow-hidden rounded-xl border border-border bg-card shadow-lg",
              panelClassName
            )}
            role="listbox"
            aria-label={ariaLabel}
          >
            <div
              className="overflow-y-auto"
              style={
                panelStyle.maxHeight != null
                  ? { maxHeight: panelStyle.maxHeight }
                  : undefined
              }
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={`${opt.value}-${opt.label}`}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    disabled={disabled}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors",
                      disabled
                        ? "cursor-not-allowed text-muted-foreground/60"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/50 font-medium"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <CheckIcon className="shrink-0 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={triggerClasses}
        aria-haspopup="listbox"
        aria-expanded={disabled ? false : open}
        aria-label={ariaLabel}
      >
        <span className="truncate">{displayText}</span>
        {!disabled &&
          (open ? (
            <ChevronUpIcon className="shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDownIcon
              className={cn(
                "shrink-0",
                isPlaceholderSelected
                  ? "text-muted-foreground"
                  : "text-foreground"
              )}
            />
          ))}
      </button>
      {panel}
    </div>
  );
}

export { Select };
