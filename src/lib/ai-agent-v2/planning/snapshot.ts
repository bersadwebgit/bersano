import { prisma } from '../../prisma';
import { ChangeStepDto } from '../contracts/change-set';

/**
 * AI-018 — Canonical before-snapshot + stale detection.
 *
 * The preview is built from a snapshot captured at plan-creation time (stored on each step's
 * `beforeValue`) instead of recomputing live DB reads on every request. A stale-guard then verifies,
 * right before execution, that the targeted records still match that approved snapshot — so what the
 * admin approved in the preview is exactly what executes. The executor and rollback are untouched;
 * they still recapture the real pre-execute values during the transaction for rollback fidelity
 * (which are guaranteed to equal the snapshot once the stale-guard has passed).
 */

async function fetchRecord(
  modelName: string,
  recordId: string,
  shopId: string
): Promise<Record<string, unknown> | null> {
  switch (modelName) {
    case 'Product':
      return (await prisma.product.findFirst({ where: { id: recordId, shopId } })) as Record<string, unknown> | null;
    case 'Category':
      return (await prisma.category.findFirst({ where: { id: recordId, shopId } })) as Record<string, unknown> | null;
    case 'ProductVariant':
      return (await prisma.productVariant.findFirst({ where: { id: recordId, shopId } })) as Record<string, unknown> | null;
    case 'Story':
      return (await prisma.story.findFirst({ where: { id: recordId, shopId } })) as Record<string, unknown> | null;
    case 'DiscountCode':
      return (await prisma.discountCode.findFirst({ where: { id: recordId, shopId } })) as Record<string, unknown> | null;
    default:
      return null;
  }
}

/**
 * Captures a canonical before-snapshot for `update`/`delete` steps that target an already-existing
 * record. Steps whose `recordId` refers to an in-plan temporary record (created by an earlier step)
 * are left untouched — they carry no snapshot and are resolved at execution time.
 */
export async function captureBeforeSnapshots(
  steps: ChangeStepDto[],
  shopId: string
): Promise<ChangeStepDto[]> {
  const result: ChangeStepDto[] = [];

  for (const step of steps) {
    if ((step.action === 'update' || step.action === 'delete') && step.recordId) {
      const current = await fetchRecord(step.modelName, step.recordId, shopId);
      if (current) {
        if (step.action === 'update' && step.afterValue) {
          const before: Record<string, unknown> = {};
          for (const key of Object.keys(step.afterValue)) {
            before[key] = current[key] ?? null;
          }
          result.push({ ...step, beforeValue: before });
          continue;
        }
        if (step.action === 'delete') {
          result.push({ ...step, beforeValue: current });
          continue;
        }
      }
    }
    result.push(step);
  }

  return result;
}

/**
 * Returns true if any `update`/`delete` step's target record has diverged from the snapshot captured
 * at plan time (changed fields for updates, or missing record for updates/deletes). Steps without a
 * stored snapshot (e.g. in-plan temporary records) are skipped.
 */
export async function hasStaleSteps(changeSetId: string, shopId: string): Promise<boolean> {
  const changeSet = await prisma.aiChangeSet.findFirst({
    where: { id: changeSetId, shopId },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
  if (!changeSet) return false;

  for (const step of changeSet.steps) {
    if (!step.recordId) continue;
    const snapshot = step.beforeValue as Record<string, unknown> | null;
    if (!snapshot) continue;

    const current = await fetchRecord(step.modelName, step.recordId, shopId);

    if (step.action === 'update') {
      if (!current) return true;
      for (const key of Object.keys(snapshot)) {
        if (JSON.stringify(current[key] ?? null) !== JSON.stringify(snapshot[key] ?? null)) {
          return true;
        }
      }
    } else if (step.action === 'delete') {
      if (!current) return true;
    }
  }

  return false;
}
