import { z } from 'zod';

export const DiscountCreateSchema = z.object({
  code: z.string().min(1, 'کد تخفیف الزامی است'),
  discount: z.number().positive('میزان تخفیف باید مثبت باشد'),
  type: z.enum(['percentage', 'flat'] as const).default('percentage'),
  maxUses: z.number().int().positive().optional(),
  isActive: z.boolean().optional().default(true),
});

export type DiscountCreateInput = z.infer<typeof DiscountCreateSchema>;
