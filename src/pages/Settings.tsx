import { useState } from "react";
import { User as UserIcon, Palette, Bell, Shield, Plus, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useAppStore } from "@/store/useAppStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

type Section = "profile" | "appearance" | "notifications" | "security";

const navItems: { key: Section; label: string; icon: typeof UserIcon }[] = [
  { key: "profile", label: "个人资料", icon: UserIcon },
  { key: "appearance", label: "外观", icon: Palette },
  { key: "notifications", label: "通知", icon: Bell },
  { key: "security", label: "安全", icon: Shield },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ease-breathe",
        on ? "bg-[var(--color-accent)]" : "bg-neutral-4 dark:bg-[var(--neutral-4)]",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-breathe",
          on ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

const inputClass =
  "mt-1 w-full rounded-md bg-neutral-1 dark:bg-[var(--neutral-1)] ring-1 ring-border px-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] focus:outline-none focus:ring-[var(--color-accent)]";

export default function Settings() {
  const { toggleTheme, isDark } = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  const [section, setSection] = useState<Section>("profile");

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [bio, setBio] = useState("");

  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");

  const [notifications, setNotifications] = useState({
    email: true,
    web: true,
    mention: true,
    review: false,
    issue: true,
  });

  return (
    <div className="space-y-6">
      <div className="reveal">
        <h2 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          设置
        </h2>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-6">
        {/* 左侧导航 */}
        <nav className="reveal reveal-1 flex lg:flex-col gap-1 overflow-x-auto">
          {navItems.map((n) => {
            const Icon = n.icon;
            const active = section === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setSection(n.key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-copy-14 whitespace-nowrap transition-colors duration-300 ease-breathe",
                  active
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium"
                    : "text-neutral-7 dark:text-[var(--neutral-7)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)]",
                )}
              >
                <Icon className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
                {n.label}
              </button>
            );
          })}
        </nav>

        {/* 右侧面板 */}
        <div>
          {section === "profile" && (
            <div className="reveal reveal-2 card space-y-5">
              <h3 className="font-serif text-title-20 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                个人资料
              </h3>
              <div className="flex items-center gap-4">
                <Avatar user={currentUser} size="lg" />
                <Button variant="secondary" size="sm">
                  更换头像
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-label-12 text-neutral-6 dark:text-[var(--neutral-6)]">姓名</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="text-label-12 text-neutral-6 dark:text-[var(--neutral-6)]">邮箱</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-label-12 text-neutral-6 dark:text-[var(--neutral-6)]">简介</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="一句话介绍自己"
                  className={cn(inputClass, "resize-none")}
                />
              </label>
              <div>
                <Button variant="primary" size="md">
                  保存
                </Button>
              </div>
            </div>
          )}

          {section === "appearance" && (
            <div className="reveal reveal-2 card space-y-6">
              <h3 className="font-serif text-title-20 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                外观
              </h3>
              <div>
                <p className="text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] mb-2">主题</p>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    onClick={() => {
                      if (isDark) toggleTheme();
                    }}
                    className={cn(
                      "rounded-lg p-4 ring-1 transition-colors duration-300 ease-breathe text-left",
                      !isDark
                        ? "ring-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "ring-border bg-neutral-2 dark:bg-[var(--neutral-2)]",
                    )}
                  >
                    <div className="h-10 rounded-md bg-neutral-1 ring-1 ring-border mb-2" />
                    <span className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                      浅色
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (!isDark) toggleTheme();
                    }}
                    className={cn(
                      "rounded-lg p-4 ring-1 transition-colors duration-300 ease-breathe text-left",
                      isDark
                        ? "ring-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "ring-border bg-neutral-2 dark:bg-[var(--neutral-2)]",
                    )}
                  >
                    <div className="h-10 rounded-md bg-[var(--neutral-3)] mb-2" />
                    <span className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                      深色
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <p className="text-label-12 text-neutral-6 dark:text-[var(--neutral-6)] mb-2">字号</p>
                <div className="flex items-center gap-4">
                  {[
                    { key: "sm", label: "小" },
                    { key: "md", label: "中" },
                    { key: "lg", label: "大" },
                  ].map((o) => (
                    <label key={o.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="fontsize"
                        checked={fontSize === o.key}
                        onChange={() => setFontSize(o.key as typeof fontSize)}
                        className="accent-[var(--color-accent)]"
                      />
                      <span className="text-copy-14 text-neutral-8 dark:text-[var(--neutral-8)]">
                        {o.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === "notifications" && (
            <div className="reveal reveal-2 card space-y-1">
              <h3 className="font-serif text-title-20 font-medium text-neutral-10 dark:text-[var(--neutral-10)] mb-4">
                通知
              </h3>
              {[
                { key: "email" as const, label: "邮件通知", desc: "重要事件通过邮件送达" },
                { key: "web" as const, label: "网页通知", desc: "站内即时提示" },
                { key: "mention" as const, label: "提及通知", desc: "被 @ 时通知" },
                { key: "review" as const, label: "PR 评审", desc: "被请求评审时通知" },
                { key: "issue" as const, label: "议题更新", desc: "关注的议题有新动态" },
              ].map((n) => (
                <div
                  key={n.key}
                  className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                      {n.label}
                    </p>
                    <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">{n.desc}</p>
                  </div>
                  <Toggle
                    on={notifications[n.key]}
                    onChange={(v) => setNotifications((prev) => ({ ...prev, [n.key]: v }))}
                  />
                </div>
              ))}
            </div>
          )}

          {section === "security" && (
            <div className="reveal reveal-2 space-y-4">
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-title-20 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                    SSH 密钥
                  </h3>
                  <Button variant="secondary" size="sm">
                    <Plus className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
                    添加
                  </Button>
                </div>
                <ul className="space-y-2">
                  {[
                    { name: "MacBook Pro", fp: "SHA256:9k7g...x2Qa", added: "2025-03-12" },
                    { name: "工作站", fp: "SHA256:m3dp...8nLc", added: "2025-01-08" },
                  ].map((k) => (
                    <li
                      key={k.fp}
                      className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 ring-1 ring-border bg-neutral-1 dark:bg-[var(--neutral-1)]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Key
                          className="w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)] shrink-0"
                          strokeWidth={1.75}
                        />
                        <div className="min-w-0">
                          <p className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)] truncate">
                            {k.name}
                          </p>
                          <p className="text-label-12 font-mono text-neutral-5 dark:text-[var(--neutral-5)] truncate">
                            {k.fp}
                          </p>
                        </div>
                      </div>
                      <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] shrink-0">
                        {k.added}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-title-20 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
                    访问令牌
                  </h3>
                  <Button variant="secondary" size="sm">
                    <Plus className="w-icon-sm h-icon-sm" strokeWidth={1.75} />
                    添加
                  </Button>
                </div>
                <ul className="space-y-2">
                  {[
                    { name: "CLI", scope: "repo, read", added: "2025-06-01" },
                    { name: "CI 部署", scope: "deploy", added: "2025-04-22" },
                  ].map((t) => (
                    <li
                      key={t.name}
                      className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 ring-1 ring-border bg-neutral-1 dark:bg-[var(--neutral-1)]"
                    >
                      <div className="min-w-0">
                        <p className="text-copy-14 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">
                          {t.name}
                        </p>
                        <p className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
                          范围: {t.scope}
                        </p>
                      </div>
                      <span className="text-label-12 text-neutral-5 dark:text-[var(--neutral-5)] shrink-0">
                        {t.added}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
