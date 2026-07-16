import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Eye, EyeOff, RefreshCw, LogOut, AlertTriangle, ArrowLeft } from "lucide-react";
import { useTitle } from "@/hooks/useTitle";
import { api, tokenStore } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";

export default function Settings() {
  const navigate = useNavigate();
  const { team, setTeam, setCurrentUser } = useAppStore();
  useTitle("设置 · CodeZone");

  const [apiToken, setApiToken] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // 取 JWT 副本用于展示,不改变原 token
    setApiToken(tokenStore.get());
  }, []);

  const copyToken = async () => {
    if (!apiToken) return;
    try {
      await navigator.clipboard.writeText(apiToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = apiToken;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const mask = (t: string) => t ? `${t.slice(0, 6)}••••••••••••${t.slice(-4)}` : "";

  const handleLeaveTeam = async () => {
    if (!team) {
      setError("你未加入任何团队");
      return;
    }
    if (!window.confirm(`确定要离开「${team.name}」吗?此操作不可撤销。`)) return;
    setLeaving(true);
    setError("");
    setSuccess("");
    try {
      await api.leaveTeam();
      setTeam(null, null);
      setSuccess("已离开团队");
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "离开失败");
    } finally {
      setLeaving(false);
    }
  };

  const handleLogout = () => {
    tokenStore.clear();
    setCurrentUser(null);
    setTeam(null, null);
    navigate("/login");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <p className="text-caption-10 uppercase tracking-eyebrow text-[var(--color-accent)] mb-1">
          账户
        </p>
        <h1 className="font-serif text-title-28 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">
          设置
        </h1>
      </header>

      {error && (
        <div className="card p-3 text-copy-13 text-error bg-error/10 ring-error/30">{error}</div>
      )}
      {success && (
        <div className="card p-3 text-copy-13 text-[var(--color-accent)] bg-[var(--color-accent-soft)]">{success}</div>
      )}

      {/* API Token */}
      <section className="card p-5 space-y-3">
        <div>
          <h2 className="text-copy-15 font-medium text-neutral-10 dark:text-[var(--neutral-10)]">API Token</h2>
          <p className="text-caption-10 text-neutral-6 dark:text-[var(--neutral-6)] mt-0.5">
            用于调用 REST API。泄露后请立即在「账号安全」中重置。
          </p>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-md ring-1 ring-border bg-neutral-1 dark:bg-[var(--neutral-1)]">
          <code className="flex-1 font-mono text-copy-13 text-neutral-9 break-all">
            {reveal ? apiToken : mask(apiToken ?? "")}
          </code>
          <button
            onClick={() => setReveal((v) => !v)}
            className="grid place-items-center w-8 h-8 rounded text-neutral-6 hover:text-[var(--color-accent)] hover:bg-neutral-2 transition-colors"
            aria-label={reveal ? "隐藏" : "显示"}
            disabled={!apiToken}
          >
            {reveal ? <EyeOff className="w-icon-sm h-icon-sm" /> : <Eye className="w-icon-sm h-icon-sm" />}
          </button>
          <button
            onClick={copyToken}
            className="grid place-items-center w-8 h-8 rounded text-neutral-6 hover:text-[var(--color-accent)] hover:bg-neutral-2 transition-colors"
            aria-label="复制"
            disabled={!apiToken}
          >
            {copied ? <Check className="w-icon-sm h-icon-sm text-[var(--color-accent)]" /> : <Copy className="w-icon-sm h-icon-sm" />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleLogout}>
            <RefreshCw className="w-icon-sm h-icon-sm" /> 重新登录
          </Button>
          <span className="text-caption-10 text-neutral-5">重新登录后会刷新 Token</span>
        </div>
      </section>

      {/* 离开团队 */}
      {team && (
        <section className="card p-5 space-y-3">
          <div>
            <h2 className="text-copy-15 font-medium text-neutral-10 dark:text-[var(--neutral-10)] flex items-center gap-2">
              <AlertTriangle className="w-icon-sm h-icon-sm text-warn" strokeWidth={1.75} />
              离开团队
            </h2>
            <p className="text-caption-10 text-neutral-6 dark:text-[var(--neutral-6)] mt-0.5">
              你当前属于「{team.name}」。离开后将无法访问该团队的仓库、议题、文档等数据。
            </p>
          </div>
          <Button variant="danger" onClick={handleLeaveTeam} disabled={leaving}>
            <LogOut className="w-icon-sm h-icon-sm" />
            {leaving ? "处理中…" : "离开团队"}
          </Button>
        </section>
      )}

      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-copy-13 text-neutral-6 hover:text-[var(--color-accent)] transition-colors"
      >
        <ArrowLeft className="w-icon-sm h-icon-sm" /> 返回
      </button>
    </div>
  );
}
