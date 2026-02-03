/**
 * Button component with variants (default, outline, destructive, etc.) and sizes. Can render as a link when asChild is true.
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@ui/components/lib/utils";

/** Tailwind class combinations for each button variant and size. Dark mode; rounded-xl for Switch-style. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[0.1875rem] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-14 min-w-[6.5rem] px-5 py-3.5 has-[>svg]:px-4",
        xs: "h-8 min-w-0 gap-1 rounded-lg px-2.5 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-12 min-w-[5.5rem] rounded-xl gap-1.5 px-4 py-3 has-[>svg]:px-3",
        lg: "h-16 min-w-[8rem] rounded-xl px-6 py-4 has-[>svg]:px-5",
        icon: "size-10 min-w-0",
        "icon-xs":
          "size-8 min-w-0 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 min-w-0",
        "icon-lg": "size-12 min-w-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/** Inline spinner for loading state; no external icon dependency. */
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

/** Renders a button (or a link when asChild is used). Pass variant and size to change how it looks. Supports loading spinner and optional icon/iconRight slots. */
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  icon,
  iconRight,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled ?? loading;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isDisabled}
      aria-busy={loading ? true : undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? (
            <Spinner className="size-4 shrink-0 [&_.animate-spin]:size-4" />
          ) : (
            icon && <span className="shrink-0">{icon}</span>
          )}
          {children}
          {!loading && iconRight && (
            <span className="shrink-0">{iconRight}</span>
          )}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
