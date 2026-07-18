import { prisma } from '../prisma';
import { RollbackError } from './errors';
import { Prisma } from '@prisma/client';

export async function rollbackChangeSet(changeSetId: string, shopId: string, notes?: string): Promise<void> {
  // 1. Fetch changeset and steps in reverse order
  const changeSet = await prisma.aiChangeSet.findFirst({
    where: { id: changeSetId, shopId },
    include: { steps: { orderBy: { order: 'desc' } } },
  });

  if (!changeSet) {
    throw new RollbackError('طرح تغییرات یافت نشد.');
  }

  if (changeSet.status !== 'completed') {
    throw new RollbackError(`امکان بازگردانی طرح با وضعیت فعلی (${changeSet.status}) وجود ندارد.`);
  }

  try {
    // 2. Revert steps inside a transaction
    await prisma.$transaction(async (tx) => {
      for (const step of changeSet.steps) {
        if (step.action === 'create' && step.recordId) {
          // Revert create by deleting the record
          if (step.modelName === 'Product') {
            await tx.product.delete({
              where: { id: step.recordId },
            });
          } else if (step.modelName === 'Category') {
            await tx.category.delete({
              where: { id: step.recordId },
            });
          }

          // Update step status
          await tx.aiChangeStep.update({
            where: { id: step.id },
            data: { status: 'rolled_back' },
          });
        } else if (step.action === 'update' && step.recordId && step.beforeValue) {
          // Revert update by restoring beforeValue
          if (step.modelName === 'Product') {
            await tx.product.update({
              where: { id: step.recordId },
              data: step.beforeValue as Record<string, unknown>,
            });
          } else if (step.modelName === 'Category') {
            await tx.category.update({
              where: { id: step.recordId },
              data: step.beforeValue as Record<string, unknown>,
            });
          }

          // Update step status
          await tx.aiChangeStep.update({
            where: { id: step.id },
            data: { status: 'rolled_back' },
          });
        } else if (step.action === 'delete' && step.beforeValue) {
          // Revert delete by recreating the record with beforeValue
          if (step.modelName === 'Product') {
            await tx.product.create({
              data: {
                ...(step.beforeValue as Record<string, unknown>),
                shopId,
              } as Prisma.ProductUncheckedCreateInput,
            });
          } else if (step.modelName === 'Category') {
            await tx.category.create({
              data: {
                ...(step.beforeValue as Record<string, unknown>),
                shopId,
              } as Prisma.CategoryUncheckedCreateInput,
            });
          }

          // Update step status
          await tx.aiChangeStep.update({
            where: { id: step.id },
            data: { status: 'rolled_back' },
          });
        }
      }
    });

    // 3. Update changeset status to rolled_back
    await prisma.aiChangeSet.update({
      where: { id: changeSetId },
      data: {
        status: 'rolled_back',
        rolledBackAt: new Date(),
        rollbackNotes: notes || 'توسط مدیر سیستم لغو و بازگردانی شد.',
      },
    });
  } catch (error: unknown) {
    console.error('[rollbackChangeSet] Rollback failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'خطا در بازگردانی تغییرات.';
    throw new RollbackError(errorMessage);
  }
}
