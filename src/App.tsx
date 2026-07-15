import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RepoLayout } from "@/components/layout/RepoLayout";
import Dashboard from "@/pages/Dashboard";
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

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* 全局跨仓库视图 */}
          <Route path="/issues" element={<GlobalIssues />} />
          <Route path="/pulls" element={<GlobalPulls />} />
          <Route path="/discussions" element={<Discussions repoId="r1" />} />
          <Route path="/pipelines" element={<PipelinesList repoId="r1" />} />

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
