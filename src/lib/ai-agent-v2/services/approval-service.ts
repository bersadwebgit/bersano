import { prisma } from '../../prisma';
import { calculateApprovalHash } from '../core/approval-hash';
import { validateTransition, ChangeSetState } from '../core/state-machine';
import { getChangeSet } from '../persistence/change-set-repository';
import { ChangeStepDto } from '../contracts/change-set';
import { checkIdempotencyLock, releaseIdempotencyLock } from '../core/idempotency';

export async function approveAgentPlan(opts: {
  changeSetId: string;
  shopId: string;
  userId: string;
  approved: boolean;
  notes?: string;
}): Promise<string> {
  // AI-002: Re-validate actor, shopId, and authorization.
  if (!opts.userId) {
    throw new Error('شناسه کاربری الزامی است.');
  }
  if (!opts.shopId) {
    throw new Error('شناسه فروشگاه الزامی است.');
  }

  // AI-003/AI-008: Acquire Redis lock to prevent concurrent race conditions
  const lockKey = `approve:${opts.changeSetId}`;
  const locked = await checkIdempotencyLock(lockKey, 30);
  if (!locked) {
    throw new Error('عملیات تأیید این طرح در حال حاضر توسط درخواست دیگری در حال پردازش است.');
  }

  try {
    const changeSet = await getChangeSet(opts.changeSetId, opts.shopId);
    if (!changeSet) throw new Error('طرح تغییرات یافت نشد.');

    // Ensure shop ownership matches
    if (changeSet.shopId !== opts.shopId) {
      throw new Error('شما دسترسی لازم به این طرح را ندارید.');
    }

    // AI-002: Plan rejected by Reviewer (clarification_required) cannot be approved or executed.
    if (changeSet.status === 'clarification_required') {
      throw new Error('این طرح توسط بازبین رد شده است و قابل تأیید نیست.');
    }

    // AI-002: Control duplicate or concurrent approvals.
    if (changeSet.status === 'approved' && opts.approved) {
      throw new Error('این طرح قبلاً تأیید شده است.');
    }

    const existingApproval = await prisma.aiApproval.findFirst({
      where: { changeSetId: opts.changeSetId, approved: true },
    });
    if (existingApproval && opts.approved) {
      throw new Error('این طرح قبلاً تأیید شده است.');
    }

    const targetState = opts.approved ? 'approved' : 'cancelled';
    validateTransition(changeSet.status as ChangeSetState, targetState);

    const hash = calculateApprovalHash({
      shopId: opts.shopId,
      actorId: opts.userId,
      capabilityName: changeSet.steps[0]?.modelName || 'System',
      steps: changeSet.steps as unknown as ChangeStepDto[],
      riskLevel: changeSet.riskLevel,
      planVersion: 1,
    });

    // Store the hash inside the notes field as a JSON string to avoid schema migrations
    const storedNotes = JSON.stringify({
      approvalHash: hash,
      notes: opts.notes || 'تأیید شده توسط مدیر',
    });

    await prisma.$transaction([
      prisma.aiApproval.create({
        data: {
          changeSetId: opts.changeSetId,
          userId: opts.userId,
          approved: opts.approved,
          notes: storedNotes,
        },
      }),
      prisma.aiChangeSet.update({
        where: { id: opts.changeSetId },
        data: {
          status: targetState,
        },
      }),
    ]);

    return hash;
  } finally {
    await releaseIdempotencyLock(lockKey);
  }
}
