import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queueManager } from '@/lib/queue'

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin')
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobs = await queueManager.getJobs(payload.shopId)
    return NextResponse.json({ jobs })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
