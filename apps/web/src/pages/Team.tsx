import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Shield, Crown, User as UserIcon, Copy, Check, X, Trash2, Settings as SettingsIcon, Users } from "lucide-react";
import { useTitle } from "@/hooks/useTitle";
import { api } from "@/lib/api";
import type { Team, TeamMember, TeamRole, InviteCode } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { relativeTime } from "@/lib/format";

const ROLE_META: Record<TeamRole, { label: string; Icon: typeof Crown; tone: string }> = {
  owner: { label: "所有者", Icon: Crown, tone: "text-[var(--color-accent)]" },
  admin: { label: "管理员", Icon: Shield, tone: "text-neutral-9" },
  member: { label: "成员", Icon: UserIcon, tone: "text-neutral-6" },
};

interface InviteDialogState {
  open: boolean;
  maxUses: number;
  expiresInDays: number;
  loading: boolean;
  result: InviteCode | null;
  copied: boolean;
  error: string;
}

const initialInviteState: InviteDialogState = {
  open: false,
  maxUses: 10,
  expiresInDays: 7,
  loading: false,
  result: null,
  copied: false,
  error: "",
};

export default function Team() {
  const navigate = useNavigate();
  const { currentUser, team, setTeam } = useAppStore();
  useTitle("团队 · CodeZone");
  const [detail, setDetail] = useState<{ team: Team; members: TeamMember[]; myRole: TeamRole } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<InviteDialogState>(initialInviteState);

  const loadTeam = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getTeamDetail();
      setDetail(data);
      setTeam(data.team, data.myRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载团队信息失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (team?.id) {
      loadTeam();
    } else {
      setLoading(false);
    }
  }, [team?.id]);

  const canManage = detail?.myRole === "owner" || detail?.myRole === "admin";

  const openInviteDialog = () => {
    setInvite({ ...initialInviteState, open: true });
  };

  const closeInviteDialog = () => {
    setInvite(initialInviteState);
  };

  const submitInvite = async () => {
    setInvite((s) => ({ ...s, loading: true, error: "" }));
    try {
      const code = await api.createInviteCode(invite.maxUses, invite.expiresInDays);
      setInvite((s) => ({ ...s, loading: false, result: code }));
    } catch (err) {
      setInvite((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : "生成失败" }));
    }
  };

  const copyCode = async () => {
    if (!invite.result) return;
    try {
      await navigator.clipboard.writeText(invite.result.code);
      setInvite((s) => ({ ...s, copied: true }));
      setTimeout(() => setInvite((s) => ({ ...s, copied: false })), 1500);
    } catch {
      // 降级方案
      const ta = document.createElement("textarea");
      ta.value = invite.result.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setInvite((s) => ({ ...s, copied: true }));
      setTimeout(() => setInvite((s) => ({ ...s, copied: false })), 1500);
    }
  };

  const updateRole = async (userId: string, role: TeamRole) => {
    if (!canManage) return;
    try {
      await api.updateMemberRole(userId, role);
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新角色失败");
    }
  };

  const removeMember = async (userId: string) => {
    if (!canManage) return;
    if (userId === currentUser?.id) {
      setError("不能移除自己,请使用「离开团队」");
      return;
    }
    if (!window.confirm("确定要移除该成员吗?")) return;
    try {
      await api.removeMember(userId);
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "移除失败");
    }
  };

  if (!team) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="card p-8 text-center space-y-3">
          <Users className="w-icon-lg h-icon-lg mx-auto text-[var(--color-accent)]" />
          <h2 className="font-serif text-title-20 text-neutral-10 dark:text-[var(--neutral-10)]">尚未加入团队</h2>
          <p className="text-copy-13 text-neutral-6 dark:text-[var(--neutral-6)]">
            创建或加入一个团队,开始与协作者一起工作。
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="primary" onClick={() => navigate("/settings")}>前往设置</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-copy-13 text-neutral-5">加载中…</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-1">
            团队
          </p>
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
            {detail?.team.name ?? team.name}
          </h1>
          <p className="text-copy-13 text-neutral-6 dark:text-[var(--neutral-6)] mt-1">
            {detail?.members.length ?? 0} 位成员 · 你的角色:{detail ? ROLE_META[detail.myRole].label : "成员"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate("/settings")}>
            <SettingsIcon className="w-icon-sm h-icon-sm" /> 设置
          </Button>
          <Button variant="primary" onClick={openInviteDialog} disabled={!canManage}>
            <Plus className="w-icon-sm h-icon-sm" /> 邀请成员
          </Button>
        </div>
      </header>

      {error && (
        <div className="card p-3 text-copy-13 text-error bg-error/10 ring-error/30">{error}</div>
      )}

      <section className="card divide-y divide-border">
        {detail?.members.map((m) => {
          const meta = ROLE_META[m.role];
          return (
            <div key={m.userId} className="flex items-center gap-3 p-3.5">
              <Avatar user={{ id: m.userId, name: m.name, email: m.email }} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-copy-14 font-medium text-neutral-10 dark:text-[var(--neutral-10)] truncate">
                    {m.name}
                  </span>
                  {m.userId === currentUser?.id && (
                    <span className="text-caption-10 text-neutral-5">（你）</span>
                  )}
                </div>
                <div className="text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] truncate">{m.email}</div>
              </div>
              <div className={`flex items-center gap-1 text-label-12 ${meta.tone}`}>
                <meta.Icon className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
                {meta.label}
              </div>
              <div className="hidden sm:block w-28 text-right text-caption-10 text-neutral-5">
                {m.joinedAt ? `加入于 ${relativeTime(m.joinedAt)}` : ""}
              </div>
              {canManage && m.userId !== currentUser?.id && (
                <div className="flex items-center gap-1">
                  <select
                    value={m.role}
                    onChange={(e) => updateRole(m.userId, e.target.value as TeamRole)}
                    className="bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded text-caption-10 px-1.5 py-1 text-neutral-8 hover:ring-[var(--color-accent)] focus:outline-none"
                    aria-label="调整角色"
                  >
                    <option value="member">成员</option>
                    <option value="admin">管理员</option>
                    <option value="owner">所有者</option>
                  </select>
                  <button
                    onClick={() => removeMember(m.userId)}
                    className="grid place-items-center w-7 h-7 rounded text-neutral-5 hover:text-error hover:bg-error/10 transition-colors"
                    aria-label="移除成员"
                  >
                    <Trash2 className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* 邀请码生成弹窗 */}
      {invite.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4" onClick={closeInviteDialog}>
          <div
            className="w-full max-w-md card p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-title"
          >
            <div className="flex items-center justify-between">
              <h2 id="invite-title" className="font-serif text-title-20 text-neutral-10">生成邀请码</h2>
              <button onClick={closeInviteDialog} className="grid place-items-center w-7 h-7 rounded text-neutral-5 hover:bg-neutral-2" aria-label="关闭">
                <X className="w-icon-sm h-icon-sm" />
              </button>
            </div>

            {!invite.result ? (
              <>
                <div className="space-y-3">
                  <label className="block text-copy-13 text-neutral-7">
                    最多使用次数
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={invite.maxUses}
                      onChange={(e) => setInvite((s) => ({ ...s, maxUses: parseInt(e.target.value, 10) || 1 }))}
                      className="mt-1 w-full bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded-md px-3 py-1.5 text-copy-13 focus:ring-[var(--color-accent)] focus:outline-none"
                    />
                    <span className="block mt-1 text-caption-10 text-neutral-5">0 表示不限制次数</span>
                  </label>
                  <label className="block text-copy-13 text-neutral-7">
                    有效期(天)
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={invite.expiresInDays}
                      onChange={(e) => setInvite((s) => ({ ...s, expiresInDays: parseInt(e.target.value, 10) || 1 }))}
                      className="mt-1 w-full bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border rounded-md px-3 py-1.5 text-copy-13 focus:ring-[var(--color-accent)] focus:outline-none"
                    />
                  </label>
                </div>
                {invite.error && <div className="text-copy-13 text-error">{invite.error}</div>}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={closeInviteDialog}>取消</Button>
                  <Button variant="primary" onClick={submitInvite} disabled={invite.loading}>
                    {invite.loading ? "生成中…" : "生成"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-copy-13 text-neutral-6">把这个邀请码发给同事,他们可以在登录页选择「加入团队」并粘贴。</p>
                <div className="flex items-center gap-2 p-3 rounded-md bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border">
                  <code className="flex-1 font-mono text-copy-14 text-neutral-9 break-all">{invite.result.code}</code>
                  <button
                    onClick={copyCode}
                    className="grid place-items-center w-8 h-8 rounded text-neutral-6 hover:text-[var(--color-accent)] hover:bg-neutral-2 transition-colors"
                    aria-label="复制邀请码"
                  >
                    {invite.copied ? <Check className="w-icon-sm h-icon-sm text-[var(--color-accent)]" /> : <Copy className="w-icon-sm h-icon-sm" />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" onClick={closeInviteDialog}>完成</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
