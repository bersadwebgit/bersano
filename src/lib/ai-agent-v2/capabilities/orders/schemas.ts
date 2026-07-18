import { z } from 'zod';

export const OrderUpdateStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled'] as const),
});

export type OrderUpdateStatusInput = z.infer<typeof OrderUpdateStatusSchema>;
