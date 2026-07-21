/**
 * Minimal className combiner for the marketing design system.
 * Intentionally dependency-free (no clsx/tailwind-merge) per project "no new packages" rule.
 * Filters falsy values and joins with a space.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
