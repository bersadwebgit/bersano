import { cn } from './cn';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Narrower reading width for long-form / legal / article content */
  size?: 'default' | 'narrow' | 'wide';
  as?: 'div' | 'section' | 'header' | 'footer' | 'article' | 'main';
}

const SIZE_MAP: Record<NonNullable<ContainerProps['size']>, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-7xl',
  wide: 'max-w-[90rem]',
};

/**
 * Consistent horizontal gutters + max width across every marketing surface.
 * Server component (no client JS).
 */
export default function Container({
  children,
  className,
  size = 'default',
  as: Tag = 'div',
}: ContainerProps) {
  return (
    <Tag className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', SIZE_MAP[size], className)}>
      {children}
    </Tag>
  );
}
