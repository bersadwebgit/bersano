import * as LucideIcons from 'lucide-react';

interface IconProps {
  name?: string;
  className?: string;
  /** Fallback icon name when `name` is missing/unknown */
  fallback?: string;
  'aria-hidden'?: boolean;
}

/**
 * Resolves a Lucide icon by string name (as stored in CMS content).
 * Server component. Decorative by default (aria-hidden).
 */
export default function Icon({
  name,
  className = 'w-6 h-6',
  fallback = 'Sparkles',
  'aria-hidden': ariaHidden = true,
}: IconProps) {
  const Resolved =
    (name && (LucideIcons as any)[name]) ||
    (LucideIcons as any)[fallback] ||
    LucideIcons.Sparkles;
  return <Resolved className={className} aria-hidden={ariaHidden} />;
}
