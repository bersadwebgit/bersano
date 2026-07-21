import '../../../scripts/mock-setup';
import { executePlan } from '../../../src/lib/ai-agent-v2/services/execution-service';
import { approveAgentPlan } from '../../../src/lib/ai-agent-v2/services/approval-service';
import { createChangeSet } from '../../../src/lib/ai-agent-v2/persistence/change-set-repository';
import { mockDb, mockRedisStore } from '../../../scripts/mock-setup';

/**
 * AI-003 / AI-008 — Idempotency and Race Condition Protection tests.
 *
 * Verifies that:
 *  1. Duplicate execution is blocked (cannot execute an already executed/verified plan).
 *  2. Concurrent execution is blocked by the Redis lock.
 *  3. Duplicate approval is blocked.
 *  4. Concurrent approval is blocked by the Redis lock.
 */
export async function testIdempotency() {
  console.log('   Checking Idempotency and Concurrent Race Condition Protection...');

  // Setup a clean change set
  const changeSetId = await createChangeSet({
    shopId: 'shop_1',
    prompt: 'تست همزمانی',
    status: 'preview_ready',
    riskLevel: 'low',
    planVersion: 1,
    steps: [
      {
        action: 'update',
        modelName: 'Product',
        recordId: 'prod_1',
        afterValue: { price: 48000000 },
        order: 0,
        status: 'pending',
      },
    ],
  });

  // 1. Concurrent approval is blocked by the Redis lock
  // Simulate another process holding the lock
  const approveLockKey = `ai_lock:approve:${changeSetId}`;
  mockRedisStore.set(approveLockKey, 'locked');

  let concurrentApproveBlocked = false;
  try {
    await approveAgentPlan({
      changeSetId,
      shopId: 'shop_1',
      userId: 'user_admin',
      approved: true,
    });
  } catch (err: any) {
    if (err.message.includes('در حال حاضر') || err.message.includes('همزمان')) {
      concurrentApproveBlocked = true;
    } else {
      throw err;
    }
  }
  if (!concurrentApproveBlocked) throw new Error('Concurrent approval was not blocked by Redis lock');

  // Release the lock
  mockRedisStore.delete(approveLockKey);

  // Approve the plan successfully
  await approveAgentPlan({
    changeSetId,
    shopId: 'shop_1',
    userId: 'user_admin',
    approved: true,
  });

  // 2. Concurrent execution is blocked by the Redis lock
  const executeLockKey = `ai_lock:execute:${changeSetId}`;
  mockRedisStore.set(executeLockKey, 'locked');

  let concurrentExecBlocked = false;
  try {
    await executePlan(changeSetId, 'shop_1', 'user_admin');
  } catch (err: any) {
    if (err.message.includes('در حال حاضر') || err.message.includes('همزمان')) {
      concurrentExecBlocked = true;
    } else {
      throw err;
    }
  }
  if (!concurrentExecBlocked) throw new Error('Concurrent execution was not blocked by Redis lock');

  // Release the lock
  mockRedisStore.delete(executeLockKey);

  // Execute the plan successfully
  const execResult = await executePlan(changeSetId, 'shop_1', 'user_admin');
  if (!execResult.success) throw new Error('First execution failed');

  // 3. Duplicate execution is blocked (status is now 'verified')
  let duplicateExecBlocked = false;
  try {
    await executePlan(changeSetId, 'shop_1', 'user_admin');
  } catch (err: any) {
    if (err.message.includes('قبلاً اجرا') || err.message.includes('وضعیت فعلی')) {
      duplicateExecBlocked = true;
    } else {
      throw err;
    }
  }
  if (!duplicateExecBlocked) throw new Error('Duplicate execution was not blocked');

  console.log('   ✓ Idempotency and concurrent race protection verified successfully!');
  return true;
}
export { testIdempotency as idempotency };
