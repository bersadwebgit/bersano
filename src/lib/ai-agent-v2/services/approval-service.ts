import { prisma } from '../../prisma';
import { calculateApprovalHash } from '../core/approval-hash';
import { validateTransition, ChangeSetState } from '../core/state-machine';
import { getChangeSet } from '../persistence/change-set-repository';
import { ChangeStepDto } from '../contracts/change-set';

export async function approveAgentPlan(opts: {
  changeSetId: string;
  shopId: string;
  userId: string;
  approved: boolean;
  notes?: string;
}): Promise<string> {
  const changeSet = await getChangeSet(opts.changeSetId, opts.shopId);
  if (!changeSet) throw new Error('طرح تغییرات یافت نشد.');

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

  await prisma.$transaction([
    prisma.aiApproval.create({
      data: {
        changeSetId: opts.changeSetId,
        userId: opts.userId,
        approved: opts.approved,
        notes: opts.notes,
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
}
