import { cn } from './cn';
import Container from './Container';

type Tone = 'surface' | 'muted' | 'inverse' | 'transparent';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  /** Background tone from the design tokens */
  tone?: Tone;
  /** Vertical rhythm */
  spacing?: 'sm' | 'md' | 'lg';
  /** Stable anchor id for in-page navigation + CMS anchor links */
  id?: string;
  /** When false, renders children full-bleed without the inner Container */
  contained?: boolean;
  containerSize?: 'default' | 'narrow' | 'wide';
  ariaLabel?: string;
}

const TONE_MAP: Record<Tone, string> = {
  surface: 'bg-mk-surface',
  muted: 'bg-mk-surface-muted',
  inverse: 'bg-mk-surface-inverse text-white',
  transparent: 'bg-transparent',
};

const SPACING_MAP = {
  sm: 'py-10 sm:py-12',
  md: 'py-14 sm:py-20',
  lg: 'py-20 sm:py-28',
};

/**
 * Marketing section wrapper: enforces consistent background tones + vertical rhythm.
 * Server component. Pairs with Container for horizontal gutters.
 */
export default function Section({
  children,
  className,
  containerClassName,
  tone = 'surface',
  spacing = 'md',
  id,
  contained = true,
  containerSize = 'default',
  ariaLabel,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn('scroll-mt-24', TONE_MAP[tone], SPACING_MAP[spacing], className)}
    >
      {contained ? (
        <Container size={containerSize} className={containerClassName}>
          {children}
        </Container>
      ) : (
        children
      )}
    </section>
  );
}
