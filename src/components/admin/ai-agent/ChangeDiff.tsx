import React from 'react';

export interface DiffItem {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
}

export function ChangeDiff({ diffs }: { diffs: DiffItem[] }) {
  return (
    <div className="space-y-2 text-right">
      {diffs.map((d, idx) => (
        <div key={idx} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded-lg">
          <div className="flex gap-2 items-center">
            {d.before !== null && (
              <span className="text-red-500 line-through">{String(d.before)}</span>
            )}
            <span className="text-emerald-600 font-semibold">{String(d.after)}</span>
          </div>
          <span className="text-gray-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
