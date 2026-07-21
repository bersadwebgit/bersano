import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { serializeError } from '@/lib/ai-agent-v2/contracts/api';
import { executePlan } from '@/lib/ai-agent-v2/services/execution-service';
import crypto from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const verification = await executePlan(id, payload.shopId, payload.id);

    return NextResponse.json({
      success: true,
      data: { verification, message: 'طرح تغییرات با موفقیت اجرا و صحت‌سنجی شد.' },
      requestId,
    });
  } catch (error: unknown) {
    return NextResponse.json(serializeError(error, requestId), { status: 500 });
  }
}
