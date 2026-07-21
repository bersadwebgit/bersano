import { z } from 'zod';

export const ProductCreateSchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است'),
  description: z.string().optional(),
  price: z.number().positive('قیمت باید مثبت باشد'),
  discount: z.number().min(0).max(100).optional().default(0),
  stock: z.number().int().nonnegative('موجودی انبار نمی‌تواند منفی باشد'),
  brand: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;

export const ProductUpdateSchema = z.object({
  productId: z.string(),
  data: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    discount: z.number().min(0).max(100).optional(),
    stock: z.number().int().nonnegative().optional(),
    brand: z.string().optional(),
    categoryId: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});
