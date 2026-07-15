import { cn } from "@/lib/utils";
import { avatarInitial, avatarColor } from "@/lib/format";
import type { User } from "@/lib/types";

interface AvatarProps {
  user: Pick<User, "name" | "avatar">;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  xs: "w-5 h-5 text-caption-10",
  sm: "w-6 h-6 text-label-12",
  md: "w-8 h-8 text-copy-13",
  lg: "w-12 h-12 text-copy-16",
};

export function Avatar({ user, size = "md", className }: AvatarProps) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={cn("rounded-full object-cover", sizeMap[size], className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium text-white select-none",
        sizeMap[size],
        className,
      )}
      style={{ backgroundColor: avatarColor(user.name) }}
    >
      {avatarInitial(user.name)}
    </span>
  );
}
