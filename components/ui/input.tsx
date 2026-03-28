"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-full border border-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] bg-[color:color-mix(in_oklab,var(--surface)_92%,white)] px-5 py-3 text-sm text-[var(--foreground)] shadow-[inset_0_1px_0_0_color-mix(in_oklab,white_65%,transparent)] transition-colors duration-200 placeholder:text-[var(--foreground-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
