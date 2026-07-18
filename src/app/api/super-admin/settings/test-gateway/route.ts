import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPlatformSession } from '@/lib/platform-auth';
import { getAiModel } from '@/lib/ai-model-resolver';
import { getIranDateTime } from '@/lib/openrouter-fetch';
import { executeChatCompletion, executeEmbedding } from '@/lib/ai-provider/client';

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
  let capabilities: any = null;

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
      try {
        const body = await res.json();
        capabilities = body.capabilities || null;
      } catch (e) {}
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
    capabilities,
  });
}

export async function POST() {
  const session = await verifyPlatformSession(['superadmin']);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chatModel = await getAiModel('simple');
  const embeddingModel = await getAiModel('embedding');

  const diagnostics: {
    chat: { success: boolean; model: string; latencyMs: number; error?: string; requestId?: string };
    embedding: { success: boolean; model: string; latencyMs: number; error?: string; dimension?: number };
    streaming: { success: boolean; model: string; latencyMs: number; error?: string };
  } = {
    chat: { success: false, model: chatModel, latencyMs: 0 },
    embedding: { success: false, model: embeddingModel, latencyMs: 0 },
    streaming: { success: false, model: chatModel, latencyMs: 0 },
  };

  const requestId = `test-${Math.random().toString(36).substring(7)}`;

  // 1. Diagnostics: Chat Completion Test
  const chatStartTime = Date.now();
  try {
    const chatResult = await executeChatCompletion({
      model: chatModel,
      messages: [{ role: 'user', content: 'respond with only "pong"' }],
      temperature: 0.1,
      max_tokens: 5,
      stream: false,
    }, {
      shopId: 'system',
      endpoint: 'test-gateway-chat',
      slot: 'simple',
      enableFallback: false,
      skipQuotaCheck: true,
      requestId,
    });

    diagnostics.chat.latencyMs = Date.now() - chatStartTime;

    if (chatResult instanceof Response) {
      diagnostics.chat.error = 'Response was streamed when non-streamed expected';
    } else if (chatResult.success) {
      diagnostics.chat.success = true;
      diagnostics.chat.requestId = requestId;
    } else {
      diagnostics.chat.error = chatResult.error || 'Unknown chat completion error';
    }
  } catch (err: any) {
    diagnostics.chat.latencyMs = Date.now() - chatStartTime;
    diagnostics.chat.error = err.message || String(err);
  }

  // 2. Diagnostics: Embedding Generation Test
  const embedStartTime = Date.now();
  try {
    const embedResult = await executeEmbedding({
      model: embeddingModel,
      input: 'test diagnostic query',
    });

    diagnostics.embedding.latencyMs = Date.now() - embedStartTime;
    diagnostics.embedding.success = true;
    diagnostics.embedding.dimension = embedResult.length;

    if (embedResult.length !== 1536) {
      diagnostics.embedding.success = false;
      diagnostics.embedding.error = `ابعاد وکتور تولید شده (${embedResult.length}) با نیاز سیستم (1536) همخوانی ندارد.`;
    }
  } catch (err: any) {
    diagnostics.embedding.latencyMs = Date.now() - embedStartTime;
    diagnostics.embedding.error = err.message || String(err);
  }

  // 3. Diagnostics: Streaming Test
  const streamStartTime = Date.now();
  try {
    const streamResult = await executeChatCompletion({
      model: chatModel,
      messages: [{ role: 'user', content: 'stream' }],
      temperature: 0.1,
      max_tokens: 5,
      stream: true,
    }, {
      shopId: 'system',
      endpoint: 'test-gateway-stream',
      slot: 'simple',
      enableFallback: false,
      skipQuotaCheck: true,
      requestId: `${requestId}-stream`,
    });

    diagnostics.streaming.latencyMs = Date.now() - streamStartTime;

    if (streamResult instanceof Response && streamResult.ok) {
      diagnostics.streaming.success = true;
      // Abort the fetch since we only want to test connection capability
      if (streamResult.body) {
        const reader = streamResult.body.getReader();
        reader.cancel().catch(() => {});
      }
    } else {
      diagnostics.streaming.error = 'Streaming connection failed or returned non-ok status';
    }
  } catch (err: any) {
    diagnostics.streaming.latencyMs = Date.now() - streamStartTime;
    diagnostics.streaming.error = err.message || String(err);
  }

  const { jalaliDate, time } = getIranDateTime();
  const checkedAt = `${jalaliDate} ساعت ${time}`;
  const overallSuccess = diagnostics.chat.success && diagnostics.embedding.success && diagnostics.streaming.success;

  // Save overall status to system settings
  const finalStatus = overallSuccess ? 'connected' : 'disconnected';
  await prisma.systemSetting.upsert({
    where: { key: 'ai_gateway_last_status' },
    update: { value: finalStatus },
    create: { key: 'ai_gateway_last_status', value: finalStatus },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'ai_gateway_last_checked_at' },
    update: { value: checkedAt },
    create: { key: 'ai_gateway_last_checked_at', value: checkedAt },
  });

  return NextResponse.json({
    success: overallSuccess,
    checkedAt,
    diagnostics,
  });
}
