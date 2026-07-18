import { executeChangeSet } from '../executor';
import { rollbackChangeSet } from '../rollback';
import { verifyChangeSet } from '../verifier';
import { updateChangeSetStatus } from '../persistence/change-set-repository';

export async function executePlan(changeSetId: string, shopId: string, actorId: string): Promise<{ success: boolean; message: string }> {
  if (!actorId) {
    throw new Error('شناسه کاربری الزامی است.');
  }
  await executeChangeSet(changeSetId, shopId);

  const verification = await verifyChangeSet(changeSetId, shopId);
  
  if (verification.success) {
    await updateChangeSetStatus(changeSetId, 'verified');
  } else {
    await updateChangeSetStatus(changeSetId, 'partially_failed');
  }

  return verification;
}

export async function rollbackPlan(changeSetId: string, shopId: string, notes?: string): Promise<void> {
  await rollbackChangeSet(changeSetId, shopId, notes);
}
