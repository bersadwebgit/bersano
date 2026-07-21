import Section from '@/components/marketing/ui/Section';
import SectionHeading from '@/components/marketing/ui/SectionHeading';
import Button from '@/components/marketing/ui/Button';
import Card from '@/components/marketing/ui/Card';
import Faq from '@/components/marketing/ui/Faq';
import Icon from '@/components/marketing/ui/Icon';
import { cn } from '@/components/marketing/ui/cn';
import FeatureGrid from '@/components/marketing/sections/FeatureGrid';
import ComparisonTable from '@/components/marketing/sections/ComparisonTable';
import PricingTable from '@/components/marketing/sections/PricingTable';
import CtaSection from '@/components/marketing/sections/CtaSection';
import { sanitizeHtml } from '@/lib/sanitize-html';
import type { SectionData } from '@/lib/marketing-pages';
import type { PricingPlanView } from '@/components/marketing/sections/PricingTable';

const toneMap: Record<string, 'surface' | 'muted' | 'inverse'> = {
  surface: 'surface',
  muted: 'muted',
  inverse: 'inverse',
};

function visibilityClass(v: string): string | undefined {
  if (v === 'desktop') return 'hidden lg:block';
  if (v === 'mobile') return 'lg:hidden';
  return undefined;
}

/**
 * Renders a single CMS-managed section by its type. Server component.
 * The SAME component is used for both live and preview, guaranteeing parity.
 */
function RenderSection({ section, pricingPlans }: { section: SectionData; pricingPlans?: PricingPlanView[] }) {
  const c = section.content || {};
  const tone = toneMap[section.themeVariant] || 'surface';
  const vis = visibilityClass(section.visibility);

  switch (section.type) {
    case 'hero':
      return (
        <Section id={section.anchorId || undefined} tone={tone} spacing="lg" className={vis}>
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            {c.eyebrow && (
              <span className="rounded-full bg-primary-50 px-3 py-1 text-[11px] font-black text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
                {c.eyebrow}
              </span>
            )}
            <h1 className="text-3xl font-black leading-tight tracking-tight text-mk-strong dark:text-white sm:text-4xl lg:text-5xl">
              {c.title}
            </h1>
            {c.subtitle && (
              <p className="max-w-2xl text-sm font-medium leading-relaxed text-mk-muted sm:text-base">
                {c.subtitle}
              </p>
            )}
            {(c.primaryLabel || c.secondaryLabel) && (
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                {c.primaryLabel && (
                  <Button href={c.primaryHref || '/register'} size="lg" analyticsEvent="hero_cta_click" analyticsLocation={`section_${section.type}`}>
                    {c.primaryLabel}
                  </Button>
                )}
                {c.secondaryLabel && (
                  <Button href={c.secondaryHref || '/demo'} variant="secondary" size="lg">
                    {c.secondaryLabel}
                  </Button>
                )}
              </div>
            )}
            {c.note && <p className="text-[11px] font-bold text-mk-muted">{c.note}</p>}
          </div>
        </Section>
      );

    case 'richText':
      return (
        <Section id={section.anchorId || undefined} tone={tone} className={vis} containerSize="narrow">
          {c.title && <SectionHeading title={c.title} align="start" className="mb-6" />}
          <div
            className="mk-prose max-w-none text-sm font-medium leading-loose text-mk-muted"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.html || '') }}
          />
        </Section>
      );

    case 'featureGrid':
      return (
        <Section id={section.anchorId || undefined} tone={tone} className={vis}>
          {(c.title || c.eyebrow) && (
            <SectionHeading eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} className="mb-10" />
          )}
          <FeatureGrid items={c.items || []} columns={c.columns === 2 ? 2 : 3} />
        </Section>
      );

    case 'steps':
      return (
        <Section id={section.anchorId || undefined} tone={tone} className={vis}>
          {(c.title || c.eyebrow) && (
            <SectionHeading eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} className="mb-10" />
          )}
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(c.items || []).map((step: any, idx: number) => (
              <Card as="li" key={idx} padding="lg">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-black text-white">
                  {idx + 1}
                </div>
                <h3 className="text-sm font-black text-mk-strong dark:text-white">{step.title}</h3>
                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-mk-muted">{step.desc}</p>
              </Card>
            ))}
          </ol>
        </Section>
      );

    case 'stats':
      return (
        <Section id={section.anchorId || undefined} tone={tone} className={vis}>
          <div className={cn('grid gap-4 text-center', (c.items || []).length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3')}>
            {(c.items || []).map((stat: any, idx: number) => (
              <div key={idx} className="rounded-2xl border border-mk-line bg-mk-surface p-6">
                <div className="text-2xl font-black text-primary-600 sm:text-3xl">{stat.value}</div>
                <div className="mt-1 text-xs font-bold text-mk-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </Section>
      );

    case 'trustBar':
      return (
        <Section id={section.anchorId || undefined} tone={tone} spacing="sm" className={vis}>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {(c.items || []).map((item: any, idx: number) => (
              <li key={idx} className="flex items-center gap-1.5 text-xs font-bold text-mk-muted">
                <Icon name={item.icon || 'ShieldCheck'} className="h-4 w-4 text-emerald-500" />
                {typeof item === 'string' ? item : item.label}
              </li>
            ))}
          </ul>
        </Section>
      );

    case 'faq':
      return (
        <Section id={section.anchorId || undefined} tone={tone} className={vis}>
          {c.title && <SectionHeading eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} className="mb-8" />}
          <Faq items={c.items || []} />
        </Section>
      );

    case 'comparison':
      return (
        <Section id={section.anchorId || undefined} tone={tone} className={vis}>
          {c.title && <SectionHeading eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} className="mb-8" />}
          <ComparisonTable columns={c.columns || []} rows={c.rows || []} caption={c.title} />
        </Section>
      );

    case 'pricing':
      return (
        <Section id={section.anchorId || undefined} tone={tone} className={vis}>
          {(c.title || c.eyebrow) && (
            <SectionHeading eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} className="mb-10" />
          )}
          <PricingTable plans={(c.plans as PricingPlanView[]) || pricingPlans || []} />
        </Section>
      );

    case 'cta':
      return (
        <div className={vis}>
          <CtaSection
            title={c.title}
            subtitle={c.subtitle}
            primaryLabel={c.primaryLabel || 'ساخت فروشگاه رایگان'}
            primaryHref={c.primaryHref || '/register'}
            secondaryLabel={c.secondaryLabel}
            secondaryHref={c.secondaryHref}
            reassurances={c.reassurances}
            analyticsLocation={section.anchorId || 'cta_section'}
          />
        </div>
      );

    default:
      return null;
  }
}

export default function SectionRenderer({
  sections,
  pricingPlans,
}: {
  sections: SectionData[];
  pricingPlans?: PricingPlanView[];
}) {
  return (
    <>
      {sections
        .filter((s) => s.enabled)
        .map((section) => (
          <RenderSection key={section.id} section={section} pricingPlans={pricingPlans} />
        ))}
    </>
  );
}
