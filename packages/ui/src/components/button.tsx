/**
 * Button component with variants (default, outline, destructive, etc.) and sizes. Can render as a link when asChild is true.
 * Hover states are defined in variants only; do not override hover via className for consistency.
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@ui/components/lib/utils";

/** Tailwind class combinations for each button variant and size. Dark mode; rounded-xl for Switch-style. Hover uses colour-invert (background and text swap) for consistency. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[0.1875rem] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-foreground hover:text-primary",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent-foreground hover:text-accent dark:bg-input/30 dark:border-input dark:hover:bg-accent-foreground dark:hover:text-accent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        header:
          "border border-white bg-transparent text-white hover:bg-white hover:text-primary focus-visible:ring-white/50",
      },
      size: {
        default: "h-11 min-w-[6.5rem] px-5 py-2.5 has-[>svg]:px-4",
        xs: "h-8 min-w-0 gap-1 rounded-lg px-2.5 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 min-w-[5.5rem] rounded-xl gap-1.5 px-4 py-2 has-[>svg]:px-3",
        lg: "h-11 min-w-[8rem] rounded-xl px-6 py-2.5 has-[>svg]:px-5",
        icon: "size-10 min-w-0",
        "icon-xs":
          "min-h-[44px] min-w-[44px] rounded-lg [&_svg:not([class*='size-'])]:size-3 sm:min-h-8 sm:min-w-8",
        "icon-sm":
          "min-h-[44px] min-w-[44px] sm:min-h-9 sm:min-w-9",
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
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled ?? loading;
  const hasIconRight = Boolean(iconRight);

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(
        hasIconRight && "group",
        buttonVariants({ variant, size, className })
      )}
      disabled={isDisabled}
      aria-busy={loading ? true : undefined}
      {...props}
    >
      {asChild ? (
        hasIconRight && React.isValidElement(children) ? (
          React.cloneElement(
            children as React.ReactElement<{ children?: React.ReactNode }>,
            {
              children: (
                <>
                  {(children as React.ReactElement<{ children?: React.ReactNode }>).props.children}
                  <span className="inline-flex shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
                    {iconRight}
                  </span>
                </>
              ),
            }
          )
        ) : (
          children
        )
      ) : (
        <>
          {loading ? (
            <Spinner className="size-4 shrink-0 [&_.animate-spin]:size-4" />
          ) : (
            icon && <span className="shrink-0">{icon}</span>
          )}
          {children}
          {!loading && iconRight && (
            <span className="inline-block shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
              {iconRight}
            </span>
          )}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
