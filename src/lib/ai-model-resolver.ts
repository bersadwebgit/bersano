import { prisma } from './prisma';
import { AiProviderError } from './ai-provider/errors';

export type AiModelSlot =
  | 'general'
  | 'product_assistant'
  | 'router'
  | 'simple'
  | 'complex'
  | 'content'
  | 'chat'
  | 'wholesale'
  | 'fallback'
  | 'embedding'
  | 'blog'
  | 'platform_blog_idea'
  | 'platform_blog_outline'
  | 'platform_blog_section'
  | 'platform_blog_seo'
  | 'platform_blog_geo'
  | 'platform_blog_rewrite'
  | 'platform_blog_faq';

export const SLOT_KEYS: Record<AiModelSlot, string> = {
  general: 'openrouter_model',
  product_assistant: 'openrouter_control_model',
  router: 'ai_model_router',
  simple: 'ai_model_simple',
  complex: 'ai_model_complex',
  content: 'ai_model_content',
  chat: 'ai_model_chat',
  wholesale: 'ai_model_wholesale',
  fallback: 'ai_model_fallback',
  embedding: 'ai_model_embedding',
  blog: 'openrouter_blog_model',
  platform_blog_idea: 'platform_blog_idea_model',
  platform_blog_outline: 'platform_blog_outline_model',
  platform_blog_section: 'platform_blog_section_model',
  platform_blog_seo: 'platform_blog_seo_model',
  platform_blog_geo: 'platform_blog_geo_model',
  platform_blog_rewrite: 'platform_blog_rewrite_model',
  platform_blog_faq: 'platform_blog_faq_model',
};

const HARDCODED_FALLBACK: Record<AiModelSlot, string> = {
  general: 'google/gemini-2.5-flash-lite',
  product_assistant: 'google/gemini-2.5-flash-lite',
  router: 'google/gemini-2.5-flash-lite',
  simple: 'google/gemini-2.5-flash-lite',
  complex: 'google/gemini-2.5-flash-lite',
  content: 'google/gemini-2.5-flash-lite',
  chat: 'google/gemini-2.5-flash-lite',
  wholesale: 'google/gemini-2.5-flash-lite',
  fallback: 'google/gemini-2.5-flash-lite',
  embedding: 'openai/text-embedding-3-small',
  blog: 'google/gemini-2.5-flash-lite',
  platform_blog_idea: 'google/gemini-2.5-flash-lite',
  platform_blog_outline: 'google/gemini-2.5-flash-lite',
  platform_blog_section: 'google/gemini-2.5-flash-lite',
  platform_blog_seo: 'google/gemini-2.5-flash-lite',
  platform_blog_geo: 'google/gemini-2.5-flash-lite',
  platform_blog_rewrite: 'google/gemini-2.5-flash-lite',
  platform_blog_faq: 'google/gemini-2.5-flash-lite',
};

const modelCache = new Map<string, { value: string; exp: number }>();

export interface ResolvedModelResult {
  model: string;
  resolvedModel: string; // Backward compatibility
  slot: AiModelSlot;
  source: 'explicit-request' | 'system-setting' | 'slot-fallback' | 'env' | 'hardcoded-last-resort';
}

export function isEmbeddingCapableModel(model: string): boolean {
  const lower = model.toLowerCase();
  return lower.includes('embed') || lower.includes('embedding') || lower.includes('bge-') || lower.includes('ada-002');
}

export function validateModelName(model: unknown): string | null {
  if (typeof model !== 'string') return null;
  const trimmed = model.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === 'undefined' || lower === 'null') return null;
  if (trimmed.includes('[object Object]')) return null;
  if (trimmed.length > 150) return null;
  return trimmed;
}

/**
 * Resolves which AI model to use for each slot.
 * Precedence:
 * 1. Explicit service-specific SystemSetting
 * 2. Documented service fallback SystemSetting
 * 3. Environment fallback for that slot
 * 4. Final safe application fallback
 */
