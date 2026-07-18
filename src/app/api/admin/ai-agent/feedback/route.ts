import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { serializeError } from '@/lib/ai-agent-v2/contracts/api';
import { submitFeedback } from '@/lib/ai-agent-v2/persistence/feedback-repository';
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

    const { changeSetId, rating, comment } = await request.json().catch(() => ({}));
    if (!changeSetId || !rating) {
      return NextResponse.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'اطلاعات بازخورد ناقص است.' },
        requestId,
      }, { status: 400 });
    }

    await submitFeedback(changeSetId, payload.id, rating, comment);

    return NextResponse.json({
      success: true,
      data: { message: 'بازخورد با موفقیت ثبت شد.' },
      requestId,
    });
  } catch (error: unknown) {
    return NextResponse.json(serializeError(error, requestId), { status: 500 });
  }
}
