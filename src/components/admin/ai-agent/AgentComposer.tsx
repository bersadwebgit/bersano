'use client';

import React, { useState, useEffect } from 'react';
import { useAgentPlan } from '../../../hooks/ai-agent/useAgentPlan';
import { useAgentApproval } from '../../../hooks/ai-agent/useAgentApproval';
import { useAgentExecution } from '../../../hooks/ai-agent/useAgentExecution';
import { useAgentHistory } from '../../../hooks/ai-agent/useAgentHistory';
import { IntentSummary } from './IntentSummary';
import { ChangePreview } from './ChangePreview';
import { ApprovalPanel } from './ApprovalPanel';
import { ExecutionProgress } from './ExecutionProgress';
import { VerificationResult } from './VerificationResult';
import { ChangeHistory } from './ChangeHistory';
import { FeedbackPanel } from './FeedbackPanel';

export function AgentComposer() {
  const [prompt, setPrompt] = useState('');
  const { generatePlan, loading: planning, error: planError, plan } = useAgentPlan();
  const { approvePlan, loading: approving, error: approvalError, success: approved } = useAgentApproval();
  const { executePlan, loading: executing, error: execError, data: execResult } = useAgentExecution();
  const { fetchHistory, history } = useAgentHistory();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, approved, execResult]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await generatePlan(prompt);
  };

  const handleApprove = async (notes: string) => {
    if (!plan?.changeSetId) return;
    await approvePlan(plan.changeSetId, true, notes);
    await executePlan(plan.changeSetId);
  };

  const handleCancel = async (notes: string) => {
    if (!plan?.changeSetId) return;
    await approvePlan(plan.changeSetId, false, notes);
  };

  const handleFeedbackSubmit = (rating: number, comment: string) => {
    if (!plan?.changeSetId) return;
    fetch('/api/admin/ai-agent/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeSetId: plan.changeSetId, rating, comment }),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right p-6" dir="rtl">
      <div className="lg:col-span-2 space-y-6">
        <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-800">دستیار صوتی و متنی هوشمند (AI Agent V2)</h3>
          <p className="text-xs text-gray-500">درخواست خود را برای مدیریت قیمت، موجودی، ایجاد کالا یا دسته‌بندی به زبان فارسی وارد کنید:</p>
          <form onSubmit={handleGenerate} className="flex gap-2">
            <button
              type="submit"
              disabled={planning}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold shadow transition-all"
            >
              {planning ? 'در حال تحلیل...' : 'ارسال دستور'}
            </button>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: قیمت لپ‌تاپ را ده درصد افزایش بده"
              className="flex-1 p-2.5 text-right border border-gray-200 rounded-2xl text-xs focus:ring-1 focus:ring-slate-800 focus:outline-none"
            />
          </form>
          {planError && <p className="text-xs text-red-500">{planError}</p>}
        </div>

        {plan && (
          <div className="space-y-6">
            <IntentSummary
              summary={plan.preview?.summary || 'طرح پیشنهادی'}
              riskLevel={plan.preview?.riskLevel || 'low'}
              riskAnalysis={plan.preview?.riskAnalysis}
            />

            {plan.preview?.steps && (
              <ChangePreview steps={plan.preview.steps} />
            )}

            {!approved && !execResult && (
              <ApprovalPanel
                onApprove={handleApprove}
                onCancel={handleCancel}
                loading={approving}
              />
            )}

            {executing && (
              <ExecutionProgress
                active={true}
                progress={plan.preview?.steps?.length || 1}
                totalSteps={plan.preview?.steps?.length || 1}
              />
            )}

            {execResult && (
              <div className="space-y-6">
                <VerificationResult
                  success={execResult.verification?.success ?? true}
                  message={execResult.verification?.message || 'عملیات با موفقیت انجام شد.'}
                  details={execResult.verification?.details || []}
                />
                <FeedbackPanel
                  onSubmit={handleFeedbackSubmit}
                  loading={false}
                />
              </div>
            )}
            {execError && <p className="text-xs text-red-500">{execError}</p>}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <ChangeHistory
            items={history}
            onSelect={async (id) => {
              await fetch(`/api/admin/ai-agent/changes/${id}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
