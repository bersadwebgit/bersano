import { cn } from './cn';

type Tone = 'primary' | 'neutral' | 'success' | 'warning' | 'ai';

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

const TONE_MAP: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300',
  neutral: 'bg-mk-surface-muted text-mk-muted',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  ai: 'bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20',
};

/** Small pill label. Server component. */
export default function Badge({ children, tone = 'primary', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black',
        TONE_MAP[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
