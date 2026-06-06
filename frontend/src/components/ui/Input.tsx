import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-neutral-5 bg-neutral-1 px-3 py-2 text-sm text-neutral-9 placeholder:text-neutral-6",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent",
          "transition-all duration-200",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-2",
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
