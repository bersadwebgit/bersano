import { prisma } from '../prisma';
import { ExecutionError } from './errors';
import { Prisma } from '@prisma/client';

export async function executeChangeSet(changeSetId: string, shopId: string): Promise<void> {
  // 1. Fetch changeset and steps
  const changeSet = await prisma.aiChangeSet.findFirst({
    where: { id: changeSetId, shopId },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  if (!changeSet) {
    throw new ExecutionError('طرح تغییرات یافت نشد.');
  }

  if (changeSet.status !== 'approved') {
    throw new ExecutionError(`امکان اجرای طرح با وضعیت فعلی (${changeSet.status}) وجود ندارد.`);
  }

  // 2. Update changeset status to executing
  await prisma.aiChangeSet.update({
    where: { id: changeSetId },
    data: { status: 'executing' },
  });

  try {
    // 3. Execute steps inside a transaction
    await prisma.$transaction(async (tx) => {
      for (const step of changeSet.steps) {
        if (step.action === 'create') {
          let createdRecord: { id: string };
          
          if (step.modelName === 'Product') {
            createdRecord = await tx.product.create({
              data: {
                ...(step.afterValue as Record<string, unknown>),
                shopId,
              } as Prisma.ProductUncheckedCreateInput,
            });
          } else if (step.modelName === 'Category') {
            createdRecord = await tx.category.create({
              data: {
                ...(step.afterValue as Record<string, unknown>),
                shopId,
              } as Prisma.CategoryUncheckedCreateInput,
            });
          } else {
            throw new Error(`مدل نامعتبر: ${step.modelName}`);
          }

          // Update step with the newly created record ID
          await tx.aiChangeStep.update({
            where: { id: step.id },
            data: {
              recordId: createdRecord.id,
              status: 'completed',
            },
          });
        } else if (step.action === 'update' && step.recordId) {
          const beforeValue: Record<string, unknown> = {};

          if (step.modelName === 'Product') {
            const current = await tx.product.findFirst({
              where: { id: step.recordId, shopId },
            });
            if (!current) throw new Error(`محصول با شناسه ${step.recordId} یافت نشد.`);
            
            // Extract only the fields we are modifying to store as beforeValue
            for (const key of Object.keys(step.afterValue as Record<string, unknown>)) {
              beforeValue[key] = (current as unknown as Record<string, unknown>)[key];
            }

            await tx.product.update({
              where: { id: step.recordId },
              data: step.afterValue as Record<string, unknown>,
            });
          } else if (step.modelName === 'Category') {
            const current = await tx.category.findFirst({
              where: { id: step.recordId, shopId },
            });
            if (!current) throw new Error(`دسته‌بندی با شناسه ${step.recordId} یافت نشد.`);

            for (const key of Object.keys(step.afterValue as Record<string, unknown>)) {
              beforeValue[key] = (current as unknown as Record<string, unknown>)[key];
            }

            await tx.category.update({
              where: { id: step.recordId },
              data: step.afterValue as Record<string, unknown>,
            });
          } else {
            throw new Error(`مدل نامعتبر: ${step.modelName}`);
          }

          // Update step with beforeValue
          await tx.aiChangeStep.update({
            where: { id: step.id },
            data: {
              beforeValue,
              status: 'completed',
            },
          });
        } else if (step.action === 'delete' && step.recordId) {
          let beforeValue: Record<string, unknown> | null = null;

          if (step.modelName === 'Product') {
            const current = await tx.product.findFirst({
              where: { id: step.recordId, shopId },
            });
            if (!current) throw new Error(`محصول با شناسه ${step.recordId} یافت نشد.`);
            
            beforeValue = current as unknown as Record<string, unknown>;

            await tx.product.delete({
              where: { id: step.recordId },
            });
          } else if (step.modelName === 'Category') {
            const current = await tx.category.findFirst({
              where: { id: step.recordId, shopId },
            });
            if (!current) throw new Error(`دسته‌بندی با شناسه ${step.recordId} یافت نشد.`);

            beforeValue = current as unknown as Record<string, unknown>;

            await tx.category.delete({
              where: { id: step.recordId },
            });
          } else {
            throw new Error(`مدل نامعتبر: ${step.modelName}`);
          }

          // Update step with beforeValue
          await tx.aiChangeStep.update({
            where: { id: step.id },
            data: {
              beforeValue,
              status: 'completed',
            },
          });
        }
      }
    });

    // 4. Update changeset status to completed
    await prisma.aiChangeSet.update({
      where: { id: changeSetId },
      data: {
        status: 'completed',
        executedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    console.error('[executeChangeSet] Execution failed, rolling back:', error);

    const errorMessage = error instanceof Error ? error.message : 'خطای ناشناخته در اجرا';

    // 5. Update changeset status to failed
    await prisma.aiChangeSet.update({
      where: { id: changeSetId },
      data: { status: 'failed' },
    });

    // Update failed steps
    await prisma.aiChangeStep.updateMany({
      where: { changeSetId, status: 'pending' },
      data: {
        status: 'failed',
        errorMessage,
      },
    });

    throw new ExecutionError(errorMessage);
  }
}
