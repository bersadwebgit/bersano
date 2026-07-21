import Link from 'next/link';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

interface BaseProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  fullWidth?: boolean;
  /** analytics event name forwarded to data-analytics-event for the global tracker */
  analyticsEvent?: string;
  analyticsLocation?: string;
}

interface LinkButtonProps extends BaseProps {
  href: string;
  external?: boolean;
  type?: never;
  onClick?: never;
}

interface NativeButtonProps extends BaseProps {
  href?: never;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}

type ButtonProps = LinkButtonProps | NativeButtonProps;

const VARIANT_MAP: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:scale-[0.98] focus-visible:ring-primary-500',
  secondary:
    'bg-transparent text-primary-700 dark:text-primary-300 border border-primary-500/40 hover:bg-primary-50 dark:hover:bg-primary-950/40 active:scale-[0.98] focus-visible:ring-primary-500',
  ghost:
    'bg-transparent text-mk-strong dark:text-white hover:bg-mk-surface-muted active:scale-[0.98] focus-visible:ring-primary-500',
  inverse:
    'bg-white text-primary-700 shadow-sm hover:bg-slate-100 active:scale-[0.98] focus-visible:ring-white',
};

const SIZE_MAP: Record<Size, string> = {
  sm: 'text-xs px-4 py-2 rounded-xl gap-1.5',
  md: 'text-sm px-6 py-3 rounded-2xl gap-2',
  lg: 'text-sm sm:text-base px-8 py-4 rounded-2xl gap-2',
};

const BASE =
  'inline-flex items-center justify-center font-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-50 disabled:pointer-events-none';

/**
 * Unified marketing button. Renders as a Next Link when `href` is set,
 * otherwise a native <button>. Server-compatible unless an onClick handler is passed.
 */
export default function Button(props: ButtonProps) {
  const {
    children,
    variant = 'primary',
    size = 'md',
    className,
    fullWidth,
    analyticsEvent,
    analyticsLocation,
  } = props;

  const classes = cn(
    BASE,
    VARIANT_MAP[variant],
    SIZE_MAP[size],
    fullWidth && 'w-full',
    className,
  );

  const analyticsAttrs = analyticsEvent
    ? { 'data-analytics-event': analyticsEvent, 'data-analytics-location': analyticsLocation }
    : {};

  if ('href' in props && props.href) {
    if (props.external) {
      return (
        <a
          href={props.href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
          {...analyticsAttrs}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={props.href} className={classes} {...analyticsAttrs}>
        {children}
      </Link>
    );
  }

  const { type = 'button', onClick, disabled } = props as NativeButtonProps;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes} {...analyticsAttrs}>
      {children}
    </button>
  );
}
