import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { serializeError } from '@/lib/ai-agent-v2/contracts/api';
import { listChangeSets } from '@/lib/ai-agent-v2/persistence/change-set-repository';
import crypto from 'crypto';

export async function GET(request: Request) {
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

    const changeSets = await listChangeSets(payload.shopId);

    return NextResponse.json({
      success: true,
      data: { changeSets },
      requestId,
    });
  } catch (error: unknown) {
    return NextResponse.json(serializeError(error, requestId), { status: 500 });
  }
}
