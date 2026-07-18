import { z } from 'zod';

export const BlogPostCreateSchema = z.object({
  title: z.string().min(1, 'عنوان مقاله الزامی است'),
  slug: z.string().min(1, 'اسلاگ الزامی است'),
  content: z.string().min(1, 'محتوای مقاله الزامی است'),
  summary: z.string().optional(),
  status: z.enum(['draft', 'published'] as const).default('draft'),
});

export type BlogPostCreateInput = z.infer<typeof BlogPostCreateSchema>;
