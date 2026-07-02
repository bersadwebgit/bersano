const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const net = require('net');
const fs = require('fs');
const path = require('path');

const LOCK_PORT = 12346;
const pidFile = path.join(__dirname, 'telegram-bot.pid');

function checkSingleInstance() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ [SINGLE INSTANCE LOCK] Another instance is already running on port ${LOCK_PORT}. Exiting...`);
        process.exit(0);
      }
    });
    server.listen(LOCK_PORT, '127.0.0.1', () => {
      console.log(`🔒 [SINGLE INSTANCE LOCK] Successfully acquired lock on local port ${LOCK_PORT}.`);
      try {
        fs.writeFileSync(pidFile, String(process.pid), 'utf8');
        console.log(`📝 [INFO] Current PID (${process.pid}) written to ${pidFile}`);
      } catch (e) {
        console.warn(`[WARN] Failed to write PID file:`, e.message);
      }
      resolve(true);
    });
  });
}

/**
 * Robust Graphical Centralized Long-Polling Telegram Bot Runner
 * This script runs locally to poll updates from Telegram API using the central_telegram_bot_token.
 * It directly interacts with the database via Prisma to ensure high speed and zero delay.
 */

let botToken = null;
let offset = 0;
let isPolling = true;

// Session storage for interactive inline connection
const userSessions = {}; // structure: { [chatId]: { state: 'IDLE' | 'AWAITING_PHONE' | 'AWAITING_TOKEN', phone?: string, token?: string, panelMessageId?: number, isConnected?: boolean, isFailed?: boolean } }

// Helper to normalize phone number
function normalizePhone(phone) {
  let cleaned = phone.trim().replace(/\D/g, ''); // remove non-digits
  if (cleaned.startsWith('0098')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('98')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('09')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned; // returns 10 digits e.g. 9123456789
}

// Graphical Custom Keyboard Markup (Reply Keyboard)
const GRAPHICAL_KEYBOARD = {
  keyboard: [
    [
      { text: "📥 اتصال به فروشگاه" },
      { text: "📊 گزارش سفارشات" }
    ],
    [
      { text: "❌ قطع اتصال از ربات" }
    ]
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};

// Helper to send message to Telegram with keyboard
async function sendTelegramMessage(chatId, text, replyMarkup = GRAPHICAL_KEYBOARD) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId),
        text: text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup ? replyMarkup : undefined,
      }),
    });
    return response.ok;
  } catch (err) {
    console.error(`[ERROR] Failed to send message to chat ${chatId}:`, err.message);
    return false;
  }
}

// Helper to edit message text and inline keyboard in Telegram
async function editTelegramMessage(chatId, messageId, text, replyMarkup = null) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/editMessageText`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId),
        message_id: Number(messageId),
        text: text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup ? replyMarkup : undefined,
      }),
    });
    return response.ok;
  } catch (err) {
    console.warn(`[WARN] Failed to edit message ${messageId}:`, err.message);
    return false;
  }
}

// Helper to answer callback query
async function answerCallbackQuery(callbackQueryId) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: String(callbackQueryId),
      }),
    });
  } catch (err) {
    // Ignore callback answer errors
  }
}

// Load Bot Token from DB
async function loadBotToken() {
  try {
    const tokenSetting = await prisma.systemSetting.findUnique({
      where: { key: 'central_telegram_bot_token' }
    });
    if (tokenSetting && tokenSetting.value) {
      botToken = tokenSetting.value.trim();
      console.log(`[INFO] Loaded Central Bot Token: ${botToken.substring(0, 10)}...`);
      return true;
    } else {
      console.warn(`[WARN] Central Bot Token not found in Database settings. Please configure it in Super Admin dashboard.`);
      return false;
    }
  } catch (err) {
    console.error(`[ERROR] Failed to load token from database:`, err.message);
    return false;
  }
}

