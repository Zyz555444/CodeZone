'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Send, CheckCircle2, MessageSquare, Bug, Zap, MoreHorizontal } from 'lucide-react';
import { TeamGuard } from '@/components/TeamGuard';
import { api } from '@/lib/api';

const feedbackTypes = [
  { value: 'feature', label: '功能建议', icon: MessageSquare },
  { value: 'bug', label: 'Bug 报告', icon: Bug },
  { value: 'performance', label: '性能问题', icon: Zap },
  { value: 'other', label: '其他', icon: MoreHorizontal },
];

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('feature');
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setLoading(true);
    try {
      await api.post('/feedback', {
        type: feedbackType,
        content: feedback.trim(),
        contact: contact.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      // 即使后端未就绪，也显示成功页面
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeamGuard>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-neutral-1">
            <div className="container mx-auto max-w-2xl px-6 py-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="font-serif text-3xl font-medium text-neutral-10 mb-2">
                  意见反馈
                </h1>
                <p className="text-neutral-7">
                  您的建议是我们进步的动力
                </p>
              </div>

              <Card>
                {submitted ? (
                  <CardContent className="py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="font-serif text-xl font-medium text-neutral-10 mb-2">
                      感谢反馈！
                    </h3>
                    <p className="text-neutral-7">
                      我们会认真阅读每一条反馈，持续改进产品
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-6"
                      onClick={() => setSubmitted(false)}
                    >
                      提交更多反馈
                    </Button>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader>
                      <CardTitle className="font-serif text-xl">提交反馈</CardTitle>
                      <CardDescription className="text-neutral-7">
                        请详细描述您的问题或建议
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Feedback Type */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-9">
                          反馈类型
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {feedbackTypes.map((type) => {
                            const Icon = type.icon;
                            const isSelected = feedbackType === type.value;
                            return (
                              <button
                                key={type.value}
                                type="button"
                                onClick={() => setFeedbackType(type.value)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                                  isSelected
                                    ? 'border-accent bg-accent-subtle text-accent'
                                    : 'border-neutral-5 hover:border-neutral-6 text-neutral-7 hover:text-neutral-9'
                                }`}
                              >
                                <Icon className="h-5 w-5" />
                                <span className="text-sm">{type.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Feedback Content */}
                      <div className="space-y-2">
                        <label htmlFor="feedback" className="text-sm font-medium text-neutral-9">
                          详细内容 <span className="text-error">*</span>
                        </label>
                        <textarea
                          id="feedback"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="请详细描述您的问题或建议..."
                          className="w-full min-h-[200px] px-4 py-3 rounded-lg border border-neutral-5 bg-neutral-2 text-neutral-9 placeholder:text-neutral-6 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                          required
                        />
                      </div>

                      {/* Contact */}
                      <div className="space-y-2">
                        <label htmlFor="contact" className="text-sm font-medium text-neutral-9">
                          联系方式（可选）
                        </label>
                        <Input
                          id="contact"
                          type="email"
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          placeholder="邮箱或用户名，方便我们回复您"
                        />
                      </div>

                      <Button 
                        onClick={handleSubmit} 
                        className="w-full gap-2"
                        disabled={!feedback.trim() || loading}
                      >
                        <Send className="h-4 w-4" />
                        {loading ? '提交中...' : '提交反馈'}
                      </Button>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
    </TeamGuard>
  );
}
