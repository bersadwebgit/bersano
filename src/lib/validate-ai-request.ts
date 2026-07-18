// [HARDENED] — validation, error isolation, save safety

interface ValidationResult {
  valid: boolean;
  reason?: string; // Persian message shown to user
}

export function validateAiRequest(prompt: string, context?: {
  aiEnabled: boolean;
  hasApiKey: boolean;
  promptMinLength?: number;
}): ValidationResult {
  if (!prompt || prompt.trim().length === 0)
    return { valid: false, reason: 'دستور خالی است. لطفاً یک دستور وارد کنید.' };

  if (prompt.trim().length < (context?.promptMinLength ?? 3))
    return { valid: false, reason: 'دستور خیلی کوتاه است.' };

  if (prompt.length > 2000)
    return { valid: false, reason: 'دستور بیش از حد مجاز طولانی است (حداکثر ۲۰۰۰ کاراکتر).' };

  if (context) {
    if (!context.aiEnabled) {
      return { valid: false, reason: 'سیستم هوش مصنوعی غیرفعال است. از تنظیمات پلتفرم فعال کنید.' };
    }

    const isGatewayConfigured = !!(process.env.AI_GATEWAY_URL && process.env.AI_GATEWAY_TOKEN);
    const allowDirect = process.env.AI_ALLOW_DIRECT_OPENROUTER === 'true';

    // Check if configuration is missing/invalid
    if (!isGatewayConfigured && !allowDirect) {
      return { valid: false, reason: 'اتصال هوش مصنوعی غیرفعال است و اتصال مستقیم در این سرور مجاز نیست.' };
    }

    if (!isGatewayConfigured && !context.hasApiKey) {
      return { valid: false, reason: 'کلید API هوش مصنوعی تنظیم نشده است و اتصال مستقیم امکان‌پذیر نیست.' };
    }
  }

  return { valid: true };
}
