import { z } from 'zod';
import { ExecutionError } from '../contracts/errors';
import { ProductCreateSchema, ProductUpdateSchema } from './products/schemas';

/**
 * AI-003 (Executor Validation) — a thin, surgical validation layer invoked by the executor
 * BEFORE any database write. It does three things:
 *
 *  1. Definitively allow-lists (modelName, action) pairs — an unknown model or unknown action is
 *     blocked up-front, instead of being silently ignored by the executor's manual switch.
 *  2. Runs the RELATED capability schema (currently the precise Product schemas that are wired and
 *     match the Product columns 1:1) so malformed AI/client payloads are rejected with a safe
 *     Persian message rather than reaching Prisma.
 *  3. Keeps the executor's existing write logic untouched (no full rewrite) — this module only
 *     validates; it never persists.
 *
 * Validator coverage note: Only Product create/update have exact, field-complete schemas today, so
 * only those are hard-validated here. Category / ProductVariant / Story / DiscountCode remain
 * allow-listed (so the executor still handles them) but are not yet schema-validated — extending
 * per-capability schema coverage is tracked for Phase 2C (Feature Parity). The nested capability
 * handlers/registry (execute/verify/rollback) stay explicitly QUARANTINED (not wired into the
 * executor) to avoid an unnecessary full executor rewrite.
 */

export const ALLOWED_MODELS = new Set([
  'Product',
  'Category',
  'ProductVariant',
  'Story',
  'DiscountCode',
]);

export const ALLOWED_ACTIONS = new Set(['create', 'update', 'delete']);

const CREATE_VALIDATORS: Record<string, z.ZodTypeAny> = {
  Product: ProductCreateSchema,
};

const UPDATE_VALIDATORS: Record<string, z.ZodTypeAny> = {
  Product: ProductUpdateSchema.shape.data,
};

/**
 * Hard-blocks any step whose model or action is outside the executor's supported allow-list.
 * Runs before the change set is marked `executing`, so an unknown step never triggers partial writes.
 */
export function assertStepAllowed(modelName: string, action: string): void {
  if (!ALLOWED_ACTIONS.has(action)) {
    throw new ExecutionError(
      `Unknown/unsupported step action: "${action}"`,
      'این طرح شامل عملیاتی است که پشتیبانی نمی‌شود و به‌دلیل ایمنی اجرا نشد.'
    );
  }
  if (!ALLOWED_MODELS.has(modelName)) {
    throw new ExecutionError(
      `Unknown/unsupported step model: "${modelName}"`,
      'این طرح شامل موجودیتی است که پشتیبانی نمی‌شود و به‌دلیل ایمنی اجرا نشد.'
    );
  }
}

/**
 * Runs the related capability schema for a step's payload (validation only — the parsed result is
 * intentionally NOT used, so extra valid columns the schema doesn't enumerate are preserved for the
 * executor's write). Throws a safe Persian `ExecutionError` on invalid business data.
 */
export function validateStepPayload(
  modelName: string,
  action: string,
  payload: Record<string, unknown> | null | undefined
): void {
  if (!payload || (action !== 'create' && action !== 'update')) return;

  const schema = action === 'create' ? CREATE_VALIDATORS[modelName] : UPDATE_VALIDATORS[modelName];
  if (!schema) return;

  const result = schema.safeParse(payload);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const field = firstIssue?.path?.join('.') || 'داده';
    throw new ExecutionError(
      `Step payload validation failed for ${modelName}.${action}: ${firstIssue?.message || 'invalid'} (${field})`,
      `داده‌های «${field}» برای این تغییر معتبر نیست؛ به‌دلیل ایمنی اجرا انجام نشد.`
    );
  }
}