// Command: /start or /help / Guide (Super minimal and clean)
async function handleStart(chatId) {
  // Clear existing session
  delete userSessions[chatId];

  const welcomeText = `🤖 *به دستیار ربات تلگرام خوش آمدید!*

جهت اتصال فروشگاه خود و دریافت سفارشات زنده، از دکمه‌های زیر استفاده کنید.`;

  await sendTelegramMessage(chatId, welcomeText);
}

// Interactive Link Panel (Extremely clean & minimal)
async function sendInlineConnectionPanel(chatId, messageId = null) {
  const session = userSessions[chatId] || {};
  const phoneText = session.phone ? `📱 شماره: ${session.phone}` : '1️⃣ شماره موبایل وارد کنید';
  const tokenText = session.token ? `🔑 رمز: ${session.token}` : '2️⃣ رمز اتصال وارد کنید';
  
  let confirmText = '⚪️ تایید نهایی و اتصال';
  if (session.isConnected) {
    confirmText = '🟢 متصل شد';
  } else if (session.isFailed) {
    confirmText = '🔴 خطا در اتصال (تلاش مجدد)';
  }

  const text = `📥 *پنل اتصال فروشگاه:*`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: phoneText, callback_data: 'enter_phone' }
      ],
      [
        { text: tokenText, callback_data: 'enter_token' }
      ],
      [
        { text: confirmText, callback_data: 'confirm_link' }
      ]
    ]
  };

  if (messageId) {
    const edited = await editTelegramMessage(chatId, messageId, text, inlineKeyboard);
    if (!edited) {
      await sendTelegramMessage(chatId, text, inlineKeyboard);
    }
  } else {
    await sendTelegramMessage(chatId, text, inlineKeyboard);
  }
}

// Database Connection Executer (Silent)
async function executeConnectionSilent(chatId, phone, token) {
  const normalizedInputPhone = normalizePhone(phone);

  try {
    // List all shops in DB for diagnostics
    const allShops = await prisma.shopSettings.findMany({
      select: {
        id: true,
        shopName: true,
        contactPhone: true,
        telegramIntegrationToken: true,
        telegramChatId: true
      }
    });

    if (normalizedInputPhone.length !== 10 || !normalizedInputPhone.startsWith('9')) {
      return false;
    }

    // Try finding exact match or contains match
    let shopSettings = await prisma.shopSettings.findFirst({
      where: {
        contactPhone: {
          contains: normalizedInputPhone
        },
        telegramIntegrationToken: token,
      }
    });

    if (!shopSettings) {
      // Let's do manual match to be extra safe against SQLite contains query sensitivity
      shopSettings = allShops.find(s => {
        if (!s.contactPhone || !s.telegramIntegrationToken) return false;
        const normalizedDBPhone = normalizePhone(s.contactPhone);
        return normalizedDBPhone === normalizedInputPhone && s.telegramIntegrationToken.trim() === token.trim();
      });

      if (!shopSettings) {
        return false;
      }
    }

    // Update Shop Settings to link chatId
    await prisma.shopSettings.update({
      where: { id: shopSettings.id },
      data: {
        telegramChatId: String(chatId),
        telegramOrderNotificationsEnabled: true
      }
    });

    console.log(`[SUCCESS] Store "${shopSettings.shopName}" linked to Telegram ChatID: ${chatId}`);
    return true;
  } catch (err) {
    console.error(`[ERROR] Database error during link: ${err.message}`);
    return false;
  }
}

