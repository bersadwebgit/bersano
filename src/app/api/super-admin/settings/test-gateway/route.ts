import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPlatformSession } from '@/lib/platform-auth';
import { getAiModel } from '@/lib/ai-model-resolver';
import { getIranDateTime } from '@/lib/openrouter-fetch';

export async function GET() {
  const session = await verifyPlatformSession(['superadmin']);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gatewayUrl = process.env.AI_GATEWAY_URL;
  if (!gatewayUrl) {
    return NextResponse.json({ success: false, error: 'آدرس API واسط تنظیم نشده است.' }, { status: 400 });
  }

  const gatewayToken = process.env.AI_GATEWAY_TOKEN || '';
  let status = 'disconnected';
  let safeErrorCategory = '';

  try {
    const res = await fetch(gatewayUrl, {
      method: 'GET',
      headers: {
        'X-Gateway-Token': gatewayToken,
      },
      signal: AbortSignal.timeout(5000), // 5-second timeout for free health check
    });

    if (res.ok) {
      status = 'connected';
    } else {
      status = 'disconnected';
      if (res.status === 401) {
        safeErrorCategory = 'احراز هویت نامعتبر (401)';
      } else if (res.status === 403) {
        safeErrorCategory = 'عدم دسترسی (403)';
      } else if (res.status === 429) {
        safeErrorCategory = 'محدودیت درخواست (429)';
      } else if (res.status >= 500) {
        safeErrorCategory = 'خطای سرور واسط (5xx)';
      } else {
        safeErrorCategory = `خطای ${res.status}`;
      }
    }
  } catch (err: any) {
    status = 'disconnected';
    const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
    safeErrorCategory = isTimeout ? 'قطع ارتباط (Timeout)' : 'خطای شبکه';
  }

  const { jalaliDate, time } = getIranDateTime();
  const checkedAt = `${jalaliDate} ساعت ${time}`;

  // Save to system settings
  await prisma.systemSetting.upsert({
    where: { key: 'ai_gateway_last_status' },
    update: { value: status },
    create: { key: 'ai_gateway_last_status', value: status },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'ai_gateway_last_checked_at' },
    update: { value: checkedAt },
    create: { key: 'ai_gateway_last_checked_at', value: checkedAt },
  });

  return NextResponse.json({
    success: status === 'connected',
    status,
    checkedAt,
    safeErrorCategory,
  });
}

export async function POST() {
  const session = await verifyPlatformSession(['superadmin']);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gatewayUrl = process.env.AI_GATEWAY_URL;
  const gatewayToken = process.env.AI_GATEWAY_TOKEN;
  if (!gatewayUrl || !gatewayToken) {
    return NextResponse.json({ success: false, error: 'تنظیمات واسط کاربری هوش مصنوعی ناقص است (URL یا توکن وجود ندارد).' }, { status: 400 });
  }

  const model = await getAiModel('simple');
  let status = 'disconnected';
  let safeErrorCategory = '';

  try {
    const payload = {
      model,
      messages: [{ role: 'user', content: 'سلام، لطفاً فقط بنویس pong' }],
      temperature: 0.1,
      max_tokens: 10,
      stream: false,
    };

    const res = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Gateway-Token': gatewayToken,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000), // 15-second timeout for model test
    });

    if (res.ok) {
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        status = 'connected';
      } else if (data.error?.message) {
        status = 'disconnected';
        safeErrorCategory = `خطای ارائه‌دهنده: ${data.error.message.slice(0, 100)}`;
      } else {
        status = 'disconnected';
        safeErrorCategory = 'پاسخ نامعتبر از مدل';
      }
    } else {
      status = 'disconnected';
      if (res.status === 401) {
        safeErrorCategory = 'احراز هویت API واسط نامعتبر است.';
      } else if (res.status === 403) {
        safeErrorCategory = 'درخواست توسط سیاست امنیتی سرویس هوش مصنوعی رد شد.';
      } else if (res.status === 429) {
        safeErrorCategory = 'تعداد درخواست‌های سرویس هوش مصنوعی موقتاً محدود شده است.';
      } else if (res.status >= 500) {
        safeErrorCategory = 'سرویس هوش مصنوعی موقتاً در دسترس نیست.';
      } else {
        safeErrorCategory = `خطای ${res.status}`;
      }
    }
  } catch (err: any) {
    status = 'disconnected';
    const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
    safeErrorCategory = isTimeout ? 'پاسخ سرویس هوش مصنوعی بیش از حد طول کشید.' : 'خطای اتصال به سرور واسط';
  }

  const { jalaliDate, time } = getIranDateTime();
  const checkedAt = `${jalaliDate} ساعت ${time}`;

  // Save to system settings
  await prisma.systemSetting.upsert({
    where: { key: 'ai_gateway_last_status' },
    update: { value: status },
    create: { key: 'ai_gateway_last_status', value: status },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'ai_gateway_last_checked_at' },
    update: { value: checkedAt },
    create: { key: 'ai_gateway_last_checked_at', value: checkedAt },
  });

  return NextResponse.json({
    success: status === 'connected',
    status,
    checkedAt,
    safeErrorCategory,
  });
}