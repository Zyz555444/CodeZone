import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RepoLayout } from "@/components/layout/RepoLayout";
import { CommandPalette } from "@/components/CommandPalette";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import ReposList from "@/pages/ReposList";
import CodeBrowser from "@/pages/CodeBrowser";
import Commits from "@/pages/Commits";
import IssuesList from "@/pages/IssuesList";
import IssueBoard from "@/pages/IssueBoard";
import IssueDetail from "@/pages/IssueDetail";
import PullsList from "@/pages/PullsList";
import PullDetail from "@/pages/PullDetail";
import Discussions from "@/pages/Discussions";
import Wiki from "@/pages/Wiki";
import PipelinesList from "@/pages/PipelinesList";
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

export default function App() {
  useWebSocket();
  return (
    <Router>
      <CommandPaletteShortcut />
      <Routes>
        {/* 登录页 (无布局) */}
        <Route path="/login" element={<Login />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* 全局跨仓库视图 */}
          <Route path="/issues" element={<GlobalIssues />} />
          <Route path="/pulls" element={<GlobalPulls />} />
          <Route path="/discussions" element={<Navigate to="/repos" replace />} />
          <Route path="/pipelines" element={<Navigate to="/repos" replace />} />
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
            <Route path="issues/:issueId" element={<IssueDetail />} />
            <Route path="pulls" element={<PullsList />} />
            <Route path="pulls/:prId" element={<PullDetail />} />
            <Route path="discussions" element={<Discussions />} />
            <Route path="wiki" element={<Wiki />} />
            <Route path="pipelines" element={<PipelinesList />} />
          </Route>

          <Route path="/pipelines/:runId" element={<PipelineDetail />} />
          <Route path="/team" element={<Team />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
