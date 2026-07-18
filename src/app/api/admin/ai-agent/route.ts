import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { serializeError } from '@/lib/ai-agent-v2/contracts/api';
import { createAgentPlan } from '@/lib/ai-agent-v2/services/ai-agent-service';
import crypto from 'crypto';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'شما دسترسی لازم را ندارید.' },
        requestId,
      }, { status: 401 });
    }

    const { prompt } = await request.json().catch(() => ({}));
    if (!prompt) {
      return NextResponse.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'متن درخواست الزامی است.' },
        requestId,
      }, { status: 400 });
    }

    const result = await createAgentPlan({
      shopId: payload.shopId,
      prompt,
      actorId: payload.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
      requestId,
    });
  } catch (error: unknown) {
    return NextResponse.json(serializeError(error, requestId), { status: 500 });
  }
}
