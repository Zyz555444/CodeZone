'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2, Check, AlertCircle, Settings, ArrowLeft } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';
import { useAuthStore } from '@/stores/authStore';
import { getAISettings, updateAISettings, validateAISettings } from '@/lib/ai';

export default function AISettingsPage() {
  const teams = useAuthStore((s) => s.teams);
  const teamId = teams[0]?.id || '';

  const [provider, setProvider] = useState('OPENAI');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [enabledModels, setEnabledModels] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (teamId) loadSettings();
  }, [teamId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getAISettings(teamId);
      if (data.settings) {
        setProvider(data.settings.provider || 'OPENAI');
        setEndpoint(data.settings.endpoint || '');
        setDefaultModel(data.settings.defaultModel || '');
        setEnabledModels((data.settings.enabledModels || []).join(', '));
        setIsEnabled(data.settings.isEnabled ?? true);
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateAISettings(teamId, {
        provider,
        endpoint: endpoint || undefined,
        apiKey: apiKey || undefined,
        defaultModel: defaultModel || undefined,
        enabledModels: enabledModels
          ? enabledModels.split(',').map((m) => m.trim()).filter(Boolean)
          : [],
        parameters: {},
        isEnabled,
      });
      setApiKey('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey && !defaultModel) {
      setTestResult('error');
      setTestMessage('请先填写 API Key 和默认模型');
      return;
    }
    setTesting(true);
    setTestResult('idle');
    try {
      const result = await validateAISettings(teamId, {
        provider,
        endpoint: endpoint || undefined,
        apiKey: apiKey,
        defaultModel: defaultModel,
      });
      if (result.valid) {
        setTestResult('success');
        setTestMessage('连接测试成功');
      } else {
        setTestResult('error');
        setTestMessage(result.error || '连接失败');
      }
    } catch {
      setTestResult('error');
      setTestMessage('测试请求失败');
    } finally {
      setTesting(false);
    }
  };

  if (!teamId) {
    return (
      <div className="min-h-screen bg-neutral-1">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <Card>
              <CardContent className="py-12 text-center">
                <Settings className="h-8 w-8 mx-auto mb-3 text-neutral-6" />
                <p className="text-neutral-8 font-medium">需要先创建或加入团队</p>
                <p className="text-copy-13 text-neutral-6 mt-1">AI 设置与团队关联，请先设置团队</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-1">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <a href="/settings" className="p-1.5 rounded-lg hover:bg-neutral-2 text-neutral-6">
              <ArrowLeft className="h-4 w-4" />
            </a>
            <div>
              <h1 className="text-title-20 font-semibold text-neutral-10">AI 设置</h1>
              <p className="text-copy-13 text-neutral-6 mt-0.5">管理团队 AI 模型供应商和配置</p>
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-6 w-6 mx-auto animate-spin text-accent" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI 供应商</CardTitle>
                  <CardDescription>选择 AI 模型供应商类型</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-copy-13 font-medium text-neutral-8 mb-1.5 block">供应商</label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full bg-neutral-2 border border-neutral-3 rounded-lg px-3 py-2 text-copy-13 text-neutral-9 focus:outline-none focus:border-accent/50"
                    >
                      <option value="OPENAI">OpenAI 兼容</option>
                      <option value="ANTHROPIC">Anthropic</option>
                      <option value="CUSTOM">自定义 (OpenAI 兼容)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-copy-13 font-medium text-neutral-8 mb-1.5 block">API 端点 (可选)</label>
                    <Input
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder={provider === 'ANTHROPIC' ? 'https://api.anthropic.com' : 'https://api.openai.com'}
                    />
                  </div>

                  <div>
                    <label className="text-copy-13 font-medium text-neutral-8 mb-1.5 block">API Key</label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="输入新的 API Key (留空则不修改)"
                    />
                    <p className="text-label-12 text-neutral-6 mt-1">密钥将加密存储，保存后无法查看原文</p>
                  </div>

                  <div>
                    <label className="text-copy-13 font-medium text-neutral-8 mb-1.5 block">默认模型</label>
                    <Input
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      placeholder="如 monkeycode-basic/glm-4.7"
                    />
                  </div>

                  <div>
                    <label className="text-copy-13 font-medium text-neutral-8 mb-1.5 block">启用模型列表</label>
                    <Input
                      value={enabledModels}
                      onChange={(e) => setEnabledModels(e.target.value)}
                      placeholder="模型 ID，英文逗号分隔"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-copy-13 font-medium text-neutral-8">启用 AI 功能</label>
                    <button
                      onClick={() => setIsEnabled(!isEnabled)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        isEnabled ? 'bg-accent' : 'bg-neutral-4'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-copy-13 text-red-600">
                  <AlertCircle className="h-4 w-4 inline mr-1.5" />
                  {error}
                </div>
              )}

              {saved && (
                <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-copy-13 text-emerald-600">
                  <Check className="h-4 w-4 inline mr-1.5" />
                  设置已保存
                </div>
              )}

              {testResult !== 'idle' && (
                <div className={`px-4 py-3 rounded-lg text-copy-13 ${
                  testResult === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  {testResult === 'success' ? <Check className="h-4 w-4 inline mr-1.5" /> : <AlertCircle className="h-4 w-4 inline mr-1.5" />}
                  {testMessage}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  保存设置
                </Button>
                <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-2">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  测试连接
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
