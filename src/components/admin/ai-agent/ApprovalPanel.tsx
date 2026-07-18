import React, { useState } from 'react';

export function ApprovalPanel({ onApprove, onCancel, loading }: { onApprove: (notes: string) => void; onCancel: (notes: string) => void; loading: boolean }) {
  const [notes, setNotes] = useState('');

  return (
    <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm text-right space-y-3">
      <h4 className="text-sm font-bold text-gray-800">تأییدیه نهایی عملیات هوشمند</h4>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="توضیحات یا ملاحظات تأییدیه (اختیاری)..."
        className="w-full text-right p-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:outline-none"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onCancel(notes)}
          disabled={loading}
          className="flex-1 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl transition duration-150"
        >
          لغو تغییرات
        </button>
        <button
          onClick={() => onApprove(notes)}
          disabled={loading}
          className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition duration-150"
        >
          {loading ? 'در حال ثبت...' : 'تأیید و اجرای طرح'}
        </button>
      </div>
    </div>
  );
}
