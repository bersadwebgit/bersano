import { z } from 'zod';

export const CategoryCreateSchema = z.object({
  name: z.string().min(1, 'نام الزامی است'),
  slug: z.string().min(1, 'اسلاگ الزامی است'),
  description: z.string().optional(),
});

export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>;
