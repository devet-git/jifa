"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none rounded-lg font-medium transition",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 active:bg-indigo-800",
        secondary:
          "bg-surface text-foreground border border-border hover:bg-surface-2 hover:border-border-strong",
        ghost: "text-muted hover:text-foreground hover:bg-surface-2",
        danger:
          "bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 active:bg-red-800",
        outline:
          "border border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10",
        gradient:
          "gradient-brand text-white shadow-md shadow-indigo-600/25 hover:opacity-95",
        link: "text-brand underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        xs: "px-2.5 py-1 text-xs h-7 [&_svg]:size-3",
        sm: "px-3 py-1.5 text-xs h-8 [&_svg]:size-3.5",
        md: "px-4 py-2 text-sm h-9 [&_svg]:size-4",
        lg: "px-5 py-2.5 text-sm h-10 [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    /* Slot expects exactly one child, so the loading indicator is only
       rendered for the native <button> path. asChild + loading would
       otherwise inject a fragment and break Slot's clone semantics. */
    const content =
      loading && !asChild ? (
        <>
          <Loader2 className="animate-spin" />
          {children}
        </>
      ) : (
        children
      );
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
