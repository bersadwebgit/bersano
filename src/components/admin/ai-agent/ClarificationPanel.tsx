import React from 'react';

export function ClarificationPanel({ candidates, onSelect }: { candidates: { id: string; name: string }[]; onSelect: (id: string) => void }) {
  return (
    <div className="p-4 bg-yellow-50/50 border border-yellow-200 rounded-2xl text-right">
      <h4 className="text-sm font-bold text-yellow-800 mb-2">شفاف‌سازی و رفع ابهام</h4>
      <p className="text-xs text-yellow-700 mb-3">چندین مورد با درخواست شما مطابقت دارد. لطفا گزینه دقیق را انتخاب کنید:</p>
      <div className="space-y-2">
        {candidates.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="w-full text-right p-2.5 text-xs bg-white hover:bg-yellow-50 border border-yellow-100 rounded-xl transition duration-150"
          >
            {c.name} (شناسه: {c.id})
          </button>
        ))}
      </div>
    </div>
  );
}
