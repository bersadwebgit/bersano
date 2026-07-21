import '../../../scripts/mock-setup';
import { resolveAiModel, invalidateModelCache } from '../../../src/lib/ai-model-resolver';

// AI-004 regression: a legacy route's already-resolved panel model (passed as requestedModel) must
// be honored instead of being silently collapsed to the 'simple' slot model.
export async function testModelFidelity() {
  console.log('   Checking AI-004: Legacy model fidelity (panel model consumed)...');
  invalidateModelCache();

  // A caller that already resolved its purpose model must have it honored, regardless of slot.
  const explicit = 'anthropic/claude-sonnet-4-6';
  const r = await resolveAiModel(explicit, 'simple');
  if (r.model !== explicit) throw new Error(`Explicit model not honored: got ${r.model}`);
  if (r.source !== 'explicit-request') throw new Error(`Expected source 'explicit-request', got '${r.source}'`);

  // A 'content'/'complex' model passed on the default 'simple' slot must NOT be downgraded.
  const contentModel = 'openai/gpt-4o';
  const r2 = await resolveAiModel(contentModel, 'simple');
  if (r2.model !== contentModel) throw new Error(`Panel model collapsed to slot: got ${r2.model}`);

  // Empty / invalid requested model falls back to slot-based resolution (backward compatible).
  const r3 = await resolveAiModel('', 'simple');
  if (r3.source === 'explicit-request') throw new Error('Empty model must not be treated as explicit');
  if (!r3.model) throw new Error('Slot fallback should still resolve a model');
  const r4 = await resolveAiModel('undefined', 'simple');
  if (r4.source === 'explicit-request') throw new Error('"undefined" string must not be treated as explicit');

  // Embedding capability is still enforced even for an explicitly requested model.
  let threw = false;
  try {
    await resolveAiModel('google/gemini-2.5-flash-lite', 'embedding');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Non-embedding-capable explicit model must be rejected for embedding slot');

  console.log('   ✓ Panel-selected model is consumed; slot fallback and embedding guard intact!');
  return true;
}
export { testModelFidelity as modelFidelity };
