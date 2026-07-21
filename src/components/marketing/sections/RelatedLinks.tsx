import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Section from '@/components/marketing/ui/Section';
import SectionHeading from '@/components/marketing/ui/SectionHeading';

export interface RelatedLink {
  title: string;
  desc: string;
  href: string;
}

interface RelatedLinksProps {
  title?: string;
  links: RelatedLink[];
  tone?: 'surface' | 'muted';
}

/**
 * Contextual internal-linking block for marketing pages.
 * Strengthens topical clusters and spreads link equity between solution/comparison pages.
 * Server component.
 */
export default function RelatedLinks({ title = 'ادامه مطلب', links, tone = 'muted' }: RelatedLinksProps) {
  if (!links?.length) return null;
  return (
    <Section tone={tone}>
      <SectionHeading title={title} className="mb-8" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex flex-col gap-2 rounded-2xl border border-mk-line bg-mk-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary-500/40 hover:shadow-[var(--mk-shadow-md)]"
          >
            <span className="text-sm font-black text-mk-strong dark:text-white">{link.title}</span>
            <span className="text-[12px] font-medium leading-relaxed text-mk-muted">{link.desc}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-black text-primary-600 transition-transform group-hover:-translate-x-0.5">
              مشاهده
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
