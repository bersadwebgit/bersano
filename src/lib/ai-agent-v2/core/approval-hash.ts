import crypto from 'crypto';
import { prisma } from '../../prisma';
import { ChangeStepDto } from '../contracts/change-set';

export interface ApprovalHashPayload {
  shopId: string;
  actorId: string;
  capabilityName: string;
  steps: ChangeStepDto[];
  riskLevel: string;
  planVersion: number;
}

export function calculateApprovalHash(payload: ApprovalHashPayload): string {
  const normalizedSteps = payload.steps
    .map(s => ({
      action: s.action,
      modelName: s.modelName,
      recordId: s.recordId,
      afterValue: s.afterValue,
    }))
    .sort((a, b) => (a.recordId || '').localeCompare(b.recordId || ''));

  const dataToHash = {
    shopId: payload.shopId,
    actorId: payload.actorId,
    capabilityName: payload.capabilityName,
    riskLevel: payload.riskLevel,
    planVersion: payload.planVersion,
    steps: normalizedSteps,
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(dataToHash))
    .digest('hex');
}

export async function verifyStaleStatus(
  steps: ChangeStepDto[],
  shopId: string
): Promise<void> {
  for (const step of steps) {
    if (step.action === 'update' || step.action === 'delete') {
      if (!step.recordId) continue;
      
      let dbUpdatedAt: Date | null = null;
      if (step.modelName === 'Product') {
        const p = await prisma.product.findFirst({
          where: { id: step.recordId, shopId },
          select: { updatedAt: true },
        });
        dbUpdatedAt = p?.updatedAt || null;
      } else if (step.modelName === 'Category') {
        const c = await prisma.category.findFirst({
          where: { id: step.recordId, shopId },
          select: { updatedAt: true },
        });
        dbUpdatedAt = c?.updatedAt || null;
      }

      if (dbUpdatedAt) {
        // Validation check for modified record version can be run
      }
    }
  }
}
