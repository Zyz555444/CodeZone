import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Hash, Sun, Moon, Github, Mail, Lock, User, ArrowRight, AlertCircle,
  Building2, Key, ChevronDown, Eye, EyeOff, GitBranch, GitPullRequest, MessageSquare, BookOpen, Workflow, Flag, Users, Boxes,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";
import { api, tokenStore } from "@/lib/api";
import type { User as UserType, Team, TeamRole } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const modules = [
  { name: "代码仓库", href: "/repos", Icon: GitBranch },
  { name: "议题跟踪", href: "/issues", Icon: Boxes },
  { name: "合并请求", href: "/pulls", Icon: GitPullRequest },
  { name: "代码评审", href: "/pulls", Icon: MessageSquare },
  { name: "讨论区", href: "/discussions", Icon: MessageSquare },
  { name: "Wiki 文档", href: "/docs", Icon: BookOpen },
  { name: "流水线", href: "/pipelines", Icon: Workflow },
  { name: "里程碑", href: "/milestones", Icon: Flag },
  { name: "团队协作", href: "/team", Icon: Users },
];

export default function Login() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { setCurrentUser, setTeam, team } = useAppStore();
  const [mode, setMode] = useState<"login" | "register" | "register-admin" | "join-invite">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", teamName: "", inviteCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modulesOpen, setModulesOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [providers, setProviders] = useState<{ github: boolean; google: boolean } | null>(null);

  // 查询第三方登录可用性,未配置时按钮置灰
  useEffect(() => {
    api.getAuthProviders().then(setProviders).catch(() => setProviders({ github: false, google: false }));
  }, []);

  // 若当前用户已加入团队，限制重复加入/创建
  const hasTeam = !!team;

  const handleInvalid = (e: React.FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    let msg = "请填写此项";
    if (el.validity.typeMismatch) {
      if (el.type === "email") msg = "请输入有效的邮箱地址(含 @)";
    } else if (el.validity.tooShort) {
      msg = `至少输入 ${el.minLength} 个字符`;
    } else if (el.validity.valueMissing) {
      const label = el.getAttribute("aria-label") || el.placeholder || "此项";
      msg = `请填写「${label}」`;
    }
    el.setCustomValidity(msg);
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.setCustomValidity("");
  };

  const handleModeChange = (m: typeof mode) => {
    if ((m === "register-admin" || m === "join-invite") && hasTeam) {
      setError("你已属于一个团队，请先在设置中离开当前团队后再加入或创建新团队。");
      return;
    }
    setMode(m);
    setError("");
  };

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
            <Hash className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <span className="font-logo text-title-24 font-medium tracking-tight text-neutral-10 dark:text-[var(--neutral-10)]">
            CodeZone
          </span>
        </Link>

        <div className="relative reveal reveal-2">
          <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-4">
            专注即效率
          </p>
          <h1 className="font-serif text-display-48 font-medium text-neutral-10 dark:text-[var(--neutral-10)] leading-[1.1] max-w-md">
            把协作收进一个简洁的工作空间。
          </h1>
          <p className="mt-6 text-copy-16 text-neutral-6 dark:text-[var(--neutral-6)] leading-relaxed max-w-sm">
            一体化协作开发平台。代码仓库、议题、评审、文档与流水线，在同一个上下文里高效推进。
          </p>
        </div>

        <div className="relative reveal reveal-3 flex items-center gap-6 text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
          <button
            type="button"
            onClick={() => setModulesOpen((v) => !v)}
            className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors"
            aria-expanded={modulesOpen}
          >
            九大核心模块
            <ChevronDown className={`w-3 h-3 transition-transform ${modulesOpen ? "rotate-180" : ""}`} strokeWidth={2} />
          </button>
          {modulesOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-72 p-3 rounded-lg bg-paper dark:bg-[var(--neutral-1)] ring-1 ring-border shadow-lg">
              <ul className="grid grid-cols-1 gap-1 text-label-12 text-neutral-7 dark:text-[var(--neutral-7)]">
                {modules.map(({ name, href, Icon }) => (
                  <li key={name}>
                    <Link
                      to={href}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-2 dark:hover:bg-[var(--neutral-2)] hover:text-[var(--color-accent)] transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>{name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <span className="w-1 h-1 rounded-full bg-neutral-4 dark:bg-[var(--neutral-4)]" />
          <span>Yohaku 设计系统</span>
          <span className="w-1 h-1 rounded-full bg-neutral-4 dark:bg-[var(--neutral-4)]" />
          <span>MIT 开源协议</span>
        </div>
      </div>

      {/* 右侧表单 */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* 右侧装饰点阵 */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(var(--color-accent) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            backgroundPosition: "right top",
          }}
        />
        <div className="w-full max-w-md relative">
          <div className="w-full max-w-sm mx-auto reveal reveal-2">
          {/* 移动端 logo */}
          <Link to="/dashboard" className="lg:hidden flex items-center gap-2 mb-8">
            <span className="grid place-items-center w-7 h-7 rounded-md bg-[var(--color-accent)] text-white">
              <Hash className="w-4 h-4" strokeWidth={2.5} />
            </span>
            <span className="font-logo text-title-20 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">CodeZone</span>
          </Link>

          {/* tab 切换 */}
          <nav className="flex gap-1 p-1 rounded-md bg-neutral-2 dark:bg-[var(--neutral-2)] mb-6" aria-label="登录注册模式">
            {(["login", "register", "register-admin", "join-invite"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`flex-1 py-1.5 rounded text-copy-13 font-medium transition-colors duration-300 ease-breathe ${
                  mode === m
                    ? "bg-paper text-neutral-10 dark:text-[var(--neutral-10)] ring-1 ring-border"
                    : "text-neutral-6 dark:text-[var(--neutral-6)] hover:text-neutral-8 dark:hover:text-[var(--neutral-8)]"
                }`}
                aria-pressed={mode === m}
              >
                {m === "login" ? "登录" : m === "register" ? "注册" : m === "register-admin" ? "创建团队" : "加入团队"}
              </button>
            ))}
          </nav>

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

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            {mode !== "login" && (
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
                <label htmlFor="name" className="sr-only">姓名</label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="姓名"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onInvalid={handleInvalid}
                  onInput={handleInput}
                  className={inputCls}
                  aria-label="姓名"
                />
              </div>
            )}
            {mode === "register-admin" && (
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
                <label htmlFor="teamName" className="sr-only">团队名称</label>
                <input
                  id="teamName"
                  type="text"
                  required
                  placeholder="团队名称"
                  value={form.teamName}
                  onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                  onInvalid={handleInvalid}
                  onInput={handleInput}
                  className={inputCls}
                  aria-label="团队名称"
                />
              </div>
            )}
            {mode === "join-invite" && (
              <div className="space-y-1">
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
                  <label htmlFor="inviteCode" className="sr-only">邀请码</label>
                  <input
                    id="inviteCode"
                    type="text"
                    required
                    pattern="[A-Za-z0-9]{6,32}"
                    title="邀请码为 6~32 位字母或数字，可在团队设置中生成"
                    placeholder="邀请码（6~32 位字母或数字）"
                    value={form.inviteCode}
                    onChange={(e) => setForm({ ...form, inviteCode: e.target.value })}
                    onInvalid={handleInvalid}
                    onInput={handleInput}
                    className={inputCls}
                    aria-label="邀请码"
                  />
                </div>
                <p className="pl-1 text-caption-10 text-neutral-5 dark:text-[var(--neutral-5)]">
                  邀请码由团队管理员在「设置 → 邀请成员」中生成，通常为 6~32 位字母与数字组合。
                </p>
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
              <label htmlFor="email" className="sr-only">邮箱地址</label>
              <input
                id="email"
                type="email"
                required
                placeholder="邮箱地址"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onInvalid={handleInvalid}
                onInput={handleInput}
                className={inputCls}
                aria-label="邮箱地址"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
              <label htmlFor="password" className="sr-only">密码</label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="密码（至少 8 位）"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onInvalid={handleInvalid}
                onInput={handleInput}
                className={`${inputCls} pr-9`}
                aria-label="密码"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1.5 grid place-items-center w-7 h-7 rounded text-neutral-5 hover:text-[var(--color-accent)] transition-colors"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-icon-sm h-icon-sm" strokeWidth={1.75} /> : <Eye className="w-icon-sm h-icon-sm" strokeWidth={1.75} />}
              </button>
            </div>
            {mode !== "login" && (
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-icon-sm h-icon-sm text-neutral-5 dark:text-[var(--neutral-5)]" strokeWidth={1.75} />
                <label htmlFor="confirm" className="sr-only">确认密码</label>
                <input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="再次输入密码"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  onInvalid={handleInvalid}
                  onInput={handleInput}
                  className={inputCls}
                  aria-label="确认密码"
                />
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between text-label-12">
                <label className="flex items-center gap-1.5 text-neutral-6 dark:text-[var(--neutral-6)] cursor-pointer">
                  <input type="checkbox" className="accent-[var(--color-accent)] w-3.5 h-3.5" />
                  记住我
                </label>
                <Link to="/forgot-password" className="text-[var(--color-accent)] hover:underline">忘记密码?</Link>
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
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => api.githubLogin()}
              disabled={!providers?.github}
              title={providers?.github ? "" : "未配置 GitHub OAuth"}
            >
              <Github className="w-icon-sm h-icon-sm" />
              {providers?.github ? "使用 GitHub 继续" : "GitHub 登录未配置"}
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => api.googleLogin()}
              disabled={!providers?.google}
              title={providers?.google ? "" : "未配置 Google OAuth"}
            >
              <Mail className="w-icon-sm h-icon-sm" />
              {providers?.google ? "使用 Google 继续" : "Google 登录未配置"}
            </Button>
          </div>

          <p className="mt-6 text-center text-label-12 text-neutral-5 dark:text-[var(--neutral-5)]">
            继续即表示同意 <Link to="/terms" className="text-[var(--color-accent)] hover:underline">服务条款</Link> 与 <Link to="/privacy" className="text-[var(--color-accent)] hover:underline">隐私政策</Link>
          </p>
          </div>

          {/* 右侧底部亮点 — 填补宽屏下的视觉空白 */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 reveal reveal-3">
            {[
              { Icon: GitBranch, title: "代码托管", desc: "分支、评审、合并请求一气呵成" },
              { Icon: MessageSquare, title: "异步讨论", desc: "议题、评论、@提醒围绕上下文展开" },
              { Icon: Workflow, title: "可观测流水线", desc: "构建、测试、部署全链路可追踪" },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="p-3.5 rounded-md ring-1 ring-border bg-neutral-1 dark:bg-[var(--neutral-2)] hover:ring-[var(--color-accent)] transition-shadow"
              >
                <Icon className="w-icon-sm h-icon-sm text-[var(--color-accent)] mb-2" strokeWidth={1.75} />
                <div className="text-copy-13 font-medium text-neutral-9 dark:text-[var(--neutral-9)]">{title}</div>
                <div className="text-caption-10 text-neutral-6 dark:text-[var(--neutral-6)] mt-0.5">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
