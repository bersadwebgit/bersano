import { prisma } from '../../prisma';
import { ChangeSetDto } from '../contracts/change-set';

export async function createChangeSet(input: Omit<ChangeSetDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const changeSet = await prisma.aiChangeSet.create({
    data: {
      shopId: input.shopId,
      prompt: input.prompt,
      status: input.status,
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

export async function updateChangeSetStatus(id: string, status: string): Promise<void> {
  await prisma.aiChangeSet.update({
    where: { id },
    data: { status },
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
export { createChangeSet as dbCreateChangeSet };
export { getChangeSet as dbGetChangeSet };
export { listChangeSets as dbListChangeSets };
