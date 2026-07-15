import { cn } from "@/lib/utils";

type Status = "open" | "in_progress" | "review" | "closed" | "merged" | "draft" | "pending" | "running" | "success" | "failed";

const colorMap: Record<Status, string> = {
  open: "#33a6b8",
  in_progress: "#a87a3d",
  review: "#3d6896",
  closed: "#787670",
  merged: "#5e9f7e",
  draft: "#a8a69f",
  pending: "#a8a69f",
  running: "#a87a3d",
  success: "#5e9f7e",
  failed: "#a64953",
};

const labelMap: Record<Status, string> = {
  open: "待办",
  in_progress: "进行中",
  review: "评审中",
  closed: "已关闭",
  merged: "已合并",
  draft: "草稿",
  pending: "等待中",
  running: "运行中",
  success: "成功",
  failed: "失败",
};

interface StatusDotProps {
  status: Status;
  label?: boolean;
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ status, label, pulse, className }: StatusDotProps) {
  const color = colorMap[status];
  const isPulsing = pulse && (status === "running" || status === "pending");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-label-12 text-neutral-7 dark:text-[var(--neutral-7)]",
        className,
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          isPulsing && "animate-breathe",
        )}
        style={{ backgroundColor: color }}
      />
      {label && <span>{labelMap[status]}</span>}
    </span>
  );
}
