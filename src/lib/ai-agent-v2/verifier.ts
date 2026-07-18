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
        }

        if (!dbRecord) {
          throw new Error(`رکورد با شناسه ${step.recordId} در دیتابیس یافت نشد.`);
        }

        // Verify fields match afterValue
        if (step.afterValue) {
          for (const [field, expectedVal] of Object.entries(step.afterValue as Record<string, unknown>)) {
            const actualVal = dbRecord[field];
            if (JSON.stringify(actualVal) !== JSON.stringify(expectedVal)) {
              throw new Error(`محتوای فیلد ${field} با مقدار پیشنهادی همخوانی ندارد. انتظار می‌رفت: ${expectedVal}، اما ثبت شده: ${actualVal}`);
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
