import { Capability } from './types';

export const CAPABILITIES: Record<string, Capability> = {
  manage_products: {
    name: 'manage_products',
    description: 'ایجاد، ویرایش یا حذف محصولات فروشگاه (شامل عنوان، قیمت، موجودی، برند، تخفیف و ویژگی‌های عمده‌فروشی)',
    riskLevel: 'medium',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'update', 'delete'] },
        productId: { type: 'string', nullable: true },
        data: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            discount: { type: 'number' },
            stock: { type: 'number' },
            brand: { type: 'string' },
            categoryId: { type: 'string' },
            isActive: { type: 'boolean' },
            isSpecial: { type: 'boolean' },
          },
        },
      },
      required: ['action'],
    },
  },
  manage_categories: {
    name: 'manage_categories',
    description: 'ایجاد، ویرایش یا حذف دسته‌بندی‌های محصولات فروشگاه',
    riskLevel: 'medium',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'update', 'delete'] },
        categoryId: { type: 'string', nullable: true },
        data: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
      required: ['action'],
    },
  },
  manage_orders: {
    name: 'manage_orders',
    description: 'مشاهده، تغییر وضعیت یا لغو سفارشات ثبت شده مشتریان',
    riskLevel: 'high',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['update_status', 'cancel'] },
        orderId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'cancelled'] },
      },
      required: ['action', 'orderId'],
    },
  },
};

export function getCapability(name: string): Capability | null {
  return CAPABILITIES[name] || null;
}

export function getAllCapabilities(): Capability[] {
  return Object.values(CAPABILITIES);
}
