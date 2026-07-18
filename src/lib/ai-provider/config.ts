import { prisma } from '../prisma';
import { AiProviderConfig } from './types';
import { AiProviderError } from './errors';

let configCache: { value: AiProviderConfig; exp: number } | null = null;

export async function resolveAiProviderConfig(): Promise<AiProviderConfig> {
  const now = Date.now();
  if (configCache && configCache.exp > now) {
    return configCache.value;
  }

  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['ai_enabled', 'ai_gateway_enabled', 'openrouter_api_key'],
        },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
    const aiEnabled = settingsMap.get('ai_enabled') !== 'false';
    const gatewayEnabled = settingsMap.get('ai_gateway_enabled') === 'true';
    const directApiKey = settingsMap.get('openrouter_api_key') || '';

    const gatewayUrl = process.env.AI_GATEWAY_URL || '';
    const gatewayToken = process.env.AI_GATEWAY_TOKEN || '';
    const allowDirect = process.env.AI_ALLOW_DIRECT_OPENROUTER === 'true';
    const envTimeout = process.env.AI_GATEWAY_TIMEOUT_MS ? parseInt(process.env.AI_GATEWAY_TIMEOUT_MS, 10) : 180000;

    let mode: 'gateway' | 'direct' | 'disabled' = 'disabled';

    if (!aiEnabled) {
      mode = 'disabled';
    } else if (gatewayEnabled) {
      if (!gatewayUrl || !gatewayToken) {
        throw new AiProviderError(
          'AI_CONFIGURATION_ERROR',
          'تنظیمات واسط کاربری هوش مصنوعی ناقص است (URL یا توکن وجود ندارد).'
        );
      }
      mode = 'gateway';
    } else if (allowDirect) {
      if (!directApiKey) {
        throw new AiProviderError(
          'AI_CONFIGURATION_ERROR',
          'کلید API هوش مصنوعی تنظیم نشده است و اتصال مستقیم در دسترس نیست.'
        );
      }
      mode = 'direct';
    } else {
      throw new AiProviderError(
        'AI_CONFIGURATION_ERROR',
        'اتصال هوش مصنوعی غیرفعال است و اتصال مستقیم در این سرور مجاز نیست.'
      );
    }

    const config: AiProviderConfig = {
      mode,
      gatewayUrl,
      gatewayToken,
      directApiKey,
      timeoutMs: envTimeout,
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
