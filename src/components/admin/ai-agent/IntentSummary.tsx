import React from 'react';
import { RiskBadge } from './RiskBadge';

export function IntentSummary({ summary, riskLevel, riskAnalysis }: { summary: string; riskLevel: 'low' | 'medium' | 'high'; riskAnalysis?: string }) {
  return (
    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-right">
      <div className="flex justify-between items-center mb-3">
        <RiskBadge level={riskLevel} />
        <h4 className="text-sm font-bold text-gray-800">خلاصه طرح تغییرات پیشنهادی</h4>
      </div>
      <p className="text-sm text-gray-600 mb-2">{summary}</p>
      {riskAnalysis && (
        <p className="text-xs text-rose-500 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50 mt-1">
          ⚠️ تحلیل ریسک: {riskAnalysis}
        </p>
      )}
    </div>
  );
}
