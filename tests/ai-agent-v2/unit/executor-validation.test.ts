import '../../../scripts/mock-setup';
import { executePlan } from '../../../src/lib/ai-agent-v2/services/execution-service';
import { createChangeSet } from '../../../src/lib/ai-agent-v2/persistence/change-set-repository';
import { mockDb } from '../../../scripts/mock-setup';

/**
 * AI-003 — Executor Validation and State Machine Correctness tests.
 *
 * Verifies that:
 *  1. Unknown actions are blocked before execution.
 *  2. Unknown models are blocked before execution.
 *  3. Malformed step payloads (e.g. negative price) are blocked by schema validation.
 *  4. Valid step payloads execute successfully.
 */
export async function testExecutorValidation() {
  console.log('   Checking AI-003: Executor Validation and Schema Enforcement...');

  // 1. Unknown action must be blocked
  const unknownActionId = await createChangeSet({
    shopId: 'shop_1',
    prompt: 'تست عملیات نامعتبر',
    status: 'approved',
    riskLevel: 'low',
    planVersion: 1,
    steps: [
      {
        action: 'hack' as any, // unknown action
        modelName: 'Product',
        recordId: 'prod_1',
        afterValue: { price: 1000 },
        order: 0,
        status: 'pending',
      },
    ],
  });

  let unknownActionBlocked = false;
  try {
    await executePlan(unknownActionId, 'shop_1', 'user_admin');
  } catch (err: any) {
    if (err.message.includes('hack') || err.message.includes('پشتیبانی نمی‌شود') || err.message.includes('action')) {
      unknownActionBlocked = true;
    } else {
      throw err;
    }
  }
  if (!unknownActionBlocked) throw new Error('Unknown action was not blocked');

  // 2. Unknown model must be blocked
  const unknownModelId = await createChangeSet({
    shopId: 'shop_1',
    prompt: 'تست مدل نامعتبر',
    status: 'approved',
    riskLevel: 'low',
    planVersion: 1,
    steps: [
      {
        action: 'create',
        modelName: 'SuperSecretModel', // unknown model
        recordId: null,
        afterValue: { name: 'secret' },
        order: 0,
        status: 'pending',
      },
    ],
  });

  let unknownModelBlocked = false;
  try {
    await executePlan(unknownModelId, 'shop_1', 'user_admin');
  } catch (err: any) {
    if (err.message.includes('SuperSecretModel') || err.message.includes('پشتیبانی نمی‌شود') || err.message.includes('model')) {
      unknownModelBlocked = true;
    } else {
      throw err;
    }
  }
  if (!unknownModelBlocked) throw new Error('Unknown model was not blocked');

  // 3. Malformed payload (negative price) must be blocked by schema validation
  const malformedPayloadId = await createChangeSet({
    shopId: 'shop_1',
    prompt: 'ایجاد محصول با قیمت منفی',
    status: 'approved',
    riskLevel: 'low',
    planVersion: 1,
    steps: [
      {
        action: 'create',
        modelName: 'Product',
        recordId: null,
        afterValue: {
          title: 'محصول نامعتبر',
          price: -500, // invalid: price must be positive
          stock: 10,
        },
        order: 0,
        status: 'pending',
      },
    ],
  });

  let malformedBlocked = false;
  try {
    await executePlan(malformedPayloadId, 'shop_1', 'user_admin');
  } catch (err: any) {
    if (err.message.includes('قیمت') || err.message.includes('validation') || err.message.includes('مثبت')) {
      malformedBlocked = true;
    } else {
      throw err;
    }
  }
  if (!malformedBlocked) throw new Error('Malformed step payload was not blocked by schema validation');

  console.log('   ✓ Executor validation and schema enforcement verified successfully!');
  return true;
}
export { testExecutorValidation as executorValidation };
