import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  // React 19: ref 作为普通 prop, 无需 forwardRef
  ref?: Ref<HTMLButtonElement>;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] text-white hover:opacity-90 ring-1 ring-[var(--color-accent)]",
  secondary:
    "bg-neutral-2 hover:bg-neutral-3 dark:bg-[var(--neutral-2)] dark:hover:bg-[var(--neutral-3)] text-neutral-9 dark:text-[var(--neutral-9)] ring-1 ring-border",
  ghost:
    "text-neutral-7 dark:text-[var(--neutral-7)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] hover:text-neutral-9 dark:hover:text-[var(--neutral-9)]",
  danger:
    "bg-error/10 text-error hover:bg-error/20 ring-1 ring-error/30",
};

const sizes: Record<Size, string> = {
  sm: "text-label-12 px-2.5 py-1 gap-1",
  md: "text-copy-14 px-3.5 py-1.5 gap-1.5",
  lg: "text-copy-15 px-5 py-2.5 gap-2",
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors duration-300 ease-breathe",
        "disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
