import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, relativeTime } from "@/lib/format";
import type { TeamMember, TeamRole } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const roleStyle: Record<TeamRole, { color: string; label: string }> = {
  owner: { color: "#a64953", label: "拥有者" },
  admin: { color: "#a64953", label: "管理员" },
  member: { color: "#787670", label: "成员" },
};

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getTeamDetail()
      .then((data) => setMembers(data.members))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="reveal flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            团队
          </h2>
          <p className="mt-1 text-copy-14 text-neutral-6 dark:text-[var(--neutral-6)]">
            协作之上，是人对人的信任
          </p>
        </div>
        <Button variant="secondary" size="md">
          <UserPlus className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
          邀请成员
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-lg" />
            ))
          : members.map((m, i) => {
              const role = roleStyle[m.role];
              return (
                <div
                  key={m.userId}
                  className={`reveal reveal-${(i % 6) + 1} card hover:bg-neutral-3 dark:hover:bg-[var(--neutral-3)] transition-colors duration-300 ease-breathe`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar user={m.user ?? { name: "?", avatar: "" }} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-title-20 font-medium text-neutral-10 dark:text-[var(--neutral-10)] truncate">
                        {m.user?.name ?? "?"}
                      </h3>
                      <p className="mt-0.5 text-copy-13 text-neutral-6 dark:text-[var(--neutral-6)] font-mono truncate">
                        {m.user?.email ?? ""}
                      </p>
                      <div className="mt-2">
                        <Badge color={role.color} variant="soft">
                          {role.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                    <span>加入于 {formatDate(m.user?.createdAt ?? m.joinedAt)}</span>
                    <span>最近活跃 {relativeTime(Date.now() - (i + 1) * 3_600_000)}</span>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
