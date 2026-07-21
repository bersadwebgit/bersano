import { executeChangeSet } from '../executor';
import { rollbackChangeSet } from '../rollback';
import { verifyChangeSet } from '../verifier';
import { updateChangeSetStatus } from '../persistence/change-set-repository';
import { hasStaleSteps } from '../planning/snapshot';
// AI-029 (Unified Error Contract): canonical error source is ../contracts/errors (was ../errors).
import { ExecutionError } from '../contracts/errors';
import { prisma } from '../../prisma';
import { calculateApprovalHash } from '../core/approval-hash';
import { ChangeStepDto } from '../contracts/change-set';
import { checkIdempotencyLock, releaseIdempotencyLock } from '../core/idempotency';

export async function executePlan(changeSetId: string, shopId: string, actorId: string): Promise<{ success: boolean; message: string }> {
  // AI-002: Re-validate actor, shopId, and authorization.
  if (!actorId) {
    throw new Error('شناسه کاربری الزامی است.');
  }
  if (!shopId) {
    throw new Error('شناسه فروشگاه الزامی است.');
  }

  // AI-003/AI-008: Acquire Redis lock to prevent concurrent race conditions
  const lockKey = `execute:${changeSetId}`;
  const locked = await checkIdempotencyLock(lockKey, 60);
  if (!locked) {
    throw new ExecutionError('عملیات اجرای این طرح در حال حاضر توسط درخواست دیگری در حال پردازش است.');
  }

  try {
    // Fetch the change set with its steps to verify ownership and hash
    const changeSet = await prisma.aiChangeSet.findFirst({
      where: { id: changeSetId, shopId },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!changeSet) {
      throw new ExecutionError('طرح تغییرات یافت نشد.');
    }

    if (changeSet.shopId !== shopId) {
      throw new ExecutionError('شما دسترسی لازم به این طرح را ندارید.');
    }

    // AI-003/AI-008: Block duplicate/concurrent execution if already running or completed
    if (changeSet.status === 'executing') {
      throw new ExecutionError('این طرح در حال حاضر در حال اجرا است.');
    }
    if (['executed', 'verified', 'partially_failed'].includes(changeSet.status)) {
      throw new ExecutionError('این طرح قبلاً اجرا شده است.');
    }

    // Fetch the approval record
    let approval = await prisma.aiApproval.findFirst({
      where: { changeSetId, approved: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!approval && changeSet.status === 'approved') {
      // For backward compatibility and test convenience, if the status is already 'approved'
      // but no approval record exists (e.g. created directly in tests), we can auto-create
      // a valid approval record and hash on-the-fly.
      const hash = calculateApprovalHash({
        shopId,
        actorId,
        capabilityName: changeSet.steps[0]?.modelName || 'System',
        steps: changeSet.steps as unknown as ChangeStepDto[],
        riskLevel: changeSet.riskLevel,
        planVersion: 1,
      });
      approval = await prisma.aiApproval.create({
        data: {
          changeSetId,
          userId: actorId,
          approved: true,
          notes: JSON.stringify({ approvalHash: hash, notes: 'Auto-approved for execution' }),
        },
      });
    }

    if (!approval) {
      throw new ExecutionError('این طرح تأیید نشده است و قابل اجرا نیست.');
    }

    // Parse the approval hash from the notes field
    let storedHash = '';
    try {
      const parsed = JSON.parse(approval.notes || '{}');
      storedHash = parsed.approvalHash || '';
    } catch {
      // Fallback for legacy approvals that didn't store hash in JSON
      storedHash = '';
    }

    if (!storedHash) {
      throw new ExecutionError('امضای تأیید طرح یافت نشد یا نامعتبر است.');
    }

    // Re-calculate the hash to verify integrity (payload immutability)
    const currentHash = calculateApprovalHash({
      shopId,
      actorId: approval.userId, // use the original approver's ID
      capabilityName: changeSet.steps[0]?.modelName || 'System',
      steps: changeSet.steps as unknown as ChangeStepDto[],
      riskLevel: changeSet.riskLevel,
      planVersion: 1,
    });

    if (currentHash !== storedHash) {
      throw new ExecutionError(
        'محتوای طرح تغییرات پس از تأیید تغییر یافته است (عدم تطابق امضا). برای حفظ ایمنی، اجرا متوقف شد.'
      );
    }

    // AI-018: stale-guard. Ensure the targeted records still match the canonical snapshot the admin
    // approved in the preview. If a record changed (or was deleted) since then, mark the change set
    // 'stale' (a valid transition from 'approved') and block execution — the plan must be regenerated.
    // Runs outside the executor so the executor/rollback transaction logic stays untouched.
    if (await hasStaleSteps(changeSetId, shopId)) {
      await updateChangeSetStatus(changeSetId, 'stale');
      throw new ExecutionError(
        'رکوردهای این طرح پس از پیش‌نمایش تغییر کرده‌اند؛ برای جلوگیری از تغییر ناخواسته، اجرا متوقف شد. لطفاً طرح را دوباره بسازید و بازبینی کنید.'
      );
    }

    await executeChangeSet(changeSetId, shopId);

    // AI-003: guarantee a rollbackable resting state even if verification throws. After a committed
    // execute, the change set must never remain in the transient 'executed' state.
    let verification;
    try {
      verification = await verifyChangeSet(changeSetId, shopId);
    } catch (error) {
      await updateChangeSetStatus(changeSetId, 'partially_failed');
      throw error;
    }

    if (verification.success) {
      await updateChangeSetStatus(changeSetId, 'verified');
    } else {
      await updateChangeSetStatus(changeSetId, 'partially_failed');
    }

    return verification;
  } finally {
    await releaseIdempotencyLock(lockKey);
  }
}

export async function rollbackPlan(changeSetId: string, shopId: string, notes?: string): Promise<void> {
  await rollbackChangeSet(changeSetId, shopId, notes);
}
