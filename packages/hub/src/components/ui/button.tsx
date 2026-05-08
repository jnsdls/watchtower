import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex h-7 items-center justify-center gap-1.5 rounded-2 border border-border px-2.5 font-medium text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-fg bg-fg text-bg hover:bg-fg-soft",
        ghost:
          "border-transparent bg-transparent text-muted hover:bg-hover hover:text-fg",
        danger:
          "border-st-failed-bd bg-st-failed-bg text-st-failed hover:border-st-failed hover:bg-st-failed-bg",
      },
      size: {
        default: "h-7 px-2.5",
        sm: "h-7 px-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
