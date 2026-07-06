import { prisma } from './prisma';
import { decrypt } from './crypto';
import crypto from 'crypto';

/**
 * Hashes an OTP code securely using HMAC-SHA256 with a server-side pepper/salt
 */
export function hashOtp(code: string): string {
  const secret = process.env.OTP_HASH_SECRET || 'fallback-secure-otp-hash-pepper-2026';
  return crypto.createHmac('sha256', secret).update(code.trim()).digest('hex');
}

/**
 * Logs SMS attempts asynchronously to the SmsLog table
 */
export async function logSms(
  shopId: string,
  phone: string,
  provider: string,
  event: string,
  status: 'success' | 'failed',
  messageId?: string,
  error?: string
) {
  try {
    await (prisma as any).smsLog.create({
      data: {
        shopId,
        phone,
        provider,
        event,
        status,
        messageId: messageId || null,
        error: error ? error.slice(0, 500) : null
      }
    });
  } catch (e) {
    console.error('[ERROR] [SMS_LOG]: Failed to write SMS log to database:', e);
  }
}

/**
 * Dynamically resolves global SMS credentials from database or environment variables
 */
export async function getGlobalSmsCredentials(): Promise<{
  username: string;
  password: string;
  patternCode: string;
}> {
  try {
    const dbUsername = await prisma.systemSetting.findUnique({ where: { key: 'global_melipayamak_username' } });
    const dbPassword = await prisma.systemSetting.findUnique({ where: { key: 'global_melipayamak_password' } });
    const dbPatternCode = await prisma.systemSetting.findUnique({ where: { key: 'global_melipayamak_pattern_code' } });

    const username = dbUsername?.value ? decrypt(dbUsername.value) : (process.env.MELIPAYAMAK_USERNAME || '');
    const password = dbPassword?.value ? decrypt(dbPassword.value) : (process.env.MELIPAYAMAK_PASSWORD || '');
    const patternCode = dbPatternCode?.value || (process.env.MELIPAYAMAK_PATTERN_CODE || '');

    return { username, password, patternCode };
  } catch (error) {
    console.error('[ERROR] [SMS]: Failed to resolve global SMS credentials, falling back to environment variables:', error);
    return {
      username: process.env.MELIPAYAMAK_USERNAME || '',
      password: process.env.MELIPAYAMAK_PASSWORD || '',
      patternCode: process.env.MELIPAYAMAK_PATTERN_CODE || ''
    };
  }
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends an OTP SMS using Melipayamak shared pattern service. (Global system OTP)
 * @param phone The recipient's phone number (Iranian format like 09123456789)
 * @param code The 5-digit verification code
 */
export async function sendOtpSms(phone: string, code: string): Promise<SmsSendResult> {
  try {
    console.log(`[INFO] [SMS]: Attempting to send OTP SMS to ${phone} with code ${code}`);

    const { username, password, patternCode } = await getGlobalSmsCredentials();
    
    if (!username || !password || !patternCode) {
      console.error(`[ERROR] [SMS]: Global Melipayamak credentials are not configured in system settings or environment variables.`);
      return {
        success: false,
        error: 'سامانه پیامک اصلی پلتفرم پیکربندی نشده است'
      };
    }
    
    // Normalize phone number to start with 0 (e.g. +98912... -> 0912...)
    let targetPhone = phone.trim();
    if (targetPhone.startsWith('+98')) {
      targetPhone = '0' + targetPhone.substring(3);
    } else if (targetPhone.startsWith('98') && targetPhone.length === 12) {
      targetPhone = '0' + targetPhone.substring(2);
    }
    
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('text', code);
    params.append('to', targetPhone);
    params.append('bodyId', patternCode);

    console.log(`[INFO] [SMS]: Sending POST request to Melipayamak REST API...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      response = await fetch('https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: params.toString(),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      if (fetchErr.name === 'AbortError') {
        throw new Error('زمان پاسخ‌دهی سامانه پیامک به پایان رسید (Timeout)');
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[INFO] [SMS]: Melipayamak raw result:`, result);
    
    let isSuccess = false;
    let messageId = '';
    let errorMessage = '';
    
    if (result) {
      let val = '';
      if (typeof result === 'object' && result !== null) {
        val = String(result.Value || result.recId || result.recID || '');
      } else {
        val = String(result).trim();
      }
      
      const numericVal = Number(val);
      if (!isNaN(numericVal)) {
        if (numericVal > 0) {
          isSuccess = true;
          messageId = val;
        } else {
          isSuccess = false;
          const errorCodes: Record<number, string> = {
            [-1]: 'خطا در ارسال. لطفا با پشتیبانی تماس بگیرید.',
            [-2]: 'موجودی حساب کافی نیست.',
            [-3]: 'آدرس آی‌پی فرستنده معتبر نیست.',
            [-4]: 'کلمه عبور یا نام کاربری اشتباه است.',
            [-5]: 'شماره فرستنده معتبر نیست.',
            [-11]: 'نام کاربری یا رمز عبور پنل پیامک نادرست است.',
            [-12]: 'اعتبار پنل پیامک شما کافی نیست.',
            [-13]: 'شماره فرستنده پنل پیامک معتبر نیست.',
            [-14]: 'کد الگوی ارسالی (Pattern Code) معتبر نیست یا تایید نشده است.',
            [-15]: 'شماره گیرنده مسدود یا در بلک‌لیست است.',
          };
          errorMessage = errorCodes[numericVal] || `خطای سامانه پیامک با کد خطا: ${val}`;
          console.error(`[ERROR] [SMS]: Melipayamak returned error code: ${val} - ${errorMessage}`);
        }
      } else if (val) {
        isSuccess = true;
        messageId = val;
      }
    }

    // Log SMS attempt asynchronously
    logSms(
      'saas_platform',
      targetPhone,
      'melipayamak',
      'otp',
      isSuccess ? 'success' : 'failed',
      isSuccess ? messageId : undefined,
      isSuccess ? undefined : errorMessage
    );
    
    return { 
      success: isSuccess, 
      messageId: isSuccess ? (messageId || 'sent') : undefined,
      error: isSuccess ? undefined : (errorMessage || 'خطا در ارسال پیامک')
    };
  } catch (error: any) {
    console.error(`[ERROR] [SMS]: Exception while sending SMS to ${phone} |`, error);
    
    // Log exception asynchronously
    let targetPhone = phone.trim();
    if (targetPhone.startsWith('+98')) {
      targetPhone = '0' + targetPhone.substring(3);
    } else if (targetPhone.startsWith('98') && targetPhone.length === 12) {
      targetPhone = '0' + targetPhone.substring(2);
    }
    
    logSms(
      'saas_platform',
      targetPhone,
      'melipayamak',
      'otp',
      'failed',
      undefined,
      error?.message || 'خطا در ارسال پیامک'
    );

    return { 
      success: false, 
      error: error?.message || 'خطا در ارسال پیامک' 
    };
  }
}

export type SmsEvent = 
  | 'order_placed_customer'
  | 'order_placed_admin'
  | 'order_shipped'
  | 'order_cancelled'
  | 'new_registration'
  | 'otp'
  | 'product_back_in_stock';

// Define the standard parameter mappings for each event
export const SMS_EVENT_PARAMS: Record<SmsEvent, { melipayamak: string[]; smsir: string[] }> = {
  order_placed_customer: {
    melipayamak: ['customerName', 'orderNumber', 'totalAmount', 'storeName'],
    smsir: ['customerName', 'orderNumber', 'totalAmount', 'storeName']
  },
  order_placed_admin: {
    melipayamak: ['orderNumber', 'totalAmount', 'storeName'],
    smsir: ['orderNumber', 'totalAmount', 'storeName']
  },
  order_shipped: {
    melipayamak: ['customerName', 'orderNumber', 'trackingCode'],
    smsir: ['customerName', 'orderNumber', 'trackingCode']
  },
  order_cancelled: {
    melipayamak: ['customerName', 'orderNumber'],
    smsir: ['customerName', 'orderNumber']
  },
  new_registration: {
    melipayamak: ['customerName', 'storeName'],
    smsir: ['customerName', 'storeName']
  },
  otp: {
    melipayamak: ['code'],
    smsir: ['code']
  },
  product_back_in_stock: {
    melipayamak: ['customerName', 'productTitle', 'storeName'],
    smsir: ['customerName', 'productTitle', 'storeName']
  }
};

/**
 * Normalizes phone numbers to standard Iranian format (09123456789)
 */
export function normalizePhone(phone: string): string {
  let targetPhone = phone.trim();
  if (targetPhone.startsWith('+98')) {
    targetPhone = '0' + targetPhone.substring(3);
  } else if (targetPhone.startsWith('98') && targetPhone.length === 12) {
    targetPhone = '0' + targetPhone.substring(2);
  }
  return targetPhone;
}

/**
 * Sends a store-specific event SMS notification to a customer or admin
 * This function is completely safe and will not throw errors or block main execution.
 */
export async function sendStoreSms(
  shopId: string,
  event: SmsEvent,
  recipientPhone: string,
  placeholders: Record<string, string>
): Promise<SmsSendResult> {
  let providerStr = 'unknown';
  let targetPhone = normalizePhone(recipientPhone);
  
  try {
    console.log(`[INFO] [StoreSMS]: Attempting to send store SMS for shop ${shopId}, event ${event} to ${recipientPhone}`);
    
    // 1. Fetch store settings
    const settings = await prisma.shopSettings.findUnique({
      where: { shopId }
    });

    if (!settings || !settings.smsConfig) {
      console.log(`[INFO] [StoreSMS]: SMS not configured for shop ${shopId}`);
      return { success: false, error: 'SMS not configured' };
    }

    // 2. Parse SMS config
    let config: any = {};
    try {
      config = typeof settings.smsConfig === 'string' ? JSON.parse(settings.smsConfig) : settings.smsConfig;
    } catch (e) {
      console.error(`[ERROR] [StoreSMS]: Failed to parse smsConfig for shop ${shopId}`, e);
      return { success: false, error: 'Invalid SMS configuration' };
    }

    // 3. Check if SMS is enabled and provider is set
    if (!config.enabled || !config.provider) {
      console.log(`[INFO] [StoreSMS]: SMS is disabled or provider is not set for shop ${shopId}`);
      return { success: false, error: 'SMS is disabled or provider not set' };
    }

    const provider = config.provider.toLowerCase();
    providerStr = provider;
    const patternCode = config.patterns?.[event];

    // 4. Check if pattern code is set for this event
    if (!patternCode) {
      console.log(`[INFO] [StoreSMS]: Pattern code not set for event ${event} in shop ${shopId}`);
      return { success: false, error: 'Pattern code not configured for this event' };
    }

    const storeName = settings.shopName || 'فروشگاه';
    const allPlaceholders: Record<string, any> = { storeName, ...placeholders };

    // 5. Send using the selected provider
    if (provider === 'melipayamak') {
      const encryptedUsername = config.credentials?.username;
      const encryptedPassword = config.credentials?.password;

      if (!encryptedUsername || !encryptedPassword) {
        console.error(`[ERROR] [StoreSMS]: Melipayamak credentials missing for shop ${shopId}`);
        return { success: false, error: 'Credentials missing' };
      }

      const username = decrypt(encryptedUsername);
      const password = decrypt(encryptedPassword);

      if (!username || !password) {
        console.error(`[ERROR] [StoreSMS]: Failed to decrypt Melipayamak credentials for shop ${shopId}`);
        return { success: false, error: 'Failed to decrypt credentials' };
      }

      // Map placeholders to positional parameters
      const paramKeys = SMS_EVENT_PARAMS[event].melipayamak;
      const paramValues = paramKeys.map(key => {
        const val = String(allPlaceholders[key] || '');
        return val.replace(/;/g, ' '); // sanitize semicolons
      });
      const textValue = paramValues.join(';');

      console.log(`[INFO] [StoreSMS]: Sending Melipayamak pattern SMS to ${targetPhone} with bodyId ${patternCode} and text: ${textValue}`);

      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      params.append('text', textValue);
      params.append('to', targetPhone);
      params.append('bodyId', patternCode);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      let response;
      try {
        response = await fetch('https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: params.toString(),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') {
          throw new Error('زمان پاسخ‌دهی سامانه پیامک ملی‌پیامک به پایان رسید (Timeout)');
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`Melipayamak HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[INFO] [StoreSMS]: Melipayamak response:`, result);

      let isSuccess = false;
      let val = '';
      if (typeof result === 'object' && result !== null) {
        val = String(result.Value || result.recId || result.recID || '');
      } else {
        val = String(result).trim();
      }

      const numericVal = Number(val);
      if (!isNaN(numericVal) && numericVal > 0) {
        isSuccess = true;
      } else if (isNaN(numericVal) && val) {
        isSuccess = true;
      }

      const errorMsg = isSuccess ? undefined : `Melipayamak error code: ${val}`;

      // Log store SMS asynchronously
      logSms(
        shopId,
        targetPhone,
        'melipayamak',
        event,
        isSuccess ? 'success' : 'failed',
        isSuccess ? val : undefined,
        errorMsg
      );

      return {
        success: isSuccess,
        messageId: isSuccess ? val : undefined,
        error: errorMsg
      };

    } else if (provider === 'smsir') {
      const encryptedApiKey = config.credentials?.apiKey;

      if (!encryptedApiKey) {
        console.error(`[ERROR] [StoreSMS]: SMS.ir API key missing for shop ${shopId}`);
        return { success: false, error: 'API key missing' };
      }

      const apiKey = decrypt(encryptedApiKey);

      if (!apiKey) {
        console.error(`[ERROR] [StoreSMS]: Failed to decrypt SMS.ir API key for shop ${shopId}`);
        return { success: false, error: 'Failed to decrypt API key' };
      }

      // Map placeholders to named parameters
      const paramKeys = SMS_EVENT_PARAMS[event].smsir;
      const parameters = paramKeys.map(key => ({
        name: key,
        value: String(allPlaceholders[key] || '')
      }));

      console.log(`[INFO] [StoreSMS]: Sending SMS.ir verify SMS to ${targetPhone} with templateId ${patternCode}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      let response;
      try {
        response = await fetch('https://api.sms.ir/v1/send/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/plain',
            'x-api-key': apiKey
          },
          body: JSON.stringify({
            mobile: targetPhone,
            templateId: Number(patternCode),
            parameters: parameters
          }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') {
          throw new Error('زمان پاسخ‌دهی سامانه پیامک SMS.ir به پایان رسید (Timeout)');
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`SMS.ir HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[INFO] [StoreSMS]: SMS.ir response:`, result);

      // SMS.ir v2 response has status: 1 for success
      const isSuccess = result?.status === 1;
      const msgId = isSuccess ? String(result?.data?.messageId || 'sent') : undefined;
      const errorMsg = isSuccess ? undefined : (result?.message || 'SMS.ir failed to send');

      // Log store SMS asynchronously
      logSms(
        shopId,
        targetPhone,
        'smsir',
        event,
        isSuccess ? 'success' : 'failed',
        msgId,
        errorMsg
      );

      return {
        success: isSuccess,
        messageId: msgId,
        error: errorMsg
      };
    } else {
      console.error(`[ERROR] [StoreSMS]: Unsupported SMS provider: ${provider}`);
      return { success: false, error: 'Unsupported provider' };
    }

  } catch (error: any) {
    console.error(`[ERROR] [StoreSMS]: Exception while sending store SMS for shop ${shopId} |`, error);
    
    // Log store SMS exception asynchronously
    logSms(
      shopId,
      targetPhone,
      providerStr,
      event,
      'failed',
      undefined,
      error?.message || 'خطا در ارسال پیامک'
    );

    return {
      success: false,
      error: error?.message || 'خطا در ارسال پیامک'
    };
  }
}
