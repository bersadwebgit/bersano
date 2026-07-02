export interface TelegramResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Normalizes an Iranian phone number to the international Telegram format (e.g., 989123456789)
 */
export function normalizeTelegramPhone(phone: string): string {
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
 * Sends a notification message via a Telegram Bot with backoff retries and rate limit awareness
 * API URL: https://api.telegram.org/bot<token>/sendMessage
 */
export async function sendTelegramBotMessage(
  botToken: string,
  chatId: string,
  text: string,
  maxRetries = 3
): Promise<TelegramResult> {
  if (!botToken || !chatId) {
    return { success: false, error: 'توکن بات تلگرام یا چت‌آیدی وارد نشده است' };
  }

  let attempt = 1;
  let delay = 1000; // start with 1s delay

  while (attempt <= maxRetries) {
    try {
      console.log(`[INFO] [TelegramBot]: Sending message to chat ${chatId} (Attempt ${attempt}/${maxRetries})`);

      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
        }),
        // Add a signal timeout of 10s so requests never hang infinitely
        signal: AbortSignal.timeout(10000),
      });

      // Handle HTTP 429 Rate Limit gracefully
      if (response.status === 429) {
        const data = await response.clone().json().catch(() => ({}));
        const retryAfter = (data.parameters && data.parameters.retry_after) || 5;
        console.warn(`[WARN] [TelegramBot]: Rate limited (429). Retrying after ${retryAfter} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue; // Do not increment attempt count as this is a rate limit, retry the same attempt
      }

      // Handle server error on Telegram's side (HTTP 5xx), transient issue
      if (!response.ok && response.status >= 500) {
        console.warn(`[WARN] [TelegramBot]: Telegram API returned server error ${response.status}. Retrying in ${delay}ms...`);
        if (attempt === maxRetries) {
          return { success: false, error: `خطای سرور تلگرام با کد ${response.status}` };
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        attempt++;
        continue;
      }

      const data = await response.json();

      if (response.ok && data.ok) {
        return {
          success: true,
          messageId: data.result?.message_id?.toString() || 'sent',
        };
      } else {
        console.error('[ERROR] [TelegramBot]: Error response from Telegram API |', data);
        // If it's a permanent bad request (e.g. invalid chat ID), do not retry
        return {
          success: false,
          error: data.description || 'خطا در ارسال پیام به تلگرام',
        };
      }
    } catch (error: any) {
      console.error(`[ERROR] [TelegramBot]: Exception on attempt ${attempt}/${maxRetries} |`, error.message);
      if (attempt === maxRetries) {
        return {
          success: false,
          error: error?.message || 'خطای شبکه در اتصال به تلگرام',
        };
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
      attempt++;
    }
  }

  return { success: false, error: 'تعداد تلاش‌های مجدد به پایان رسید' };
}
