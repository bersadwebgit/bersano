import Link from 'next/link';
import { Store } from 'lucide-react';

type BersanaBrandProps = {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
};

export default function BersanaBrand({
  compact = false,
  inverse = false,
  className = '',
}: BersanaBrandProps) {
  return (
    <Link
      href="/"
      aria-label="برسانا — صفحه اصلی"
      className={`group inline-flex items-center gap-2.5 outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 rounded-2xl ${className}`}
    >
      <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-blue-600 text-white shadow-[0_10px_28px_-12px_rgba(37,99,235,.9)] transition-transform duration-300 group-hover:-translate-y-0.5">
        <span className="absolute -left-3 -top-3 size-7 rounded-full bg-white/20 blur-sm" />
        <Store className="relative size-5 stroke-[2.25]" aria-hidden="true" />
      </span>

      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className={`text-[18px] font-black tracking-[-0.035em] ${inverse ? 'text-white' : 'text-slate-950 dark:text-white'}`}>
            برسانا
          </span>
          <span className={`mt-1 text-[9px] font-extrabold tracking-[-0.01em] ${inverse ? 'text-blue-300' : 'text-blue-600 dark:text-blue-400'}`}>
            فروشگاه‌ساز هوشمند
          </span>
        </span>
      )}
    </Link>
  );
}
