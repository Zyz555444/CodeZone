import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Hash, Sun, Moon, Github, Mail, Lock, User, ArrowRight, AlertCircle, Building2, Key } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";
import { api, tokenStore } from "@/lib/api";
import type { User as UserType, Team, TeamRole } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export default function Login() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { setCurrentUser, setTeam } = useAppStore();
  const [mode, setMode] = useState<"login" | "register" | "register-admin" | "join-invite">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", teamName: "", inviteCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode !== "login" && form.password !== form.confirm) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      let result: { user: UserType; token: string; team?: Team; teamRole?: TeamRole | null };
      if (mode === "login") {
        result = await api.login(form.email, form.password);
      } else if (mode === "register") {
        result = await api.register(form.name, form.email, form.password);
      } else if (mode === "register-admin") {
        result = await api.registerAdmin(form.name, form.email, form.password, form.teamName);
      } else {
        result = await api.joinByInvite(form.name, form.email, form.password, form.inviteCode);
      }
      const { user, token, team, teamRole } = result as { user: UserType; token: string; team?: Team; teamRole?: TeamRole | null };
      tokenStore.set(token);
      setCurrentUser(user);
      if (team) setTeam(team, teamRole);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-neutral-2 dark:bg-[var(--neutral-2)] ring-1 ring-border rounded-md pl-9 pr-3 py-2 text-copy-14 text-neutral-9 dark:text-[var(--neutral-9)] placeholder:text-neutral-5 dark:placeholder:text-[var(--neutral-5)] focus:ring-2 focus:ring-[var(--color-accent)] outline-none transition-shadow duration-300 ease-breathe";

  // OAuth 回调：从 URL 中读取 token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      tokenStore.set(token);
      window.location.href = "/dashboard";
    }
  }, []);

  return (
    <div className="min-h-screen flex bg-paper">
      {/* 主题切换 */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 grid place-items-center w-9 h-9 rounded-md text-neutral-6 dark:text-[var(--neutral-6)] hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] transition-colors duration-300 ease-breathe"
        aria-label="切换主题"
      >
        {isDark ? <Sun className="w-icon-md h-icon-md" strokeWidth={1.75} /> : <Moon className="w-icon-md h-icon-md" strokeWidth={1.75} />}
      </button>

      {/* 左侧品牌区 */}
      <div className="hidden lg:flex flex-col justify-between flex-1 px-16 py-12 bg-neutral-2 dark:bg-[var(--neutral-2)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(var(--color-accent) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <Link to="/dashboard" className="flex items-center gap-2.5 relative reveal">
          <span className="grid place-items-center w-8 h-8 rounded-md bg-[var(--color-accent)] text-white">
            <Hash className="w-4.5 h-4.5" strokeWidth={2.5} />
          </span>
          <span className="font-logo text-title-24 font-medium tracking-tight text-neutral-10 dark:text-[var(--neutral-10)]">
            CodeZone
          </span>
        </Link>

        <div className="relative reveal reveal-2">
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-4">
            留白即专注
          </p>
          <h1 className="font-serif text-display-48 font-medium text-neutral-10 dark:text-[var(--neutral-10)] leading-[1.1] max-w-md">
            留白也是写作的一部分。
          </h1>
          <p className="mt-6 text-copy-16 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed max-w-sm">
            一体化协作开发平台。把代码仓库、议题、评审、文档与流水线收进同一个克制的工作空间。
          </p>
        </div>

        <div className="relative reveal reveal-3 flex items-center gap-6 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
          <span>9 大模块</span>
          <span className="w-1 h-1 rounded-full bg-neutral-4 dark:bg-[var(--neutral-4)]" />
          <span>Yohaku 设计系统</span>
          <span className="w-1 h-1 rounded-full bg-neutral-4 dark:bg-[var(--neutral-4)]" />
          <span>开源 MIT</span>
        </div>
      </div>

      {/* 右侧表单 */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm reveal reveal-2">
          {/* 移动端 logo */}
          <Link to="/dashboard" className="lg:hidden flex items-center gap-2 mb-8">
            <span className="grid place-items-center w-7 h-7 rounded-md bg-[var(--color-accent)] text-white">
              <Hash className="w-4 h-4" strokeWidth={2.5} />
            </span>
            <span className="font-logo text-title-20 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">CodeZone</span>
          </Link>

          {/* tab 切换 */}
          <div className="flex gap-1 p-1 rounded-md bg-neutral-2 dark:bg-[var(--neutral-2)] mb-6">
            {(["login", "register", "register-admin", "join-invite"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-1.5 rounded text-copy-13 font-medium transition-colors duration-300 ease-breathe ${
                  mode === m
                    ? "bg-paper text-neutral-10 dark:text-[var(--neutral-10)] ring-1 ring-border"
                    : "text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-8 dark:hover:text-[var(--neutral-8)]"
                }`}
              >
                {m === "login" ? "登录" : m === "register" ? "注册" : m === "register-admin" ? "创建团队" : "加入团队"}
              </button>
            ))}
          </div>

          <h2 className="font-serif text-title-24 font-medium text-neutral-10 dark:text-[var(--neutral-10)] mb-1">
            {mode === "login" ? "欢迎回来" : mode === "register-admin" ? "创建团队" : mode === "join-invite" ? "加入团队" : "创建账户"}
          </h2>
          <p className="text-copy-13 text-neutral-6 dark:text-[var(--neutral-6)] mb-6">
            {mode === "login" ? "登录以回到你的工作空间" : mode === "register-admin" ? "创建你的团队并开始协作" : mode === "join-invite" ? "使用邀请码加入团队" : "加入团队，开始协作"}
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-md bg-error/10 text-error text-copy-13">
              <AlertCircle className="w-icon-sm h-icon-sm shrink-0 mt-0.5" strokeWidth={1.75} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode !== "login" && (
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
                <input
                  type="text"
                  required
                  placeholder="姓名"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
              </div>
            )}
            {mode === "register-admin" && (
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
                <input
                  type="text"
                  required
                  placeholder="团队名称"
                  value={form.teamName}
                  onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                  className={inputCls}
                />
              </div>
            )}
            {mode === "join-invite" && (
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
                <input
                  type="text"
                  required
                  placeholder="邀请码"
                  value={form.inviteCode}
                  onChange={(e) => setForm({ ...form, inviteCode: e.target.value })}
                  className={inputCls}
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
              <input
                type="email"
                required
                placeholder="邮箱地址"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
              <input
                type="password"
                required
                placeholder="密码"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputCls}
              />
            </div>
            {mode !== "login" && (
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
                <input
                  type="password"
                  required
                  placeholder="确认密码"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  className={inputCls}
                />
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between text-label-12">
                <label className="flex items-center gap-1.5 text-neutral-6 dark:text-[var(--neutral-6)] cursor-pointer">
                  <input type="checkbox" className="accent-[var(--color-accent)] w-3.5 h-3.5" />
                  记住我
                </label>
                <a href="#" className="text-[var(--color-accent)] hover:underline">忘记密码?</a>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? "处理中…" : (mode === "login" ? "登录" : mode === "register-admin" ? "创建团队" : mode === "join-invite" ? "加入团队" : "注册")}
              {!loading && <ArrowRight className="w-icon-sm h-icon-sm" />}
            </Button>
          </form>

          {/* 分隔线 */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)] uppercase tracking-eyebrow">或</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* 第三方登录 */}
          <div className="space-y-2">
            <Button variant="secondary" size="md" className="w-full" onClick={() => window.location.href = "/api/auth/github"}>
              <Github className="w-icon-sm h-icon-sm" />
              使用 GitHub 继续
            </Button>
            <Button variant="secondary" size="md" className="w-full">
              <Mail className="w-icon-sm h-icon-sm" />
              使用 Google 继续
            </Button>
          </div>

          <p className="mt-6 text-center text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
            继续即表示同意 <a href="#" className="text-[var(--color-accent)] hover:underline">服务条款</a> 与 <a href="#" className="text-[var(--color-accent)] hover:underline">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
}
