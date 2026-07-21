import { redactSecrets } from '../core/secret-redaction';

export interface StructuredLog {
  requestId: string;
  changeSetId?: string;
  operationId?: string;
  shopId: string;
  actorId: string;
  capability?: string;
  intent?: string;
  confidence?: number;
  riskLevel?: string;
  modelSlot?: string;
  durationMs?: number;
  status: string;
  verificationResult?: string;
  rollbackResult?: string;
}

export function logStructured(log: StructuredLog, message: string): void {
  const redactedLog = redactSecrets(log);
  console.log(`[AI-AGENT-V2] [${log.status.toUpperCase()}] [Req: ${log.requestId}] ${message}`, JSON.stringify(redactedLog));
}
