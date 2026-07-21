import { cn } from './cn';

export interface FaqEntry {
  q: string;
  a: string;
}

interface FaqProps {
  items: FaqEntry[];
  className?: string;
}

/**
 * Accessible, SEO-friendly FAQ built on native <details>/<summary>.
 * Renders fully in HTML (no client JS, crawlable + GEO-friendly) while remaining
 * keyboard-operable and screen-reader friendly out of the box.
 */
export default function Faq({ items, className }: FaqProps) {
  if (!items?.length) return null;

  return (
    <div className={cn('mx-auto w-full max-w-3xl space-y-3', className)}>
      {items.map((item, idx) => (
        <details
          key={idx}
          className="group rounded-2xl border border-mk-line bg-mk-surface px-5 py-1 transition-colors open:border-primary-500/40"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-black text-mk-strong dark:text-white marker:hidden">
            <span>{item.q}</span>
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mk-surface-muted text-mk-muted transition-transform duration-200 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="pb-4 text-[13px] font-medium leading-relaxed text-mk-muted whitespace-pre-line">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}
