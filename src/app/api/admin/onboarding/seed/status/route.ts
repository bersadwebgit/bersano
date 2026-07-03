import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSeedJobStatus } from '@/lib/ai/store-seed/profile';

export async function GET(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const shopId = decoded.shopId;

    const job = await getSeedJobStatus(shopId);

    if (!job) {
      return NextResponse.json({ status: 'idle', progress: 0 });
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      phase: job.phase,
      progress: job.progress,
      error: job.error
    });
  } catch (error: any) {
    console.error('[API Status] Error:', error);
    return NextResponse.json({ error: error?.message || 'خطایی در دریافت وضعیت رخ داد.' }, { status: 500 });
  }
}
