import { prisma } from '../../../prisma';
import { Capability } from '../../contracts/capability';
import { CategoryCreateSchema, CategoryCreateInput } from './schemas';

export const categoryCreateCapability: Capability<CategoryCreateInput> = {
  name: 'category.create',
  persianLabel: 'ایجاد دسته‌بندی جدید',
  riskLevel: 'medium',
  requiredPermission: 'categories.create',
  inputSchema: CategoryCreateSchema,
  rollbackSupported: true,

  async preview(input) {
    return {
      summary: `ایجاد دسته‌بندی "${input.name}" با آدرس اسلاگ "${input.slug}".`,
      before: null,
      after: input as unknown as Record<string, unknown>,
    };
  },

  async execute(input, ctx) {
    const created = await prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
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
    const c = await prisma.category.findFirst({
      where: { id: recordId, shopId: ctx.shopId },
    });
    return !!c && c.name === expectedAfter.name;
  },

  async rollback(recordId) {
    await prisma.category.delete({
      where: { id: recordId },
    });
  },
};
export { categoryCreateCapability as create };
