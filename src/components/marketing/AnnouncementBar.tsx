import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import type { AnnouncementBarConfig } from '@/lib/marketing-globals';
import { cn } from '@/components/marketing/ui/cn';

const TONE: Record<AnnouncementBarConfig['tone'], string> = {
  primary: 'bg-primary-600 text-white',
  neutral: 'bg-mk-surface-inverse text-white',
  success: 'bg-emerald-600 text-white',
};

/** Global announcement bar (CMS-managed via SystemSetting). Server component. */
export default function AnnouncementBar({ config }: { config: AnnouncementBarConfig }) {
  if (!config?.enabled || !config.text) return null;
  return (
    <div className={cn('w-full', TONE[config.tone] || TONE.primary)} role="region" aria-label="اعلان">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-bold">
        <Megaphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{config.text}</span>
        {config.ctaLabel && config.ctaHref && (
          <Link
            href={config.ctaHref}
            className="shrink-0 rounded-full bg-white/20 px-3 py-0.5 font-black underline-offset-2 hover:bg-white/30"
          >
            {config.ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
