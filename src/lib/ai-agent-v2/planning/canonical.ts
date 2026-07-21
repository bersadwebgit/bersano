import { ChangeStepDto } from '../contracts/change-set';

/**
 * AI-018 — Canonical display normalization shared by the preview builder so that what the admin
 * sees matches what the executor actually persists. The executor strips the internal `tempRef`
 * directive and resolves cross-step temporary references to the real records it creates; the
 * preview must reflect the same, instead of showing raw internal placeholders.
 */

// Internal-only directives that the executor consumes and never persists as real fields.
const INTERNAL_KEYS = new Set(['tempRef']);

/**
 * Builds a map of tempRef -> human-friendly label from the `create` steps of a plan, so references
 * to not-yet-created records can be shown meaningfully in the preview.
 */
export function collectTempRefLabels(steps: ChangeStepDto[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const step of steps) {
    const after = step.afterValue as Record<string, unknown> | null | undefined;
    if (step.action === 'create' && after && typeof after.tempRef === 'string') {
      const label =
        (after.title as string) ||
        (after.name as string) ||
        (after.code as string) ||
        'رکورد جدید';
      labels[after.tempRef] = label;
    }
  }
  return labels;
}

/**
 * Returns a display-normalized copy of a step's `afterValue`:
 * - drops internal directives (e.g. `tempRef`) that the executor strips before persisting
 * - rewrites values that reference an in-plan temporary record to a friendly label (the executor
 *   resolves these to the real created record id at execution time)
 */
export function normalizeAfterValueForDisplay(
  afterValue: Record<string, unknown> | null | undefined,
  tempRefLabels: Record<string, string>
): Record<string, unknown> {
  if (!afterValue) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(afterValue)) {
    if (INTERNAL_KEYS.has(key)) continue;
    if (typeof value === 'string' && tempRefLabels[value]) {
      out[key] = `«${tempRefLabels[value]}» (رکورد جدید در همین طرح)`;
    } else {
      out[key] = value;
    }
  }
  return out;
}
