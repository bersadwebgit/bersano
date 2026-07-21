import { cn } from './cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Adds a subtle lift + border highlight on hover */
  interactive?: boolean;
  as?: 'div' | 'article' | 'li';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING_MAP = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

/**
 * Neutral surface card built on design tokens. Server component.
 */
export default function Card({
  children,
  className,
  interactive = false,
  as: Tag = 'div',
  padding = 'md',
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-mk-line bg-mk-surface',
        PADDING_MAP[padding],
        interactive &&
          'transition-all duration-300 hover:-translate-y-1 hover:border-primary-500/40 hover:shadow-[var(--mk-shadow-md)]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