// Command: /orders / button "📊 گزارش سفارشات"
async function handleOrders(chatId) {
  try {
    const shopSettings = await prisma.shopSettings.findFirst({
      where: { telegramChatId: String(chatId) }
    });

    if (!shopSettings) {
      await sendTelegramMessage(chatId, `⚠️ ابتدا از دکمه «📥 اتصال به فروشگاه» استفاده کنید.`);
      return;
    }

    // Fetch latest 5 orders
    const orders = await prisma.order.findMany({
      where: { shopId: shopSettings.shopId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (orders.length === 0) {
      await sendTelegramMessage(chatId, `🏪 فروشگاه: *${shopSettings.shopName}*\n📦 سفارشی ثبت نشده است.`);
      return;
    }

    const pMethodMap = {
      online: 'پرداخت آنلاین',
      card_to_card: 'کارت به کارت',
      deposit: 'بیعانه',
      credit: 'پرداخت اعتباری',
    };

    const currencyText = shopSettings.currency === 'IRT' ? 'تومان' : 'ریال';

    let orderListText = `📊 *آخرین سفارشات فروشگاه ${shopSettings.shopName}:*\n\n`;
    
    orders.forEach((o, index) => {
      const methodText = pMethodMap[o.paymentMethod] || o.paymentMethod;
      const statusMap = {
        pending: '⏳ در انتظار پرداخت',
        paid: '✅ پرداخت شده',
        shipped: '🚚 ارسال شده',
        delivered: '📦 تحویل شده',
        cancelled: '❌ لغو شده',
      };
      const statusText = statusMap[o.status] || o.status;
      const dateText = o.createdAt.toLocaleDateString('fa-IR');

      orderListText += `${index + 1}. 🆔 سفارش: \`${o.id}\`
📅 تاریخ: ${dateText}
💰 مبلغ: *${o.finalAmount.toLocaleString('fa-IR')}* ${currencyText}
💳 پرداخت: ${methodText}
وضعیت: ${statusText}\n──────────────────\n`;
    });

    await sendTelegramMessage(chatId, orderListText);
  } catch (err) {
    console.error(`[ERROR] Database error during orders fetch:`, err.message);
    await sendTelegramMessage(chatId, `❌ خطای سیستمی در دریافت سفارشات.`);
  }
}

// Command: /disconnect / button "❌ قطع اتصال از ربات"
async function handleDisconnect(chatId) {
  try {
    const shopSettings = await prisma.shopSettings.findFirst({
      where: { telegramChatId: String(chatId) }
    });

    if (!shopSettings) {
      await sendTelegramMessage(chatId, `⚠️ اکانت شما به هیچ فروشگاهی متصل نیست.`);
      return;
    }

    // Unlink
    await prisma.shopSettings.update({
      where: { id: shopSettings.id },
      data: {
        telegramChatId: '',
        telegramOrderNotificationsEnabled: false
      }
    });

    console.log(`[INFO] Unlinked Telegram ChatID: ${chatId} from store "${shopSettings.shopName}"`);

    await sendTelegramMessage(chatId, `❌ *قطع اتصال موفقیت‌آمیز!*

ارتباط اکانت تلگرام شما با فروشگاه *${shopSettings.shopName}* قطع شد.`, null);
  } catch (err) {
    console.error(`[ERROR] Database error during disconnect:`, err.message);
    await sendTelegramMessage(chatId, `❌ خطای سیستمی در قطع اتصال.`);
  }
}

// Process single update/message
async function processUpdate(update) {
  // 1. Handle Inline Callback Queries (Step by step inputs)
  if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    // Answer Callback Query
    await answerCallbackQuery(callbackQuery.id);

    if (!userSessions[chatId]) {
      userSessions[chatId] = { state: 'IDLE' };
    }

    if (data === 'enter_phone') {
      userSessions[chatId].state = 'AWAITING_PHONE';
      userSessions[chatId].panelMessageId = messageId;
      await sendTelegramMessage(chatId, `📱 شماره موبایل خود را وارد کنید:`, null);
    } else if (data === 'enter_token') {
      userSessions[chatId].state = 'AWAITING_TOKEN';
      userSessions[chatId].panelMessageId = messageId;
      await sendTelegramMessage(chatId, `🔑 رمز اتصال خود را وارد کنید:`, null);
    } else if (data === 'confirm_link') {
      const session = userSessions[chatId];
      if (!session.phone || !session.token) {
        await sendTelegramMessage(chatId, `⚠️ لطفا ابتدا شماره و رمز را وارد کنید!`, null);
        return;
      }

      // Execute connection silently
      const success = await executeConnectionSilent(chatId, session.phone, session.token);
      if (success) {
        session.isConnected = true;
        session.isFailed = false;
        session.state = 'IDLE';
        
        // Update Panel to turn GREEN "🟢 متصل شد"
        await sendInlineConnectionPanel(chatId, messageId);

        // Get Shop Name
        const shopSettings = await prisma.shopSettings.findFirst({
          where: {
            contactPhone: { contains: normalizePhone(session.phone) },
            telegramIntegrationToken: session.token,
          }
        });
        const shopName = shopSettings ? shopSettings.shopName : 'فروشگاه شما';
        await sendTelegramMessage(chatId, `🎉 *اتصال با موفقیت برقرار شد!*\n🏪 فروشگاه: *${shopName}*`);
      } else {
        session.isFailed = true;
        // Update Panel to show "🔴 خطا در اتصال (تلاش مجدد)"
        await sendInlineConnectionPanel(chatId, messageId);
      }
    }
    return;
  }

  // 2. Handle Text Messages
  if (!update.message || !update.message.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text.trim();

  // Cancel any ongoing state
  if (text === '/cancel') {
    delete userSessions[chatId];
    await sendTelegramMessage(chatId, `❌ فرآیند لغو شد.`);
    return;
  }

  // Global actions
  if (text === '/start' || text === '/help') {
    await handleStart(chatId);
    return;
  }
  
  if (text === '📊 گزارش سفارشات') {
    await handleOrders(chatId);
    return;
  }
  
  if (text === '❌ قطع اتصال از ربات') {
    delete userSessions[chatId];
    await handleDisconnect(chatId);
    return;
  }

  if (text === '📥 اتصال به فروشگاه') {
    userSessions[chatId] = { state: 'IDLE' };
    await sendInlineConnectionPanel(chatId);
    return;
  }

  // Handle Interactive Inputs
  const session = userSessions[chatId];

  if (session && session.state === 'AWAITING_PHONE') {
    const normalizedInputPhone = normalizePhone(text);
    if (normalizedInputPhone.length !== 10 || !normalizedInputPhone.startsWith('9')) {
      await sendTelegramMessage(chatId, `❌ شماره موبایل نامعتبر است. لطفاً شماره صحیح ۱۱ رقمی بفرستید:`, null);
      return;
    }
    
    session.phone = text;
    session.state = 'IDLE';

    // Update connection panel
    await sendInlineConnectionPanel(chatId, session.panelMessageId);
    return;
  }

  if (session && session.state === 'AWAITING_TOKEN') {
    session.token = text;
    session.state = 'IDLE';

    // Update connection panel
    await sendInlineConnectionPanel(chatId, session.panelMessageId);
    return;
  }

  // Default Fallback
  await sendTelegramMessage(chatId, `⚠️ متوجه دستور شما نشدم. از دکمه‌های زیر چت استفاده کنید.`);
}

// Long-polling loop
async function startPolling() {
  console.log(`\n🤖 central Telegram Bot Long-Polling loop started successfully.`);
  console.log(`📡 Checking for updates... (Press Ctrl+C to stop)`);

  while (isPolling) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=10`;
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      
      if (!response.ok) {
        console.warn(`[WARN] Telegram API returned status ${response.status}. Retrying in 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      const data = await response.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await processUpdate(update);
        }
      }
    } catch (err) {
      if (err.name !== 'TimeoutError') {
        console.error(`[ERROR] Polling exception:`, err.message);
        console.log(`🕒 Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
}

// Main Runner Entrypoint
async function main() {
  console.log(`=================================================`);
  console.log(`🚀 [TELEGRAM BOT RUNNER] Starting central bot service`);
  console.log(`=================================================`);
  
  await checkSingleInstance();
  
  const ok = await loadBotToken();
  if (!ok) {
    console.error(`❌ Can't start bot: Token is missing or database unreachable.`);
    process.exit(1);
  }

  // Handle termination signals gracefully
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping bot service...');
    isPolling = false;
    try {
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    } catch (e) {}
    prisma.$disconnect();
    process.exit(0);
  });

  await startPolling();
}

main();
