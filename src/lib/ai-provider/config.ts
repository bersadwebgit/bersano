import { prisma } from '../prisma';
import { AiProviderConfig } from './types';
import { AiProviderError } from './errors';
import { isEmbeddingCapableModel } from '../ai-model-resolver';

let configCache: { value: AiProviderConfig; exp: number } | null = null;

export async function resolveAiProviderConfig(): Promise<AiProviderConfig> {
  const now = Date.now();
  if (configCache && configCache.exp > now) {
    return configCache.value;
  }

  try {
    // Read from DB
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'ai_enabled',
            'ai_gateway_enabled',
            'openrouter_api_key',
            'ai_model_simple',
            'ai_model_complex',
            'ai_model_embedding',
            'ai_embedding_base_url',
            'ai_embedding_api_key',
          ],
        },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
    
    // DB settings
    const aiEnabledDb = settingsMap.get('ai_enabled') !== 'false';
    const dbApiKey = settingsMap.get('openrouter_api_key') || '';
    const aiEmbeddingBaseUrl = settingsMap.get('ai_embedding_base_url') || '';
    const aiEmbeddingApiKey = settingsMap.get('ai_embedding_api_key') || '';
    
    // Env settings
    const transportModeEnv = process.env.AI_TRANSPORT_MODE?.trim().toLowerCase();
    const gatewayUrl = process.env.AI_GATEWAY_URL?.trim() || '';
    const gatewayToken = process.env.AI_GATEWAY_TOKEN?.trim() || '';
    const allowDirect = process.env.AI_ALLOW_DIRECT_OPENROUTER?.trim().toLowerCase() === 'true';
    const envTimeout = process.env.AI_GATEWAY_TIMEOUT_MS ? parseInt(process.env.AI_GATEWAY_TIMEOUT_MS, 10) : 180000;
    
    const defaultChatModel = process.env.AI_CHAT_MODEL_DEFAULT?.trim() || 'google/gemini-2.5-flash-lite';
    const simpleModel = process.env.AI_CHAT_MODEL_SIMPLE?.trim() || settingsMap.get('ai_model_simple') || 'google/gemini-2.5-flash';
    const complexModel = process.env.AI_CHAT_MODEL_COMPLEX?.trim() || settingsMap.get('ai_model_complex') || 'anthropic/claude-sonnet-4.6';
    const dbEmbeddingModel = settingsMap.get('ai_model_embedding')?.trim();
    const envEmbeddingModel = process.env.AI_EMBEDDING_MODEL?.trim();
    const embeddingModel = dbEmbeddingModel || envEmbeddingModel || 'openai/text-embedding-3-small';

    const directApiKey = dbApiKey || process.env.OPENROUTER_API_KEY || '';

    let mode: 'gateway' | 'direct' | 'disabled' = 'disabled';

    // Check if globally disabled
    if (!aiEnabledDb || transportModeEnv === 'disabled') {
      mode = 'disabled';
    } else if (transportModeEnv === 'gateway') {
      mode = 'gateway';
    } else if (transportModeEnv === 'direct') {
      mode = 'direct';
    } else {
      // Fallback to auto-detection based on config
      if (gatewayUrl && gatewayToken) {
        mode = 'gateway';
      } else if (allowDirect) {
        mode = 'direct';
      } else {
        mode = 'disabled';
      }
    }

    // Conditional Validation Rules
    if (mode !== 'disabled') {
      if (dbEmbeddingModel) {
        if (!isEmbeddingCapableModel(dbEmbeddingModel)) {
          throw new AiProviderError(
            'AI_INVALID_EMBEDDING_MODEL',
            `مدل انتخاب شده برای Embedding (${dbEmbeddingModel}) قابلیت تولید وکتور را ندارد.`
          );
        }
      } else if (envEmbeddingModel) {
        if (!isEmbeddingCapableModel(envEmbeddingModel)) {
          throw new AiProviderError(
            'AI_INVALID_EMBEDDING_MODEL',
            `مدل انتخاب شده برای Embedding در متغیر محیطی (${envEmbeddingModel}) قابلیت تولید وکتور را ندارد.`
          );
        }
      }
    }

    if (mode === 'gateway') {
      if (!gatewayUrl) {
        throw new AiProviderError(
          'AI_CONFIGURATION_ERROR',
          'آدرس درگاه واسط هوش مصنوعی (AI_GATEWAY_URL) تنظیم نشده است.',
          503
        );
      }
      if (!gatewayUrl.startsWith('http://') && !gatewayUrl.startsWith('https://')) {
        throw new AiProviderError(
          'AI_CONFIGURATION_ERROR',
          'آدرس درگاه واسط هوش مصنوعی نامعتبر است. باید با http یا https شروع شود.',
          503
        );
      }
      if (!gatewayToken) {
        throw new AiProviderError(
          'AI_CONFIGURATION_ERROR',
          'توکن درگاه واسط هوش مصنوعی (AI_GATEWAY_TOKEN) تنظیم نشده است.',
          503
        );
      }
      if (isNaN(envTimeout) || envTimeout <= 0) {
        throw new AiProviderError(
          'AI_CONFIGURATION_ERROR',
          'زمان انتظار درگاه واسط هوش مصنوعی نامعتبر است.',
          503
        );
      }
      if (!defaultChatModel) {
        throw new AiProviderError(
          'AI_CONFIGURATION_ERROR',
          'مدل چت پیش‌فرض تنظیم نشده است.',
          503
        );
      }
      if (!embeddingModel) {
        throw new AiProviderError(
          'AI_CONFIGURATION_ERROR',
          'مدل Embedding تنظیم نشده است.',
          503
        );
      }
    } else if (mode === 'direct') {
      if (!allowDirect) {
        throw new AiProviderError(
          'AI_GATEWAY_UNAVAILABLE',
          'اتصال مستقیم به هوش مصنوعی در این سرور مجاز نیست.',
          503
        );
      }
      if (!directApiKey) {
        throw new AiProviderError(
          'AI_CONFIGURATION_ERROR',
          'کلید API هوش مصنوعی (OPENROUTER_API_KEY) تنظیم نشده است و اتصال مستقیم در دسترس نیست.',
          503
        );
      }
    } else {
      // Disabled mode
      // If AI is disabled globally, missing AI provider credentials must not prevent application startup.
      // So we do not throw any error here, just return mode: 'disabled'
    }

    const config: AiProviderConfig = {
      mode,
      gatewayUrl,
      gatewayToken,
      directApiKey,
      timeoutMs: isNaN(envTimeout) ? 180000 : envTimeout,
      allowDirect,
      defaultChatModel,
      simpleModel,
      complexModel,
      embeddingModel,
      aiEmbeddingBaseUrl,
      aiEmbeddingApiKey,
    };

    configCache = { value: config, exp: now + 5000 }; // 5-second cache
    return config;
  } catch (error: any) {
    if (error instanceof AiProviderError) {
      throw error;
    }
    throw new AiProviderError(
      'AI_CONFIGURATION_ERROR',
      `خطا در پردازش تنظیمات ارائه‌دهنده هوش مصنوعی: ${error?.message || error}`
    );
  }
}

export function invalidateAiProviderConfigCache(): void {
  configCache = null;
}
