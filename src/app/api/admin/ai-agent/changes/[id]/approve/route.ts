import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { serializeError } from '@/lib/ai-agent-v2/contracts/api';
import { approveAgentPlan } from '@/lib/ai-agent-v2/services/approval-service';
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
    const { notes } = await request.json().catch(() => ({}));

    const approvalHash = await approveAgentPlan({
      changeSetId: id,
      shopId: payload.shopId,
      userId: payload.id,
      approved: true,
      notes: notes || 'تأیید شده توسط مدیر',
    });

    return NextResponse.json({
      success: true,
      data: { approvalHash, message: 'طرح تغییرات با موفقیت تأیید شد.' },
      requestId,
    });
  } catch (error: unknown) {
    return NextResponse.json(serializeError(error, requestId), { status: 500 });
  }
}
