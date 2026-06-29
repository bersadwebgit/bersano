export interface BaleResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Normalizes an Iranian phone number to the international Bale format (e.g., 989123456789)
 */
export function normalizeBalePhone(phone: string): string {
  let cleaned = phone.trim().replace(/\D/g, ''); // remove non-digits
  if (cleaned.startsWith('0098')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('98')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('09')) {
    cleaned = cleaned.substring(1);
  }
  
  // Basic validation length check: Iranian mobile numbers are 10 digits after cutting leadings (9xxxxxxxxx)
  if (cleaned.length !== 10 || !cleaned.startsWith('9')) {
    // Return original digits or attempt fallback if non-standard
    return cleaned.startsWith('98') ? cleaned : '98' + cleaned;
  }
  
  return '98' + cleaned;
}

/**
 * Sends a notification message via a Bale Bot (Telegram-compatible Bot API)
 * API URL: https://tapi.bale.ai/bot<token>/sendMessage
 */
export async function sendBaleBotMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<BaleResult> {
  try {
    if (!botToken || !chatId) {
      return { success: false, error: 'توکن بات بله یا چت‌آیدی وارد نشده است' };
    }

    console.log(`[INFO] [BaleBot]: Sending message to chat ${chatId}`);

    const url = `https://tapi.bale.ai/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      return {
        success: true,
        messageId: data.result?.message_id?.toString() || 'sent',
      };
    } else {
      console.error('[ERROR] [BaleBot]: Error from Bale API |', data);
      return {
        success: false,
        error: data.description || 'خطا در ارسال پیام به بله',
      };
    }
  } catch (error: any) {
    console.error('[ERROR] [BaleBot]: Exception while sending message |', error);
    return {
      success: false,
      error: error?.message || 'خطای شبکه در اتصال به بله',
    };
  }
}

/**
 * Obtains a JWT Access Token for Bale's Safir OTP service
 */
async function getSafirToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    console.log('[INFO] [BaleSafir]: Fetching OTP Access Token');
    
    // We send form data
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'read');

    const response = await fetch('https://safir.bale.ai/api/v2/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const data = await response.json();

    if (response.ok && data.access_token) {
      return data.access_token;
    } else {
      console.error('[ERROR] [BaleSafir]: Token fetch failed |', data);
      return null;
    }
  } catch (error) {
    console.error('[ERROR] [BaleSafir]: Exception fetching token |', error);
    return null;
  }
}

/**
 * Sends a One-Time Password (OTP) using Bale's Safir OTP API
 */
export async function sendBaleOtp(
  clientId: string,
  clientSecret: string,
  phone: string,
  code: string
): Promise<BaleResult> {
  try {
    if (!clientId || !clientSecret) {
      return { success: false, error: 'شناسه کلاینت یا رمز عبور درگاه بله وارد نشده است' };
    }

    const token = await getSafirToken(clientId, clientSecret);
    if (!token) {
      return { success: false, error: 'خطا در احراز هویت درگاه بله (کلاینت‌آیدی یا سکرت نادرست است)' };
    }

    const targetPhone = normalizeBalePhone(phone);
    const numericOtp = parseInt(code, 10);

    if (isNaN(numericOtp)) {
      return { success: false, error: 'رمز یکبار مصرف باید فقط شامل ارقام عددی باشد' };
    }

    console.log(`[INFO] [BaleSafir]: Sending OTP code ${code} to ${targetPhone}`);

    const response = await fetch('https://safir.bale.ai/api/v2/send_otp', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: targetPhone,
        otp: numericOtp,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        messageId: 'sent',
      };
    } else {
      console.error('[ERROR] [BaleSafir]: Error sending OTP |', data);
      
      // Map known error responses
      let errorMessage = 'خطا در ارسال پیامک بله';
      if (data.message === 'provided phone number is not valid') {
        errorMessage = 'شماره تلفن وارد شده در پیام‌رسان بله معتبر نیست';
      } else if (data.message === 'this phone does not have an account in Bale') {
        errorMessage = 'این شماره موبایل در پیام‌رسان بله حساب کاربری ندارد';
      } else if (data.message === 'payment required') {
        errorMessage = 'اعتبار پنل بله شما کافی نیست';
      } else if (data.message) {
        errorMessage = data.message;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error: any) {
    console.error('[ERROR] [BaleSafir]: Exception while sending OTP |', error);
    return {
      success: false,
      error: error?.message || 'خطای شبکه در ارسال کد به بله',
    };
  }
}
