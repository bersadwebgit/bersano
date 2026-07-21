import { prisma } from '../prisma';
import { ChangeSetInput } from './types';

export async function createChangeSet(input: ChangeSetInput): Promise<string> {
  const changeSet = await prisma.aiChangeSet.create({
    data: {
      shopId: input.shopId,
      prompt: input.prompt,
      status: 'pending',
      riskLevel: input.riskLevel,
      riskAnalysis: input.riskAnalysis,
      summary: input.summary,
      steps: {
        create: input.steps.map((step) => ({
          action: step.action,
          modelName: step.modelName,
          recordId: step.recordId,
          beforeValue: step.beforeValue || undefined,
          afterValue: step.afterValue || undefined,
          order: step.order || 0,
          status: 'pending',
        })),
      },
    },
  });

  return changeSet.id;
}

export async function getChangeSet(id: string, shopId: string) {
  return await prisma.aiChangeSet.findFirst({
    where: { id, shopId },
    include: {
      steps: { orderBy: { order: 'asc' } },
      approvals: true,
      feedback: true,
    },
  });
}

export async function listChangeSets(shopId: string) {
  return await prisma.aiChangeSet.findMany({
    where: { shopId },
    include: {
      steps: { orderBy: { order: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function approveChangeSet(
  changeSetId: string,
  userId: string,
  approved: boolean,
  notes?: string
): Promise<void> {
  await prisma.$transaction([
    prisma.aiApproval.create({
      data: {
        changeSetId,
        userId,
        approved,
        notes,
      },
    }),
    prisma.aiChangeSet.update({
      where: { id: changeSetId },
      data: {
        status: approved ? 'approved' : 'cancelled',
      },
    }),
  ]);
}
