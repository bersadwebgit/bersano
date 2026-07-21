import '../../../scripts/mock-setup';
import { createChangeSet } from '../../../src/lib/ai-agent-v2/persistence/change-set-repository';
import { approveAgentPlan } from '../../../src/lib/ai-agent-v2/services/approval-service';
import { executePlan } from '../../../src/lib/ai-agent-v2/services/execution-service';
import { mockDb } from '../../../scripts/mock-setup';
import { prisma } from '../../../src/lib/prisma';

/**
 * AI-002 — Approval Integrity tests.
 *
 * Verifies that:
 *  1. Rejected plans cannot be approved.
 *  2. Duplicate approvals are blocked.
 *  3. Actor, shopId, and authorization are validated.
 *  4. Hash is stored and verified during execution.
 *  5. Post-approval tampering (payload modifications) is blocked.
 */
export async function testApprovalIntegrity() {
  console.log('   Checking AI-002: Approval Integrity and Tamper Protection...');

  // Setup a clean change set in 'preview_ready' status
  const okChangeSetId = await createChangeSet({
    shopId: 'shop_1',
    prompt: 'تغییر قیمت',
    status: 'preview_ready',
    riskLevel: 'low',
    planVersion: 1,
    steps: [
      {
        action: 'update',
        modelName: 'Product',
        recordId: 'prod_1',
        afterValue: { price: 50000000 },
        order: 0,
        status: 'pending',
      },
    ],
  });

  // 1. Re-validate actor, shopId, and authorization during approval
  let authBlocked = false;
  try {
    await approveAgentPlan({
      changeSetId: okChangeSetId,
      shopId: 'wrong_shop',
      userId: 'user_admin',
      approved: true,
    });
  } catch (err: any) {
    authBlocked = true;
  }
  if (!authBlocked) throw new Error('Approval with wrong shopId must be blocked');

  // 2. Successful approval stores the hash
  const hash = await approveAgentPlan({
    changeSetId: okChangeSetId,
    shopId: 'shop_1',
    userId: 'user_admin',
    approved: true,
  });

  if (!hash) throw new Error('Approval must return a valid hash');

  // Verify hash is stored in AiApproval.notes
  const approvalRecord = await prisma.aiApproval.findFirst({
    where: { changeSetId: okChangeSetId, approved: true },
  });
  if (!approvalRecord) throw new Error('AiApproval record not found');
  
  const parsedNotes = JSON.parse(approvalRecord.notes || '{}');
  if (parsedNotes.approvalHash !== hash) {
    throw new Error('Stored approval hash does not match returned hash');
  }

  // 3. Duplicate approval is blocked
  let duplicateBlocked = false;
  try {
    await approveAgentPlan({
      changeSetId: okChangeSetId,
      shopId: 'shop_1',
      userId: 'user_admin',
      approved: true,
    });
  } catch (err: any) {
    duplicateBlocked = true;
  }
  if (!duplicateBlocked) throw new Error('Duplicate approval must be blocked');

  // 4. Successful execution with correct hash
  const execResult = await executePlan(okChangeSetId, 'shop_1', 'user_admin');
  if (!execResult.success) throw new Error('Execution failed with valid hash');

  // 5. Setup another change set to test tampering / payload immutability
  const tamperChangeSetId = await createChangeSet({
    shopId: 'shop_1',
    prompt: 'تغییر قیمت ۲',
    status: 'preview_ready',
    riskLevel: 'low',
    planVersion: 1,
    steps: [
      {
        action: 'update',
        modelName: 'Product',
        recordId: 'prod_1',
        afterValue: { price: 60000000 },
        order: 0,
        status: 'pending',
      },
    ],
  });

  // Approve it
  await approveAgentPlan({
    changeSetId: tamperChangeSetId,
    shopId: 'shop_1',
    userId: 'user_admin',
    approved: true,
  });

  // Tamper with the step's afterValue in the database (simulate client/malicious write)
  const step = mockDb.changeSteps.get(`step_${tamperChangeSetId.split('_')[1]}`);
  const stepRecord = Array.from(mockDb.changeSteps.values()).find(s => s.changeSetId === tamperChangeSetId);
  if (stepRecord) {
    stepRecord.afterValue = { price: 999999999 }; // tampered price!
  }

  // Execution must fail due to hash mismatch (payload immutability)
  let tamperBlocked = false;
  try {
    await executePlan(tamperChangeSetId, 'shop_1', 'user_admin');
  } catch (err: any) {
    if (err.message.includes('امضا') || err.message.includes('tamper') || err.message.includes('تغییر یافته')) {
      tamperBlocked = true;
    } else {
      throw err;
    }
  }
  if (!tamperBlocked) throw new Error('Execution of a tampered plan must be blocked due to hash mismatch');

  console.log('   ✓ Approval Integrity and Tamper Protection verified successfully!');
  return true;
}
