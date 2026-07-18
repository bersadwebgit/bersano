import React from 'react';

export interface HistoryItem {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
}

export function ChangeHistory({ items, onSelect }: { items: HistoryItem[]; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-3 text-right">
      <h4 className="text-sm font-bold text-gray-800">تاریخچه درخواست‌ها و طرح‌ها</h4>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">تاریخچه‌ای یافت نشد.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="w-full text-right p-3 bg-white hover:bg-gray-50 border border-gray-100 rounded-xl transition duration-150 flex justify-between items-center"
            >
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                item.status === 'verified' || item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                item.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-700'
              }`}>
                {item.status}
              </span>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-700 max-w-[200px] truncate">{item.prompt}</p>
                <p className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleDateString('fa-IR')}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