export async function resolveAiModel(
  requestedModel: unknown, // Honored when it is a valid, caller-resolved model (see AI-004)
  slot: AiModelSlot,
  _shopId?: string
): Promise<ResolvedModelResult> {
  // AI-004: Honor an explicitly-requested, valid model. Legacy routes resolve their purpose-specific
  // model via getAiModel('<slot>') (e.g. 'content'/'chat'/'complex') and pass it in the request body,
  // but openRouterFetch defaults slot='simple' and this resolver previously IGNORED requestedModel —
  // silently collapsing every legacy route to the 'simple' model (the panel-selected model was never
  // consumed). Since the requested model already comes from the central resolver / SystemSetting,
  // honoring it makes the panel model actually take effect with no hidden override. Empty/invalid
  // values (e.g. '', 'undefined', missing) fall through to the slot-based resolution below.
  const explicitModel = validateModelName(requestedModel);
  if (explicitModel) {
    if (slot === 'embedding' && !isEmbeddingCapableModel(explicitModel)) {
      throw new AiProviderError(
        'AI_INVALID_EMBEDDING_MODEL',
        `مدل انتخاب شده برای Embedding (${explicitModel}) قابلیت تولید وکتور را ندارد.`
      );
    }
    return {
      model: explicitModel,
      resolvedModel: explicitModel,
      slot,
      source: 'explicit-request',
    };
  }

  // 1. Check database-selected model (with in-memory cache)
  const cacheKey = `system:${slot}`;
  const cached = modelCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    const val = cached.value;
    if (slot === 'embedding') {
      if (val && !isEmbeddingCapableModel(val)) {
        throw new AiProviderError(
          'AI_INVALID_EMBEDDING_MODEL',
          `مدل انتخاب شده برای Embedding (${val}) قابلیت تولید وکتور را ندارد.`
        );
      }
    }
    return {
      model: val,
      resolvedModel: val,
      slot,
      source: 'system-setting', // Conceptual source for cached settings
    };
  }

  try {
    const rows = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            ...Object.values(SLOT_KEYS),
            'openrouter_control_model',
            'openrouter_model',
            'openrouter_blog_model',
          ],
        },
      },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));

    // 1. Explicit service-specific SystemSetting
    let resolved = validateModelName(map.get(SLOT_KEYS[slot]));
    let source: 'system-setting' | 'slot-fallback' | 'env' | 'hardcoded-last-resort' = 'system-setting';

    if (slot === 'embedding') {
      if (resolved) {
        if (!isEmbeddingCapableModel(resolved)) {
          throw new AiProviderError(
            'AI_INVALID_EMBEDDING_MODEL',
            `مدل انتخاب شده برای Embedding (${resolved}) قابلیت تولید وکتور را ندارد.`
          );
        }
        modelCache.set(cacheKey, { value: resolved, exp: Date.now() + 5 * 60 * 1000 });
        return {
          model: resolved,
          resolvedModel: resolved,
          slot,
          source,
        };
      }
    } else {
      // 2. Documented service fallback SystemSetting for non-embedding slots
      if (!resolved) {
        if (slot === 'product_assistant') {
          resolved = validateModelName(map.get('openrouter_control_model') || map.get('openrouter_model'));
          if (resolved) source = 'slot-fallback';
        } else if (slot === 'simple' || slot === 'complex') {
          resolved = validateModelName(map.get('openrouter_control_model') || map.get('openrouter_model'));
          if (resolved) source = 'slot-fallback';
        } else if (slot.startsWith('platform_blog_')) {
          resolved = validateModelName(map.get('openrouter_blog_model') || map.get('openrouter_model'));
          if (resolved) source = 'slot-fallback';
        }
      }

      if (resolved) {
        modelCache.set(cacheKey, { value: resolved, exp: Date.now() + 5 * 60 * 1000 });
        return {
          model: resolved,
          resolvedModel: resolved,
          slot,
          source,
        };
      }
    }
  } catch (error) {
    if (error instanceof AiProviderError) {
      throw error;
    }
    console.error('[resolveAiModel] DB error during model resolution:', error);
  }

  // 3. Environment fallback for that slot
  if (slot === 'embedding') {
    const envModel = validateModelName(process.env.AI_EMBEDDING_MODEL);
    if (envModel) {
      if (!isEmbeddingCapableModel(envModel)) {
        throw new AiProviderError(
          'AI_INVALID_EMBEDDING_MODEL',
          `مدل انتخاب شده برای Embedding در متغیر محیطی (${envModel}) قابلیت تولید وکتور را ندارد.`
        );
      }
      return {
        model: envModel,
        resolvedModel: envModel,
        slot,
        source: 'env',
      };
    }
  } else {
    const slotEnvKey = `AI_CHAT_MODEL_${slot.toUpperCase()}`;
    const envModel = validateModelName(process.env[slotEnvKey] || process.env.AI_CHAT_MODEL_DEFAULT);
    if (envModel) {
      return {
        model: envModel,
        resolvedModel: envModel,
        slot,
        source: 'env',
      };
    }
  }

  // 4. Final safe application fallback
  const hardcodedFallback = HARDCODED_FALLBACK[slot];
  return {
    model: hardcodedFallback,
    resolvedModel: hardcodedFallback,
    slot,
    source: 'hardcoded-last-resort',
  };
}

/**
 * Backward-compatible wrapper for getAiModel.
 */
export async function getAiModel(slot: AiModelSlot, shopId?: string): Promise<string> {
  const result = await resolveAiModel(undefined, slot, shopId);
  return result.model;
}

/**
 * Invalidates the AI model cache. Call this when super admin settings are updated.
 */
export function invalidateModelCache() {
  modelCache.clear();
}
