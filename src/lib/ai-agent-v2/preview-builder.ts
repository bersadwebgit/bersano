import { prisma } from '../prisma';
import { ChangeSetDto } from './schemas';

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
  name: 'نام دسته‌بندی',
  slug: 'اسلاگ دسته‌بندی',
};

export async function buildPlanPreview(plan: ChangeSetDto, shopId: string): Promise<PlanPreview> {
  const stepPreviews: StepPreview[] = [];

  for (const step of plan.steps) {
    let recordTitle = '';
    const diffs: DiffItem[] = [];

    if (step.action === 'create') {
      const afterValRecord = step.afterValue as Record<string, unknown> | undefined;
      recordTitle = (afterValRecord?.title as string) || (afterValRecord?.name as string) || 'رکورد جدید';
      
      if (step.afterValue) {
        for (const [field, afterVal] of Object.entries(step.afterValue)) {
          diffs.push({
            field,
            label: FIELD_LABELS[field] || field,
            before: null,
            after: afterVal,
          });
        }
      }
    } else if (step.action === 'update' && step.recordId) {
      // Fetch current value from DB
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
      }

      if (dbRecord && step.afterValue) {
        for (const [field, afterVal] of Object.entries(step.afterValue)) {
          const beforeVal = dbRecord[field];
          if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
            diffs.push({
              field,
              label: FIELD_LABELS[field] || field,
              before: beforeVal,
              after: afterVal,
            });
          }
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
