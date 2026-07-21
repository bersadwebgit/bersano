import { prisma } from '../prisma';
// AI-029 (Unified Error Contract): canonical error source is ./contracts/errors (was ./errors).
import { RollbackError } from './contracts/errors';
import { Prisma } from '@prisma/client';
import { validateTransition, ChangeSetState } from './core/state-machine';

export async function rollbackChangeSet(changeSetId: string, shopId: string, notes?: string): Promise<void> {
  // 1. Fetch changeset and steps in reverse order
  const changeSet = await prisma.aiChangeSet.findFirst({
    where: { id: changeSetId, shopId },
    include: { steps: { orderBy: { order: 'desc' } } },
  });

  if (!changeSet) {
    throw new RollbackError('طرح تغییرات یافت نشد.');
  }

  // AI-003: Rollback is allowed from any state the central state machine permits transitioning
  // to 'rolling_back' (i.e. verified, partially_failed, failed). This replaces the previous
  // hardcoded check for the legacy 'completed' status which made rollback impossible after a
  // successful execute+verify.
  try {
    validateTransition(changeSet.status as ChangeSetState, 'rolling_back');
  } catch {
    throw new RollbackError(`امکان بازگردانی طرح با وضعیت فعلی (${changeSet.status}) وجود ندارد.`);
  }

  // Move to the transient 'rolling_back' state per the central state machine.
  await prisma.aiChangeSet.update({
    where: { id: changeSetId },
    data: { status: 'rolling_back' },
  });

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
          } else if (step.modelName === 'ProductVariant') {
            await tx.productVariant.delete({
              where: { id: step.recordId },
            });
          } else if (step.modelName === 'Story') {
            await tx.story.delete({
              where: { id: step.recordId },
            });
          } else if (step.modelName === 'DiscountCode') {
            await tx.discountCode.delete({
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
          } else if (step.modelName === 'ProductVariant') {
            await tx.productVariant.update({
              where: { id: step.recordId },
              data: step.beforeValue as Record<string, unknown>,
            });
          } else if (step.modelName === 'Story') {
            await tx.story.update({
              where: { id: step.recordId },
              data: step.beforeValue as Record<string, unknown>,
            });
          } else if (step.modelName === 'DiscountCode') {
            await tx.discountCode.update({
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
          } else if (step.modelName === 'ProductVariant') {
            await tx.productVariant.create({
              data: {
                ...(step.beforeValue as Record<string, unknown>),
                shopId,
              } as Prisma.ProductVariantUncheckedCreateInput,
            });
          } else if (step.modelName === 'Story') {
            await tx.story.create({
              data: {
                ...(step.beforeValue as Record<string, unknown>),
                shopId,
              } as Prisma.StoryUncheckedCreateInput,
            });
          } else if (step.modelName === 'DiscountCode') {
            await tx.discountCode.create({
              data: {
                ...(step.beforeValue as Record<string, unknown>),
                shopId,
              } as Prisma.DiscountCodeUncheckedCreateInput,
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
    // AI-003: mark the terminal 'rollback_failed' state (valid transition from 'rolling_back')
    // so the change set never remains stuck in the transient 'rolling_back' state.
    await prisma.aiChangeSet
      .update({ where: { id: changeSetId }, data: { status: 'rollback_failed' } })
      .catch(() => {});
    console.error('[rollbackChangeSet] Rollback failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'خطا در بازگردانی تغییرات.';
    throw new RollbackError(errorMessage);
  }
}
