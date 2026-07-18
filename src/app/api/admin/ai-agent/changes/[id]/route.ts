import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { serializeError } from '@/lib/ai-agent-v2/contracts/api';
import { getChangeSet } from '@/lib/ai-agent-v2/persistence/change-set-repository';
import { buildPlanPreview } from '@/lib/ai-agent-v2/planning/preview-builder';
import { ChangeSetDto } from '@/lib/ai-agent-v2/contracts/change-set';
import crypto from 'crypto';

export async function GET(
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
    const changeSet = await getChangeSet(id, payload.shopId);
    if (!changeSet) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'طرح تغییرات یافت نشد.' },
        requestId,
      }, { status: 404 });
    }

    const preview = await buildPlanPreview(changeSet as unknown as ChangeSetDto, payload.shopId);

    return NextResponse.json({
      success: true,
      data: { changeSet, preview },
      requestId,
    });
  } catch (error: unknown) {
    return NextResponse.json(serializeError(error, requestId), { status: 500 });
  }
}
