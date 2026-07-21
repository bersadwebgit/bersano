import { prisma } from '../../prisma';
import { ChangeSetDto } from '../contracts/change-set';
import { collectTempRefLabels, normalizeAfterValueForDisplay } from './canonical';

export interface DiffItem {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
}

export interface StepPreview {
  action: 'create' | 'update' | 'delete';
  modelName: string;
  recordId?: string | null;
  recordTitle: string;
  diffs: DiffItem[];
}

export interface PlanPreview {
  riskLevel: 'low' | 'medium' | 'high';
  riskAnalysis: string;
  summary: string;
  steps: StepPreview[];
}

const FIELD_LABELS: Record<string, string> = {
  title: 'عنوان',
  description: 'توضیحات',
  price: 'قیمت',
  discount: 'تخفیف',
  stock: 'موجودی',
  brand: 'برند',
  categoryId: 'دسته‌بندی',
  isActive: 'وضعیت فعال بودن',
  isSpecial: 'فروش ویژه',
  name: 'نام',
  slug: 'اسلاگ',
  
  // ProductVariant
  productId: 'شناسه محصول',
  colorCode: 'کد رنگ',
  optionsJson: 'مشخصات تنوع (JSON)',
  sku: 'شناسه انبار (SKU)',
  
  // Story
  thumbnailUrl: 'تصویر بندانگشتی',
  mediaUrl: 'آدرس مدیا',
  mediaType: 'نوع مدیا',
  text: 'متن استوری',
  linkUrl: 'آدرس لینک',
  linkText: 'متن دکمه لینک',
  expiresAt: 'تاریخ انقضا',
  
  // DiscountCode
  code: 'کد تخفیف',
  type: 'نوع تخفیف',
  startDate: 'تاریخ شروع',
};

export async function buildPlanPreview(plan: ChangeSetDto, shopId: string): Promise<PlanPreview> {
  const stepPreviews: StepPreview[] = [];

  // AI-018: reflect exactly what the executor persists — strip internal directives (tempRef) and
  // resolve in-plan temporary references to friendly labels.
  const tempRefLabels = collectTempRefLabels(plan.steps);

  for (const step of plan.steps) {
    let recordTitle = '';
    const diffs: DiffItem[] = [];

    if (step.action === 'create') {
      const afterValRecord = step.afterValue as Record<string, unknown> | undefined;
      recordTitle = (afterValRecord?.title as string) || (afterValRecord?.name as string) || (afterValRecord?.code as string) || 'رکورد جدید';

      const normalizedAfter = normalizeAfterValueForDisplay(step.afterValue, tempRefLabels);
      for (const [field, afterVal] of Object.entries(normalizedAfter)) {
        diffs.push({
          field,
          label: FIELD_LABELS[field] || field,
          before: null,
          after: afterVal,
        });
      }
    } else if (step.action === 'update' && step.recordId) {
      let dbRecord: Record<string, unknown> | null = null;
      if (step.modelName === 'Product') {
        const prod = await prisma.product.findFirst({
          where: { id: step.recordId, shopId },
        });
        dbRecord = prod ? (prod as unknown as Record<string, unknown>) : null;
        recordTitle = prod?.title || 'محصول';
      } else if (step.modelName === 'Category') {
        const cat = await prisma.category.findFirst({
          where: { id: step.recordId, shopId },
        });
        dbRecord = cat ? (cat as unknown as Record<string, unknown>) : null;
        recordTitle = cat?.name || 'دسته‌بندی';
      } else if (step.modelName === 'ProductVariant') {
        const variant = await prisma.productVariant.findFirst({
          where: { id: step.recordId, shopId },
        });
        dbRecord = variant ? (variant as unknown as Record<string, unknown>) : null;
        recordTitle = variant?.name || 'تنوع محصول';
      } else if (step.modelName === 'Story') {
        const story = await prisma.story.findFirst({
          where: { id: step.recordId, shopId },
        });
        dbRecord = story ? (story as unknown as Record<string, unknown>) : null;
        recordTitle = story?.title || 'استوری';
      } else if (step.modelName === 'DiscountCode') {
        const discount = await prisma.discountCode.findFirst({
          where: { id: step.recordId, shopId },
        });
        dbRecord = discount ? (discount as unknown as Record<string, unknown>) : null;
        recordTitle = discount?.code || 'کد تخفیف';
      }

      // AI-018: prefer the canonical before-snapshot stored at plan time (stable across requests);
      // fall back to the live record only when no snapshot exists (legacy change sets).
      const snapshot = step.beforeValue as Record<string, unknown> | null;
      const normalizedAfter = normalizeAfterValueForDisplay(step.afterValue, tempRefLabels);
      for (const [field, afterVal] of Object.entries(normalizedAfter)) {
        const beforeVal = snapshot
          ? (snapshot[field] ?? null)
          : (dbRecord ? (dbRecord[field] ?? null) : null);
        if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
          diffs.push({
            field,
            label: FIELD_LABELS[field] || field,
            before: beforeVal,
            after: afterVal,
          });
        }
      }
    } else if (step.action === 'delete' && step.recordId) {
      if (step.modelName === 'Product') {
        const prod = await prisma.product.findFirst({
          where: { id: step.recordId, shopId },
          select: { title: true },
        });
        recordTitle = prod?.title || 'محصول';
      } else if (step.modelName === 'Category') {
        const cat = await prisma.category.findFirst({
          where: { id: step.recordId, shopId },
          select: { name: true },
        });
        recordTitle = cat?.name || 'دسته‌بندی';
      } else if (step.modelName === 'ProductVariant') {
        const variant = await prisma.productVariant.findFirst({
          where: { id: step.recordId, shopId },
          select: { name: true },
        });
        recordTitle = variant?.name || 'تنوع محصول';
      } else if (step.modelName === 'Story') {
        const story = await prisma.story.findFirst({
          where: { id: step.recordId, shopId },
          select: { title: true },
        });
        recordTitle = story?.title || 'استوری';
      } else if (step.modelName === 'DiscountCode') {
        const discount = await prisma.discountCode.findFirst({
          where: { id: step.recordId, shopId },
          select: { code: true },
        });
        recordTitle = discount?.code || 'کد تخفیف';
      }
    }

    stepPreviews.push({
      action: step.action,
      modelName: step.modelName,
      recordId: step.recordId,
      recordTitle,
      diffs,
    });
  }

  return {
    riskLevel: plan.riskLevel,
    riskAnalysis: plan.riskAnalysis || '',
    summary: plan.summary || '',
    steps: stepPreviews,
  };
}
export { buildPlanPreview as generatePlanPreview };
