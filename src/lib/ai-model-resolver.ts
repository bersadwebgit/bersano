import { prisma } from './prisma';

export type AiModelSlot =
  | 'router'
  | 'simple'
  | 'complex'
  | 'content'
  | 'chat'
  | 'embedding'
  | 'fallback'
  | 'wholesale';

const SLOT_KEYS: Record<AiModelSlot, string> = {
  router: 'ai_model_router',
  simple: 'ai_model_simple',
  complex: 'ai_model_complex',
  content: 'ai_model_content',
  chat: 'ai_model_chat',
  embedding: 'ai_model_embedding',
  fallback: 'ai_model_fallback',
  wholesale: 'ai_model_wholesale',
};

const HARDCODED_FALLBACK: Record<AiModelSlot, string> = {
  router: 'google/gemini-2.5-flash',
  simple: 'google/gemini-2.5-flash',
  complex: 'anthropic/claude-sonnet-4.6',
  content: 'anthropic/claude-sonnet-4.6',
  chat: 'google/gemini-2.5-flash',
  embedding: 'openai/text-embedding-3-small',
  fallback: 'google/gemini-2.5-flash',
  wholesale: 'anthropic/claude-sonnet-4.6',
};

const modelCache = new Map<string, { value: string; exp: number }>();

/**
 * Resolves which AI model to use for each slot.
 * Priority: SystemSetting row -> fallback to openrouter_control_model/openrouter_model -> hardcoded fallback
 * 
 * @param slot The AI model slot to resolve
 * @param _shopId Reserved for future per-shop overrides
 */
export async function getAiModel(slot: AiModelSlot, _shopId?: string): Promise<string> {
  const cacheKey = `system:${slot}`;
  const cached = modelCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) return cached.value;

  try {
    const rows = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [...Object.values(SLOT_KEYS), 'openrouter_control_model', 'openrouter_model'],
        },
      },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));

    let resolved = map.get(SLOT_KEYS[slot]);
    if (!resolved && (slot === 'simple' || slot === 'complex')) {
      resolved = map.get('openrouter_control_model') || map.get('openrouter_model');
    }
    if (resolved) {
      // Auto-correct deprecated or unstable models to active/supported equivalents
      const lower = resolved.toLowerCase();
      if (lower.includes('claude-3.5-haiku') || lower.includes('claude-3-haiku')) {
        resolved = 'google/gemini-2.5-flash';
      } else if (lower === 'anthropic/claude-sonnet-4-6') {
        resolved = 'anthropic/claude-sonnet-4.6';
      }
      modelCache.set(cacheKey, { value: resolved, exp: Date.now() + 5 * 60 * 1000 });
      return resolved;
    }
  } catch (error) {
    console.error('[getAiModel] DB error, falling back to hardcoded default:', error);
  }

  return HARDCODED_FALLBACK[slot];
}

/**
 * Invalidates the AI model cache. Call this when super admin settings are updated.
 */
export function invalidateModelCache() {
  modelCache.clear();
}
