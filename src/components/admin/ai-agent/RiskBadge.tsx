import React from 'react';

export function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const styles = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-yellow-800 border-amber-200',
    high: 'bg-rose-50 text-red-700 border-rose-200',
  };

  const labels = {
    low: 'کم‌ریسک',
    medium: 'ریسک متوسط',
    high: 'پُرریسک',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}
