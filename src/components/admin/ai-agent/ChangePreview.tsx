import React from 'react';
import { ChangeDiff, DiffItem } from './ChangeDiff';

export interface StepPreview {
  action: 'create' | 'update' | 'delete';
  modelName: string;
  recordTitle: string;
  diffs: DiffItem[];
}

export function ChangePreview({ steps }: { steps: StepPreview[] }) {
  return (
    <div className="space-y-4 text-right">
      <h4 className="text-sm font-bold text-gray-800">پیش‌نمایش تغییرات دیتابیس</h4>
      {steps.map((step, idx) => (
        <div key={idx} className="p-3 border border-gray-100 rounded-xl bg-white space-y-2">
          <div className="flex justify-between items-center border-b border-gray-50 pb-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              step.action === 'create' ? 'bg-emerald-50 text-emerald-700' :
              step.action === 'update' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {step.action === 'create' ? 'ایجاد' : step.action === 'update' ? 'ویرایش' : 'حذف'}
            </span>
            <span className="text-xs font-bold text-gray-700">{step.recordTitle} ({step.modelName})</span>
          </div>
          {step.diffs.length > 0 ? (
            <ChangeDiff diffs={step.diffs} />
          ) : (
            <p className="text-xs text-gray-400">بدون تغییر در فیلدها</p>
          )}
        </div>
      ))}
    </div>
  );
}
