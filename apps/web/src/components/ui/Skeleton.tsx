import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-neutral-3 dark:bg-[var(--neutral-3)]",
        className,
      )}
    />
  );
}
