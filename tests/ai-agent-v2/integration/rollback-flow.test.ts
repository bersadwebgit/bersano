import '../../../scripts/mock-setup';
import { executePlan } from '../../../src/lib/ai-agent-v2/services/execution-service';
import { createChangeSet } from '../../../src/lib/ai-agent-v2/persistence/change-set-repository';
import { rollbackChangeSet } from '../../../src/lib/ai-agent-v2/rollback';
import { validateTransition } from '../../../src/lib/ai-agent-v2/core/state-machine';
import { mockDb } from '../../../scripts/mock-setup';

// AI-003 regression: rollback must succeed after a successful execute+verify, and must be gated
// by the central state machine (not a legacy hardcoded 'completed' status).
export async function testRollbackFlow() {
  console.log('   Checking AI-003: Rollback after successful execute + state machine alignment...');

  const before = mockDb.products.get('prod_1')!.price;
  const target = before + 12345;

  const changeSetId = await createChangeSet({
    shopId: 'shop_1',
    prompt: 'AI-003 rollback regression',
    status: 'approved',
    riskLevel: 'low',
    planVersion: 1,
    steps: [
      { action: 'update', modelName: 'Product', recordId: 'prod_1', afterValue: { price: target }, order: 0, status: 'pending' },
    ],
  });

  const execution = await executePlan(changeSetId, 'shop_1', 'user_admin');
  if (!execution.success) throw new Error('Execution/verification failed');

  const executedCs = mockDb.changeSets.get(changeSetId)!;
  if (executedCs.status !== 'verified') {
    throw new Error(`Expected resting status 'verified', got '${executedCs.status}'`);
  }
  if (mockDb.products.get('prod_1')!.price !== target) {
    throw new Error('Execute did not apply the update');
  }

  // AI-003 core: rollback must be permitted from 'verified' (previously threw).
  await rollbackChangeSet(changeSetId, 'shop_1', 'regression rollback');

  const rolledBackCs = mockDb.changeSets.get(changeSetId)!;
  if (rolledBackCs.status !== 'rolled_back') {
    throw new Error(`Expected 'rolled_back', got '${rolledBackCs.status}'`);
  }
  if (mockDb.products.get('prod_1')!.price !== before) {
    throw new Error('Rollback did not restore the previous value');
  }

  // Regression: central state machine gates rollback correctly.
  validateTransition('verified', 'rolling_back');
  validateTransition('partially_failed', 'rolling_back');
  validateTransition('failed', 'rolling_back');
  let smBlocked = false;
  try {
    validateTransition('approved', 'rolling_back');
  } catch {
    smBlocked = true;
  }
  if (!smBlocked) throw new Error('State machine must not allow approved -> rolling_back');

  console.log('   ✓ Rollback works from terminal states and honors the central state machine!');
  return true;
}
export { testRollbackFlow as rollbackFlow };
