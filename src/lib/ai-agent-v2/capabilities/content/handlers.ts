import { prisma } from '../../../prisma';
import { Capability } from '../../contracts/capability';
import { BlogPostCreateSchema, BlogPostCreateInput } from './schemas';

export const blogPostCreateCapability: Capability<BlogPostCreateInput> = {
  name: 'blog.create_draft',
  persianLabel: 'ایجاد پیش‌نویس مقاله',
  riskLevel: 'medium',
  requiredPermission: 'blog.create',
  inputSchema: BlogPostCreateSchema,
  rollbackSupported: true,

  async preview(input) {
    return {
      summary: `ایجاد پیش‌نویس مقاله جدید با عنوان "${input.title}" و آدرس اسلاگ "${input.slug}".`,
      before: null,
      after: input as unknown as Record<string, unknown>,
    };
  },

  async execute(input, ctx) {
    const created = await prisma.blogPost.create({
      data: {
        title: input.title,
        slug: input.slug,
        content: input.content,
        summary: input.summary,
        status: input.status,
        shopId: ctx.shopId,
      },
    });
    return {
      recordId: created.id,
      beforeValue: null,
      afterValue: created as unknown as Record<string, unknown>,
    };
  },

  async verify(recordId, expectedAfter, ctx) {
    const b = await prisma.blogPost.findFirst({
      where: { id: recordId, shopId: ctx.shopId },
    });
    return !!b && b.title === expectedAfter.title;
  },

  async rollback(recordId) {
    await prisma.blogPost.delete({
      where: { id: recordId },
    });
  },
};
export { blogPostCreateCapability as createDraft };
