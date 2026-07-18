import React from 'react';

export function ExecutionProgress({ active, progress, totalSteps }: { active: boolean; progress: number; totalSteps: number }) {
  if (!active) return null;
  const percent = totalSteps > 0 ? (progress / totalSteps) * 100 : 0;

  return (
    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-right space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{progress} از {totalSteps} گام</span>
        <h4 className="text-sm font-bold text-gray-800">در حال اجرای تغییرات در دیتابیس...</h4>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
