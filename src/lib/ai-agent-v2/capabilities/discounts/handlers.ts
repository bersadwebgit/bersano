import { prisma } from '../../../prisma';
import { Capability } from '../../contracts/capability';
import { DiscountCreateSchema, DiscountCreateInput } from './schemas';

export const discountCreateCapability: Capability<DiscountCreateInput> = {
  name: 'discount.create',
  persianLabel: 'ایجاد کد تخفیف',
  riskLevel: 'medium',
  requiredPermission: 'discounts.create',
  inputSchema: DiscountCreateSchema,
  rollbackSupported: true,

  async preview(input) {
    return {
      summary: `ایجاد کد تخفیف جدید با عنوان "${input.code}" به میزان ${input.discount} ${input.type === 'percentage' ? '%' : 'تومان'}.`,
      before: null,
      after: input as unknown as Record<string, unknown>,
    };
  },

  async execute(input, ctx) {
    const created = await prisma.discountCode.create({
      data: {
        code: input.code,
        discount: input.discount,
        type: input.type,
        maxUses: input.maxUses,
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
    const d = await prisma.discountCode.findFirst({
      where: { id: recordId, shopId: ctx.shopId },
    });
    return !!d && d.code === expectedAfter.code;
  },

  async rollback(recordId) {
    await prisma.discountCode.delete({
      where: { id: recordId },
    });
  },
};
export { discountCreateCapability as create };
