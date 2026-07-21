import '../../../scripts/mock-setup';
import { mockDb } from '../../../scripts/mock-setup';
import { captureBeforeSnapshots } from '../../../src/lib/ai-agent-v2/planning/snapshot';
import { buildPlanPreview } from '../../../src/lib/ai-agent-v2/planning/preview-builder';
import { createChangeSet } from '../../../src/lib/ai-agent-v2/persistence/change-set-repository';
import { executePlan } from '../../../src/lib/ai-agent-v2/services/execution-service';
import { ChangeSetDto, ChangeStepDto } from '../../../src/lib/ai-agent-v2/contracts/change-set';

// AI-018 regression: preview is built from a canonical snapshot equal to what the executor persists,
// and a stale-guard blocks execution when a target record changed after the preview was approved.
export async function testPreviewCanonical() {
  console.log('   Checking AI-018: Canonical preview == execute + stale-guard...');

  // 1) Plan-time snapshot captures current before-values for update steps only (not create/temp).
  const originalPrice = mockDb.products.get('prod_2')!.price;
  const steps = [
    { action: 'update', modelName: 'Product', recordId: 'prod_2', afterValue: { price: originalPrice + 100000 }, order: 0, status: 'pending' },
    { action: 'create', modelName: 'Product', recordId: null, afterValue: { title: 'محصول تازه', price: 999000, tempRef: 'temp_product_1' }, order: 1, status: 'pending' },
    { action: 'create', modelName: 'ProductVariant', recordId: null, afterValue: { productId: 'temp_product_1', name: 'قرمز' }, order: 2, status: 'pending' },
  ] as unknown as ChangeStepDto[];

  const snapped = await captureBeforeSnapshots(steps, 'shop_1');
  const updSnap = snapped[0].beforeValue as Record<string, unknown> | null;
  if (!updSnap || updSnap.price !== originalPrice) throw new Error('Update step must carry a canonical before-snapshot');
  if (snapped[1].beforeValue) throw new Error('Create step must not carry a snapshot');
  if (snapped[2].beforeValue) throw new Error('Temp-ref create step must not carry a snapshot');

  // 2) Preview mirrors execute: internal tempRef stripped, temp refs resolved to labels, update
  //    before-value pulled from the canonical snapshot (not a live recompute).
  const planDto = {
    shopId: 'shop_1', prompt: 'p', status: 'preview_ready', riskLevel: 'low', planVersion: 1, steps: snapped,
  } as unknown as ChangeSetDto;
  const preview = await buildPlanPreview(planDto, 'shop_1');

  const createStep = preview.steps.find((s) => s.action === 'create' && s.modelName === 'Product')!;
  if (createStep.diffs.some((d) => d.field === 'tempRef')) throw new Error('Preview must not expose the internal tempRef field');

  const variantStep = preview.steps.find((s) => s.modelName === 'ProductVariant')!;
  const productIdDiff = variantStep.diffs.find((d) => d.field === 'productId')!;
  if (typeof productIdDiff.after !== 'string' || !(productIdDiff.after as string).includes('محصول تازه')) {
    throw new Error('Preview must resolve in-plan temp references to a friendly label');
  }

  const updateStep = preview.steps.find((s) => s.action === 'update')!;
  const priceDiff = updateStep.diffs.find((d) => d.field === 'price')!;
  if (priceDiff.before !== originalPrice) throw new Error('Preview before-value must come from the canonical snapshot');

  // 3a) Stale-guard pass-through: a snapshot that matches the live record executes normally.
  const okId = await createChangeSet({
    shopId: 'shop_1', prompt: 'AI-018 ok', status: 'approved', riskLevel: 'low', planVersion: 1,
    steps: [{ action: 'update', modelName: 'Product', recordId: 'prod_2', beforeValue: { price: mockDb.products.get('prod_2')!.price }, afterValue: { price: 3100000 }, order: 0, status: 'pending' }],
  });
  const okExec = await executePlan(okId, 'shop_1', 'user_admin');
  if (!okExec.success) throw new Error('Non-stale plan should execute successfully');
  if (mockDb.products.get('prod_2')!.price !== 3100000) throw new Error('Non-stale plan must apply the update');

  // 3b) Stale-guard block: a snapshot that diverges from the live record must abort and mark 'stale'.
  const staleId = await createChangeSet({
    shopId: 'shop_1', prompt: 'AI-018 stale', status: 'approved', riskLevel: 'low', planVersion: 1,
    steps: [{ action: 'update', modelName: 'Product', recordId: 'prod_2', beforeValue: { price: 111 }, afterValue: { price: 4200000 }, order: 0, status: 'pending' }],
  });
  const priceBeforeStale = mockDb.products.get('prod_2')!.price;
  let blocked = false;
  try {
    await executePlan(staleId, 'shop_1', 'user_admin');
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error('Stale plan must not execute');
  if (mockDb.changeSets.get(staleId)!.status !== 'stale') throw new Error('Stale plan must be marked stale');
  if (mockDb.products.get('prod_2')!.price !== priceBeforeStale) throw new Error('Stale plan must not modify the record');

  console.log('   ✓ Preview mirrors execute (canonical snapshot + tempRef resolution) and stale drift is blocked!');
  return true;
}
export { testPreviewCanonical as previewCanonical };
