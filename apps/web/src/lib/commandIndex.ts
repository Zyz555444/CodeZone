// CodeZone · 命令面板数据源
// 统一索引: 页面、仓库、议题、PR、团队成员
import { api } from "@/lib/api";
import type { Repo, User } from "@/lib/types";

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  group: "导航" | "仓库" | "议题" | "合并请求" | "团队" | "操作";
  icon: string; // lucide 图标名
  keywords: string;
  href?: string;
  action?: string;
}

const navItems: CommandItem[] = [
  { id: "nav-dash", title: "工作台", group: "导航", icon: "LayoutDashboard", keywords: "dashboard 首页", href: "/dashboard" },
  { id: "nav-repos", title: "仓库", group: "导航", icon: "BookMarked", keywords: "repos 仓库", href: "/repos" },
  { id: "nav-issues", title: "全部议题", group: "导航", icon: "CircleDot", keywords: "issues 议题", href: "/issues" },
  { id: "nav-pulls", title: "全部合并请求", group: "导航", icon: "GitPullRequest", keywords: "pulls pr", href: "/pulls" },
  { id: "nav-discussions", title: "讨论", group: "导航", icon: "MessagesSquare", keywords: "discussions 讨论", href: "/discussions" },
  { id: "nav-pipelines", title: "流水线", group: "导航", icon: "Workflow", keywords: "pipelines ci", href: "/pipelines" },
  { id: "nav-team", title: "团队", group: "导航", icon: "Users", keywords: "team 团队 成员", href: "/team" },
  { id: "nav-settings", title: "设置", group: "导航", icon: "Settings", keywords: "settings 设置", href: "/settings" },
  { id: "nav-login", title: "登录 / 注册", group: "导航", icon: "LogIn", keywords: "login 登录 register 注册", href: "/login" },
  { id: "nav-milestones", title: "里程碑与路线图", group: "导航", icon: "Map", keywords: "milestone roadmap 路线图", href: "/milestones" },
  { id: "nav-profile", title: "个人主页", group: "导航", icon: "User", keywords: "profile 个人主页", href: "/profile" },
  { id: "nav-collaborate", title: "协作编辑器", group: "导航", icon: "Radio", keywords: "collaborate 协作 编辑器 monaco", href: "/collaborate" },
  { id: "nav-notifications", title: "通知中心", group: "导航", icon: "Bell", keywords: "notifications 通知", href: "/notifications" },
];

const actionItems: CommandItem[] = [
  { id: "act-theme", title: "切换深色 / 浅色主题", group: "操作", icon: "Moon", keywords: "theme 主题 dark light", action: "toggle-theme" },
  { id: "act-new-issue", title: "新建议题", group: "操作", icon: "Plus", keywords: "new issue 新建", action: "new-issue" },
  { id: "act-new-pr", title: "新建合并请求", group: "操作", icon: "GitPullRequest", keywords: "new pr", action: "new-pr" },
];

let cache: { repos: Repo[]; users: User[]; ts: number } | null = null;

async function loadIndex(): Promise<{ repos: Repo[]; users: User[] }> {
  const now = Date.now();
  if (cache && now - cache.ts < 60_000) return { repos: cache.repos, users: cache.users };
  const [repos, users] = await Promise.all([api.getRepos(), api.getTeam()]);
  cache = { repos, users, ts: now };
  return { repos, users };
}

export async function searchCommands(query: string): Promise<CommandItem[]> {
  const q = query.trim().toLowerCase();
  const { repos, users } = await loadIndex();

  const repoItems: CommandItem[] = repos.map((r) => ({
    id: `repo-${r.id}`,
    title: r.name,
    subtitle: r.description,
    group: "仓库",
    icon: "BookMarked",
    keywords: `${r.name} ${r.language} ${r.description}`,
    href: `/repos/${r.id}`,
  }));

  const userItems: CommandItem[] = users.map((u) => ({
    id: `user-${u.id}`,
    title: u.name,
    subtitle: u.email,
    group: "团队",
    icon: "User",
    keywords: `${u.name} ${u.email} ${u.role}`,
    href: `/profile/${u.id}`,
  }));

  const all = [...navItems, ...actionItems, ...repoItems, ...userItems];

  if (!q) return all;
  return all.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q) ||
      item.subtitle?.toLowerCase().includes(q),
  );
}
