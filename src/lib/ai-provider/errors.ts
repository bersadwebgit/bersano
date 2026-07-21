export type AiErrorCode =
  | 'AI_CONFIGURATION_ERROR'
  | 'AI_AUTH_ERROR'
  | 'AI_RATE_LIMIT_ERROR'
  | 'AI_TIMEOUT'
  | 'AI_PROVIDER_ERROR'
  | 'AI_INVALID_RESPONSE'
  | 'AI_MODEL_UNAVAILABLE'
  | 'AI_EMBEDDING_DIMENSION_ERROR'
  | 'AI_INVALID_EMBEDDING_MODEL'
  | 'AI_GATEWAY_UNAVAILABLE'
  | 'AI_QUOTA_EXCEEDED';

const PERSIAN_MESSAGES: Record<AiErrorCode, string> = {
  AI_CONFIGURATION_ERROR: 'تنظیمات سیستم هوش مصنوعی ناقص یا نامعتبر است.',
  AI_AUTH_ERROR: 'خطای احراز هویت در سرویس هوش مصنوعی رخ داده است.',
  AI_RATE_LIMIT_ERROR: 'تعداد درخواست‌های هوش مصنوعی بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  AI_TIMEOUT: 'پاسخ سرویس هوش مصنوعی بیش از حد طول کشید.',
  AI_PROVIDER_ERROR: 'سرویس هوش مصنوعی با خطا مواجه شد.',
  AI_INVALID_RESPONSE: 'پاسخ دریافتی از هوش مصنوعی معتبر یا کامل نبود.',
  AI_MODEL_UNAVAILABLE: 'مدل هوش مصنوعی درخواست شده موقتاً در دسترس نیست.',
  AI_EMBEDDING_DIMENSION_ERROR: 'ابعاد وکتور تولید شده با دیتابیس همخوانی ندارد.',
  AI_INVALID_EMBEDDING_MODEL: 'مدل انتخاب شده برای Embedding قابلیت تولید وکتور را ندارد.',
  AI_GATEWAY_UNAVAILABLE: 'درگاه واسط هوش مصنوعی موقتاً در دسترس نیست.',
  AI_QUOTA_EXCEEDED: 'سقف مصرف هوش مصنوعی شما به پایان رسیده است. لطفاً پلن خود را ارتقا دهید.',
};

export class AiProviderError extends Error {
  public code: AiErrorCode;
  public status?: number;
  public persianMessage: string;

  constructor(code: AiErrorCode, details?: string, status?: number) {
    const safeDetails = details ? details.replace(/bearer\s+[a-z0-9-_.]+/gi, 'Bearer ••••••••') : '';
    super(`[${code}] ${safeDetails || PERSIAN_MESSAGES[code]}`);
    this.name = 'AiProviderError';
    this.code = code;
    this.status = status;
    this.persianMessage = PERSIAN_MESSAGES[code];
  }
}
