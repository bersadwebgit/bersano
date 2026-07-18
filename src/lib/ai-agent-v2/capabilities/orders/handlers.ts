import { prisma } from '../../../prisma';
import { Capability } from '../../contracts/capability';
import { OrderUpdateStatusSchema, OrderUpdateStatusInput } from './schemas';

export const orderUpdateStatusCapability: Capability<OrderUpdateStatusInput> = {
  name: 'order.update_status',
  persianLabel: 'تغییر وضعیت سفارش',
  riskLevel: 'high',
  requiredPermission: 'orders.update',
  inputSchema: OrderUpdateStatusSchema,
  rollbackSupported: true,

  async preview(input) {
    return {
      summary: `تغییر وضعیت سفارش #${input.orderId} به "${input.status}".`,
      before: null,
      after: { status: input.status },
    };
  },

  async execute(input, ctx) {
    const current = await prisma.order.findFirst({
      where: { id: input.orderId, shopId: ctx.shopId },
    });
    if (!current) throw new Error('سفارش یافت نشد.');

    const updated = await prisma.order.update({
      where: { id: input.orderId },
      data: { status: input.status },
    });

    return {
      recordId: updated.id,
      beforeValue: { status: current.status },
      afterValue: { status: updated.status },
    };
  },

  async verify(recordId, expectedAfter, ctx) {
    const o = await prisma.order.findFirst({
      where: { id: recordId, shopId: ctx.shopId },
    });
    return !!o && o.status === expectedAfter.status;
  },

  async rollback(recordId, beforeValue) {
    if (!beforeValue) return;
    await prisma.order.update({
      where: { id: recordId },
      data: { status: beforeValue.status as string },
    });
  },
};
export { orderUpdateStatusCapability as updateStatus };
