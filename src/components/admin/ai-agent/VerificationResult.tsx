import React from 'react';

export interface VerificationDetail {
  stepId: string;
  verified: boolean;
  error?: string;
}

export function VerificationResult({ success, message, details }: { success: boolean; message: string; details: VerificationDetail[] }) {
  return (
    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-right space-y-3">
      <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
          success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
        }`}>
          {success ? 'موفق و تایید شده' : 'دارای خطای مغایرت'}
        </span>
        <h4 className="text-sm font-bold text-gray-800">گزارش صحت‌سنجی تراکنش دیتابیس</h4>
      </div>
      <p className="text-xs text-gray-600">{message}</p>
      {details.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {details.map((d, i) => (
            <div key={i} className="flex justify-between items-center text-[11px] p-2 bg-gray-50/50 rounded-lg">
              <span className={d.verified ? 'text-emerald-600' : 'text-rose-600'}>
                {d.verified ? 'صحیح' : d.error || 'ناموفق'}
              </span>
              <span className="text-gray-500">گام #{i + 1} (شناسه: {d.stepId.slice(0, 8)}...)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
