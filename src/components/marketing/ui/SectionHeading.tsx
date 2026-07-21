import { cn } from './cn';
import Badge from './Badge';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'start';
  className?: string;
  /** Heading level for correct document outline (default h2) */
  as?: 'h1' | 'h2' | 'h3';
}

/**
 * Consistent section title block: optional eyebrow badge, heading, and lead text.
 * Server component. Enforces a single logical heading per section for SEO.
 */
export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
  as: Heading = 'h2',
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' ? 'items-center text-center mx-auto max-w-2xl' : 'items-start text-start',
        className,
      )}
    >
      {eyebrow && <Badge tone="primary">{eyebrow}</Badge>}
      <Heading className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-mk-strong dark:text-white leading-tight">
        {title}
      </Heading>
      {subtitle && (
        <p className="text-sm sm:text-base font-medium leading-relaxed text-mk-muted max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
