import { z } from 'zod';
import { RiskLevel } from '../types';

export interface CapabilityContext {
  shopId: string;
  actorId: string;
}

export interface Capability<TInput = unknown> {
  name: string;
  persianLabel: string;
  riskLevel: RiskLevel;
  requiredPermission: string;
  inputSchema: z.ZodSchema<TInput>;
  allowedFields?: string[];
  rollbackSupported: boolean;

  preview(input: TInput, ctx: CapabilityContext): Promise<{
    summary: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown>;
  }>;

  execute(input: TInput, ctx: CapabilityContext): Promise<{
    recordId: string;
    beforeValue: Record<string, unknown> | null;
    afterValue: Record<string, unknown>;
  }>;

  verify(recordId: string, expectedAfter: Record<string, unknown>, ctx: CapabilityContext): Promise<boolean>;

  rollback(recordId: string, beforeValue: Record<string, unknown> | null, ctx: CapabilityContext): Promise<void>;
}
