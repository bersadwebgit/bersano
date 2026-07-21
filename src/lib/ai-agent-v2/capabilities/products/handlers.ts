import { prisma } from '../../../prisma';
import { Capability } from '../../contracts/capability';
import { ProductCreateSchema, ProductCreateInput } from './schemas';

export const productCreateCapability: Capability<ProductCreateInput> = {
  name: 'product.create',
  persianLabel: 'ایجاد محصول جدید',
  riskLevel: 'medium',
  requiredPermission: 'products.create',
  inputSchema: ProductCreateSchema,
  rollbackSupported: true,

  async preview(input) {
    return {
      summary: `ایجاد محصول "${input.title}" با قیمت ${input.price} تومان و موجودی ${input.stock} عدد.`,
      before: null,
      after: input as unknown as Record<string, unknown>,
    };
  },

  async execute(input, ctx) {
    const created = await prisma.product.create({
      data: {
        title: input.title,
        description: input.description,
        price: input.price,
        discount: input.discount,
        stock: input.stock,
        brand: input.brand,
        categoryId: input.categoryId,
        isActive: input.isActive,
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
    const p = await prisma.product.findFirst({
      where: { id: recordId, shopId: ctx.shopId },
    });
    return !!p && p.title === expectedAfter.title;
  },

  async rollback(recordId) {
    await prisma.product.delete({
      where: { id: recordId },
    });
  },
};
export { productCreateCapability as create };
