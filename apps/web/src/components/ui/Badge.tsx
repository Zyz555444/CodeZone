import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: "solid" | "soft" | "outline";
  className?: string;
}

export function Badge({
  children,
  color,
  variant = "soft",
  className,
}: BadgeProps) {
  const style =
    variant === "solid" && color
      ? { backgroundColor: color, color: "#fff" }
      : variant === "soft" && color
        ? { backgroundColor: `${color}1a`, color }
        : undefined;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-label-12 font-medium leading-none whitespace-nowrap",
        variant === "outline" &&
          "ring-1 ring-border text-neutral-7 dark:text-[var(--neutral-7)]",
        className,
      )}
      style={style}
    >
      {color && variant !== "solid" && variant !== "soft" && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </span>
  );
}
