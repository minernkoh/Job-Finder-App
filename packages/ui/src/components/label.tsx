/**
 * Form label that pairs with inputs. Use htmlFor to link to an input's id so clicking the label focuses the input.
 */

import * as React from "react";

import { cn } from "@ui/components/lib/utils";

/** Accessible label for form fields. */
const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<"label">>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
