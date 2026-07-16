import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RepoLayout } from "@/components/layout/RepoLayout";
import { CommandPalette } from "@/components/CommandPalette";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import About from "@/pages/About";
import Docs from "@/pages/Docs";
import ApiDocs from "@/pages/ApiDocs";
import NotFound from "@/pages/NotFound";
import ReposList from "@/pages/ReposList";
import CodeBrowser from "@/pages/CodeBrowser";
import Commits from "@/pages/Commits";
import IssuesList from "@/pages/IssuesList";
import IssueBoard from "@/pages/IssueBoard";
import IssueDetail from "@/pages/IssueDetail";
import IssueNew from "@/pages/IssueNew";
import PullsList from "@/pages/PullsList";
import PullDetail from "@/pages/PullDetail";
import Discussions from "@/pages/Discussions";
import GlobalDiscussions from "@/pages/GlobalDiscussions";
import Wiki from "@/pages/Wiki";
import PipelinesList from "@/pages/PipelinesList";
import GlobalPipelines from "@/pages/GlobalPipelines";
import PipelineDetail from "@/pages/PipelineDetail";
import Team from "@/pages/Team";
import Settings from "@/pages/Settings";
import GlobalIssues from "@/pages/GlobalIssues";
import GlobalPulls from "@/pages/GlobalPulls";
import Milestones from "@/pages/Milestones";
import Profile from "@/pages/Profile";
import Notifications from "@/pages/Notifications";
import Activity from "@/pages/Activity";
import Collaborate from "@/pages/Collaborate";
import { useAppStore } from "@/store/useAppStore";
import { useWebSocket } from "@/hooks/useWebSocket";

function CommandPaletteShortcut() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 路由切换时关闭
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return <CommandPalette open={open} onClose={() => setOpen(false)} />;
}

// 重定向到当前用户的个人主页
function CurrentProfileRedirect() {
  const { currentUser, initialized } = useAppStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (initialized && currentUser) {
      navigate(`/profile/${currentUser.id}`, { replace: true });
    } else if (initialized && !currentUser) {
      navigate("/login", { replace: true });
    }
  }, [initialized, currentUser, navigate]);
  return null;
}

// 根路径 — 根据登录态显式重定向，确保 URL 实际更新
function RootRedirect() {
  const { currentUser, initialized } = useAppStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (!initialized) return;
    if (currentUser) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [initialized, currentUser, navigate]);
  return null;
}

export default function App() {
  const { initUser } = useAppStore();
  // 顶层初始化一次,确保任何路径(包括 "/")都能拿到 initialized 状态,
  // 避免 RootRedirect 永远返回 null 导致空白页面
  useEffect(() => {
    initUser();
  }, [initUser]);
  useWebSocket();
  return (
    <Router>
      <CommandPaletteShortcut />
      <Routes>
        {/* 公开页 (无布局) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<About />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/api" element={<ApiDocs />} />

        {/* 根路径 — 在 AppLayout 之外判断登录态,确保 URL 实际更新 */}
        <Route path="/" element={<RootRedirect />} />

        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* 全局跨仓库视图 */}
          <Route path="/issues" element={<GlobalIssues />} />
          <Route path="/pulls" element={<GlobalPulls />} />
          <Route path="/discussions" element={<GlobalDiscussions />} />
          <Route path="/pipelines" element={<GlobalPipelines />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/collaborate" element={<Collaborate />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<CurrentProfileRedirect />} />
          <Route path="/profile/:userId" element={<Profile />} />

          {/* 仓库列表 */}
          <Route path="/repos" element={<ReposList />} />

          {/* 仓库详情 (带标签) */}
          <Route path="/repos/:repoId" element={<RepoLayout />}>
            <Route index element={<CodeBrowser />} />
            <Route path="code/*" element={<CodeBrowser />} />
            <Route path="commits" element={<Commits />} />
            <Route path="issues" element={<IssuesList />} />
            <Route path="issues/board" element={<IssueBoard />} />
            <Route path="issues/new" element={<IssueNew />} />
            <Route path="issues/:issueId" element={<IssueDetail />} />
            <Route path="pulls" element={<PullsList />} />
            <Route path="pulls/:prId" element={<PullDetail />} />
            <Route path="discussions" element={<Discussions />} />
            <Route path="wiki" element={<Wiki />} />
            <Route path="pipelines" element={<PipelinesList />} />
          </Route>

          <Route path="/pipelines/:runId" element={<PipelineDetail />} />
          <Route path="/team" element={<Team />} />
          <Route path="/teams" element={<Navigate to="/team" replace />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
