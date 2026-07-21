import { z } from 'zod';

export const ChangeStepSchema = z.object({
  id: z.string().optional(),
  action: z.enum(['create', 'update', 'delete'] as const),
  modelName: z.string(),
  recordId: z.string().nullable().optional(),
  beforeValue: z.record(z.string(), z.any()).nullable().optional(),
  afterValue: z.record(z.string(), z.any()).nullable().optional(),
  order: z.number().default(0),
  status: z.enum(['pending', 'completed', 'failed', 'rolled_back'] as const).default('pending'),
});

export const ChangeSetSchema = z.object({
  id: z.string().optional(),
  shopId: z.string(),
  prompt: z.string(),
  status: z.enum([
    'draft', 'planning', 'clarification_required', 'preview_ready',
    'awaiting_approval', 'approved', 'executing', 'executed', 'verified',
    'stale', 'partially_failed', 'failed', 'cancelled', 'rejected',
    'rolling_back', 'rolled_back', 'rollback_failed', 'expired'
  ] as const).default('draft'),
  riskLevel: z.enum(['low', 'medium', 'high'] as const),
  riskAnalysis: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  steps: z.array(ChangeStepSchema),
  approvalHash: z.string().nullable().optional(),
  planVersion: z.number().default(1),
});

export type ChangeStepDto = z.infer<typeof ChangeStepSchema>;
export type ChangeSetDto = z.infer<typeof ChangeSetSchema>;
