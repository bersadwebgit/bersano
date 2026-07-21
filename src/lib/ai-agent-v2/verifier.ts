import { prisma } from '../prisma';

export interface VerificationResult {
  success: boolean;
  message: string;
  details: {
    stepId: string;
    verified: boolean;
    error?: string;
  }[];
}

export async function verifyChangeSet(changeSetId: string, shopId: string): Promise<VerificationResult> {
  const changeSet = await prisma.aiChangeSet.findFirst({
    where: { id: changeSetId, shopId },
    include: { steps: true },
  });

  if (!changeSet) {
    return { success: false, message: 'طرح تغییرات یافت نشد.', details: [] };
  }

  const details: VerificationResult['details'] = [];
  let overallSuccess = true;

  // Build reference map from completed create steps
  const refMap = new Map<string, string>();
  for (const step of changeSet.steps) {
    if (step.action === 'create' && step.recordId) {
      const afterVal = step.afterValue as Record<string, unknown> | null;
      if (afterVal && afterVal.tempRef && typeof afterVal.tempRef === 'string') {
        refMap.set(afterVal.tempRef, step.recordId);
      }
    }
  }

  for (const step of changeSet.steps) {
    if (step.status !== 'completed') {
      details.push({
        stepId: step.id,
        verified: false,
        error: `گام با وضعیت ${step.status} اجرا نشده است.`,
      });
      overallSuccess = false;
      continue;
    }

    try {
      if (step.action === 'create' || step.action === 'update') {
        if (!step.recordId) {
          throw new Error('شناسه رکورد ثبت نشده است.');
        }

        let dbRecord: Record<string, unknown> | null = null;
        if (step.modelName === 'Product') {
          const prod = await prisma.product.findFirst({
            where: { id: step.recordId, shopId },
          });
          dbRecord = prod ? (prod as unknown as Record<string, unknown>) : null;
        } else if (step.modelName === 'Category') {
          const cat = await prisma.category.findFirst({
            where: { id: step.recordId, shopId },
          });
          dbRecord = cat ? (cat as unknown as Record<string, unknown>) : null;
        } else if (step.modelName === 'ProductVariant') {
          const variant = await prisma.productVariant.findFirst({
            where: { id: step.recordId, shopId },
          });
          dbRecord = variant ? (variant as unknown as Record<string, unknown>) : null;
        } else if (step.modelName === 'Story') {
          const story = await prisma.story.findFirst({
            where: { id: step.recordId, shopId },
          });
          dbRecord = story ? (story as unknown as Record<string, unknown>) : null;
        } else if (step.modelName === 'DiscountCode') {
          const discount = await prisma.discountCode.findFirst({
            where: { id: step.recordId, shopId },
          });
          dbRecord = discount ? (discount as unknown as Record<string, unknown>) : null;
        }

        if (!dbRecord) {
          throw new Error(`رکورد با شناسه ${step.recordId} در دیتابیس یافت نشد.`);
        }

        // Verify fields match afterValue
        if (step.afterValue) {
          for (const [field, expectedVal] of Object.entries(step.afterValue as Record<string, unknown>)) {
            if (field === 'tempRef') continue;

            const actualVal = dbRecord[field];
            let cleanExpectedVal: any = expectedVal;
            if (typeof cleanExpectedVal === 'string') {
              if (refMap.has(cleanExpectedVal)) {
                cleanExpectedVal = refMap.get(cleanExpectedVal);
              } else {
                for (const [tempRef, realId] of refMap.entries()) {
                  if (cleanExpectedVal.includes(tempRef)) {
                    cleanExpectedVal = cleanExpectedVal.replace(new RegExp(tempRef, 'g'), realId);
                  }
                }
              }
            }

            if (actualVal instanceof Date && (typeof cleanExpectedVal === 'string' || cleanExpectedVal instanceof Date)) {
              if (actualVal.getTime() !== new Date(cleanExpectedVal as any).getTime()) {
                throw new Error(`محتوای فیلد تاریخ ${field} همخوانی ندارد.`);
              }
            } else if (JSON.stringify(actualVal) !== JSON.stringify(cleanExpectedVal)) {
              throw new Error(`محتوای فیلد ${field} با مقدار پیشنهادی همخوانی ندارد. انتظار می‌رفت: ${cleanExpectedVal}، اما ثبت شده: ${actualVal}`);
            }
          }
        }
      } else if (step.action === 'delete' && step.recordId) {
        let dbRecord: Record<string, unknown> | null = null;
        if (step.modelName === 'Product') {
          const prod = await prisma.product.findFirst({
            where: { id: step.recordId, shopId },
          });
          dbRecord = prod ? (prod as unknown as Record<string, unknown>) : null;
        } else if (step.modelName === 'Category') {
          const cat = await prisma.category.findFirst({
            where: { id: step.recordId, shopId },
          });
          dbRecord = cat ? (cat as unknown as Record<string, unknown>) : null;
        } else if (step.modelName === 'ProductVariant') {
          const variant = await prisma.productVariant.findFirst({
            where: { id: step.recordId, shopId },
          });
          dbRecord = variant ? (variant as unknown as Record<string, unknown>) : null;
        } else if (step.modelName === 'Story') {
          const story = await prisma.story.findFirst({
            where: { id: step.recordId, shopId },
          });
          dbRecord = story ? (story as unknown as Record<string, unknown>) : null;
        } else if (step.modelName === 'DiscountCode') {
          const discount = await prisma.discountCode.findFirst({
            where: { id: step.recordId, shopId },
          });
          dbRecord = discount ? (discount as unknown as Record<string, unknown>) : null;
        }

        if (dbRecord) {
          throw new Error(`رکورد با شناسه ${step.recordId} حذف نشده و همچنان در دیتابیس وجود دارد.`);
        }
      }

      details.push({
        stepId: step.id,
        verified: true,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'خطای تأیید ناشناخته';
      details.push({
        stepId: step.id,
        verified: false,
        error: errorMessage,
      });
      overallSuccess = false;
    }
  }

  return {
    success: overallSuccess,
    message: overallSuccess
      ? 'تمامی تغییرات با موفقیت تأیید شدند و صحت دیتابیس احراز شد.'
      : 'برخی از تغییرات با دیتابیس مغایرت دارند.',
    details,
  };
}
