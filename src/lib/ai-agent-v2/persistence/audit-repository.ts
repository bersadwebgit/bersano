import { prisma } from '../../prisma';

export interface AuditLogInput {
  requestId: string;
  changeSetId?: string | null;
  shopId: string;
  actorId: string;
  capability?: string | null;
  durationMs?: number | null;
  status: string;
  details?: string | null;
}

export async function logAuditEntry(input: AuditLogInput): Promise<void> {
  try {
    await prisma.aiUsage.create({
      data: {
        shopId: input.shopId,
        endpoint: input.capability || 'agent-v2',
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        model: 'router',
        monthKey: '2026-07',
        operationType: 'chat',
        idempotencyKey: `server:${input.shopId}:chat:${input.requestId}-audit`,
        attemptIndex: 0,
      },
    });
  } catch (error) {
    console.error('[logAuditEntry] Error saving usage log:', error);
  }
}
