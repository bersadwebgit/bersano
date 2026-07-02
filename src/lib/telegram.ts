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
 * Sends a notification message via a Telegram Bot
 * API URL: https://api.telegram.org/bot<token>/sendMessage
 */
export async function sendTelegramBotMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<TelegramResult> {
  try {
    if (!botToken || !chatId) {
      return { success: false, error: 'توکن بات تلگرام یا چت‌آیدی وارد نشده است' };
    }

    console.log(`[INFO] [TelegramBot]: Sending message to chat ${chatId}`);

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
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      return {
        success: true,
        messageId: data.result?.message_id?.toString() || 'sent',
      };
    } else {
      console.error('[ERROR] [TelegramBot]: Error from Telegram API |', data);
      return {
        success: false,
        error: data.description || 'خطا در ارسال پیام به تلگرام',
      };
    }
  } catch (error: any) {
    console.error('[ERROR] [TelegramBot]: Exception while sending message |', error);
    return {
      success: false,
      error: error?.message || 'خطای شبکه در اتصال به تلگرام',
    };
  }
}
