/**
 * Card component for content containers. Dark mode; supports variants and optional interactive hover/focus ring (MedTracker-style).
 */

import * as React from "react";
import { cn } from "@ui/components/lib/utils";

const cardVariants = {
  default: "border border-border bg-card shadow-sm",
  elevated: "border-transparent bg-card shadow-lg",
  outlined: "border-2 border-border bg-transparent",
} as const;

const interactiveAccentClasses = {
  primary:
    "cursor-pointer transition-all hover:ring-2 hover:ring-primary hover:shadow-lg focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background",
  secondary:
    "cursor-pointer transition-all hover:ring-2 hover:ring-secondary hover:shadow-lg focus-within:ring-2 focus-within:ring-secondary focus-within:ring-offset-2 focus-within:ring-offset-background",
  destructive:
    "cursor-pointer transition-all hover:ring-2 hover:ring-destructive hover:shadow-lg focus-within:ring-2 focus-within:ring-destructive focus-within:ring-offset-2 focus-within:ring-offset-background",
} as const;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants;
  interactive?: boolean;
  accent?: keyof typeof interactiveAccentClasses;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      interactive = false,
      accent = "primary",
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl text-card-foreground",
        cardVariants[variant],
        interactive && interactiveAccentClasses[accent],
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
