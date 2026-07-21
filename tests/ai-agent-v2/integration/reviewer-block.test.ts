import '../../../scripts/mock-setup';
import { createAgentPlan } from '../../../src/lib/ai-agent-v2/services/ai-agent-service';
import { approveAgentPlan } from '../../../src/lib/ai-agent-v2/services/approval-service';
import { executeChangeSet } from '../../../src/lib/ai-agent-v2/executor';
import { mockCompletionResponse, mockDb } from '../../../scripts/mock-setup';

// The mock returns the same completion text for both planner and reviewer, so the payload must
// satisfy the planner (steps + riskLevel) AND carry the reviewer verdict (approved).
const planSteps = [
  { action: 'update', modelName: 'Product', recordId: 'prod_2', afterValue: { price: 3100000 }, order: 0 },
];

// AI-002 regression: a rejected reviewer verdict must definitively block approval and execution.
export async function testReviewerBlock() {
  console.log('   Checking AI-002: Reviewer rejection blocks approval & execution...');

  // Case 1 — reviewer approves -> approvable 'preview_ready' state.
  mockCompletionResponse.text = JSON.stringify({
    riskLevel: 'low',
    summary: 'approved plan',
    approved: true,
    steps: planSteps,
  });
  const approved = await createAgentPlan({ shopId: 'shop_1', prompt: 'approve me', actorId: 'user_admin' });
  const approvedCs = mockDb.changeSets.get(approved.changeSetId);
  if (!approvedCs || approvedCs.status !== 'preview_ready') {
    throw new Error(`Expected 'preview_ready' when reviewer approves, got '${approvedCs?.status}'`);
  }

  // Case 2 — reviewer rejects -> non-approvable 'clarification_required' state.
  mockCompletionResponse.text = JSON.stringify({
    riskLevel: 'high',
    summary: 'rejected plan',
    approved: false,
    feedback: 'ریسک بالا',
    steps: planSteps,
  });
  const rejected = await createAgentPlan({ shopId: 'shop_1', prompt: 'reject me', actorId: 'user_admin' });
  const rejectedCs = mockDb.changeSets.get(rejected.changeSetId);
  if (!rejectedCs || rejectedCs.status !== 'clarification_required') {
    throw new Error(`Expected 'clarification_required' when reviewer rejects, got '${rejectedCs?.status}'`);
  }

  // Approval must be blocked by the central state machine.
  let approveBlocked = false;
  try {
    await approveAgentPlan({ changeSetId: rejected.changeSetId, shopId: 'shop_1', userId: 'user_admin', approved: true });
  } catch {
    approveBlocked = true;
  }
  if (!approveBlocked) throw new Error('Approval of a rejected plan must be blocked but it succeeded');

  // Execution must be blocked (executor requires an 'approved' change set).
  let execBlocked = false;
  try {
    await executeChangeSet(rejected.changeSetId, 'shop_1');
  } catch {
    execBlocked = true;
  }
  if (!execBlocked) throw new Error('Execution of a rejected plan must be blocked but it succeeded');

  console.log('   ✓ Reviewer rejection definitively blocks approval and execution!');
  return true;
}
export { testReviewerBlock as reviewerBlock };
