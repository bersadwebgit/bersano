import { z } from 'zod';

export const ChangeStepSchema = z.object({
  action: z.enum(['create', 'update', 'delete']),
  modelName: z.string(),
  recordId: z.string().nullable().optional(),
  beforeValue: z.record(z.string(), z.any()).nullable().optional(),
  afterValue: z.record(z.string(), z.any()).nullable().optional(),
  order: z.number().default(0),
});

export const ChangeSetSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high']),
  riskAnalysis: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  steps: z.array(ChangeStepSchema),
});

export type ChangeStepDto = z.infer<typeof ChangeStepSchema>;
export type ChangeSetDto = z.infer<typeof ChangeSetSchema>;
