import { Check, X, Sparkles } from 'lucide-react';
import { cn } from '@/components/marketing/ui/cn';

export interface ComparisonColumn {
  key: string;
  label: string;
  highlight?: boolean;
}

export interface ComparisonRowData {
  feature: string;
  values: Record<string, string | boolean>;
  isAi?: boolean;
}

interface ComparisonTableProps {
  columns: ComparisonColumn[];
  rows: ComparisonRowData[];
  caption?: string;
  className?: string;
}

function renderCell(value: string | boolean, highlight?: boolean) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check
        className={cn('mx-auto h-5 w-5', highlight ? 'text-primary-600' : 'text-emerald-500')}
        aria-label="بله"
      />
    ) : (
      <X className="mx-auto h-5 w-5 text-slate-300 dark:text-slate-600" aria-label="خیر" />
    );
  }
  return <span>{value}</span>;
}

/**
 * Fair, criteria-based comparison table. Mobile-usable (horizontal scroll on small screens).
 * Server component. Uses a real <table> with scope for accessibility.
 */
export default function ComparisonTable({ columns, rows, caption, className }: ComparisonTableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-mk-line', className)}>
      <table className="w-full min-w-[560px] border-collapse text-right">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-mk-surface-muted">
            <th scope="col" className="p-4 text-xs font-black text-mk-muted">
              معیار
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'p-4 text-center text-xs font-black',
                  col.highlight
                    ? 'text-primary-700 dark:text-primary-300 bg-primary-50/60 dark:bg-primary-950/30'
                    : 'text-mk-strong dark:text-white',
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-mk-line">
              <th
                scope="row"
                className="p-4 text-right text-[13px] font-bold text-mk-strong dark:text-white"
              >
                <span className="inline-flex items-center gap-1.5">
                  {row.isAi && <Sparkles className="h-3.5 w-3.5 text-indigo-500" aria-hidden="true" />}
                  {row.feature}
                </span>
              </th>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'p-4 text-center text-[13px] font-bold',
                    col.highlight
                      ? 'bg-primary-50/40 dark:bg-primary-950/20 text-primary-700 dark:text-primary-300'
                      : 'text-mk-muted',
                  )}
                >
                  {renderCell(row.values[col.key], col.highlight)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
