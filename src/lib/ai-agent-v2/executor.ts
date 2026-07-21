import { prisma } from '../prisma';
// AI-029 (Unified Error Contract): the single source of V2 errors is ./contracts/errors.
// The flat ./errors module is a legacy duplicate that defines a SECOND, incompatible
// AiAgentV2Error base class; importing it here caused a runtime split-brain where
// `instanceof AiAgentV2Error` failed across modules. Repointed to the canonical contract.
import { ExecutionError } from './contracts/errors';
import { validateTransition, ChangeSetState } from './core/state-machine';
import { assertStepAllowed, validateStepPayload } from './capabilities/step-validators';
import { Prisma } from '@prisma/client';

function coerceFields(modelName: string, data: any) {
  if (!data || typeof data !== 'object') return;
  
  const floatFields: Record<string, string[]> = {
    Product: ['price', 'discount'],
    ProductVariant: ['price'],
    DiscountCode: ['discount', 'minOrderAmount', 'maxDiscountAmount'],
  };
  
  const intFields: Record<string, string[]> = {
    Product: ['stock'],
    ProductVariant: ['stock'],
    DiscountCode: ['maxUses', 'minQuantity', 'maxUsesPerUser'],
    Story: ['duration'],
  };
  
  if (floatFields[modelName]) {
    for (const key of floatFields[modelName]) {
      if (data[key] !== undefined && data[key] !== null) {
        data[key] = parseFloat(data[key]);
      }
    }
  }
  
  if (intFields[modelName]) {
    for (const key of intFields[modelName]) {
      if (data[key] !== undefined && data[key] !== null) {
        data[key] = parseInt(data[key], 10);
      }
    }
  }
}

export async function executeChangeSet(changeSetId: string, shopId: string): Promise<void> {
  // 1. Fetch changeset and steps
  const changeSet = await prisma.aiChangeSet.findFirst({
    where: { id: changeSetId, shopId },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  if (!changeSet) {
    throw new ExecutionError('طرح تغییرات یافت نشد.');
  }

  // AI-003: use the central state machine as the single authority for legal transitions. Only an
  // 'approved' change set may move to 'executing'; every other status (draft/preview_ready/
  // clarification_required/rejected/cancelled/executed/...) is rejected here.
  try {
    validateTransition(changeSet.status as ChangeSetState, 'executing');
  } catch {
    throw new ExecutionError(`امکان اجرای طرح با وضعیت فعلی (${changeSet.status}) وجود ندارد.`);
  }

  // AI-003: definitively block unknown/unsupported model or action BEFORE any write happens, so a
  // malformed step can never cause a partial execution. This replaces the previous behaviour where
  // an unknown action was silently skipped and only unknown models threw mid-transaction.
  for (const step of changeSet.steps) {
    assertStepAllowed(step.modelName, step.action);
  }

  // 2. Update changeset status to executing
  await prisma.aiChangeSet.update({
    where: { id: changeSetId },
    data: { status: 'executing' },
  });

  // Track temporary reference mappings
  const refMap = new Map<string, string>();

  try {
    // 3. Execute steps inside a transaction
    await prisma.$transaction(async (tx) => {
      for (const step of changeSet.steps) {
        let realRecordId = step.recordId;
        if (realRecordId && refMap.has(realRecordId)) {
          realRecordId = refMap.get(realRecordId)!;
        }

        let cleanAfterValue = step.afterValue ? JSON.parse(JSON.stringify(step.afterValue)) : null;
        if (cleanAfterValue) {
          const resolveRefs = (obj: any) => {
            for (const key of Object.keys(obj)) {
              if (typeof obj[key] === 'string') {
                const val = obj[key];
                if (refMap.has(val)) {
                  obj[key] = refMap.get(val);
                } else {
                  for (const [tempRef, realId] of refMap.entries()) {
                    if (val.includes(tempRef)) {
                      obj[key] = val.replace(new RegExp(tempRef, 'g'), realId);
                    }
                  }
                }
              } else if (obj[key] && typeof obj[key] === 'object') {
                resolveRefs(obj[key]);
              }
            }
          };
          resolveRefs(cleanAfterValue);
        }

        let tempRefKey: string | null = null;
        if (cleanAfterValue && 'tempRef' in cleanAfterValue) {
          tempRefKey = cleanAfterValue.tempRef;
          delete cleanAfterValue.tempRef;
        }

        if (cleanAfterValue) {
          if (cleanAfterValue.expiresAt && typeof cleanAfterValue.expiresAt === 'string') {
            cleanAfterValue.expiresAt = new Date(cleanAfterValue.expiresAt);
          }
          if (cleanAfterValue.startDate && typeof cleanAfterValue.startDate === 'string') {
            cleanAfterValue.startDate = new Date(cleanAfterValue.startDate);
          }
          if (cleanAfterValue.specialEndsAt && typeof cleanAfterValue.specialEndsAt === 'string') {
            cleanAfterValue.specialEndsAt = new Date(cleanAfterValue.specialEndsAt);
          }
          if (step.modelName === 'Story') {
            if (!cleanAfterValue.expiresAt) {
              cleanAfterValue.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            }
            if (!cleanAfterValue.thumbnailUrl) {
              cleanAfterValue.thumbnailUrl = '/uploads/story-default.jpg';
            }
            if (!cleanAfterValue.mediaUrl) {
              cleanAfterValue.mediaUrl = '/uploads/story-default.jpg';
            }
            if (!cleanAfterValue.mediaType) {
              cleanAfterValue.mediaType = 'image';
            }
          }
          coerceFields(step.modelName, cleanAfterValue);
        }

        // AI-003: validate the (coerced) payload against the related capability schema before writing.
        validateStepPayload(step.modelName, step.action, cleanAfterValue);

        if (step.action === 'create') {
          let createdRecord: { id: string };
          
          if (step.modelName === 'Product') {
            createdRecord = await tx.product.create({
              data: {
                ...cleanAfterValue,
                shopId,
              } as Prisma.ProductUncheckedCreateInput,
            });
          } else if (step.modelName === 'Category') {
            createdRecord = await tx.category.create({
              data: {
                ...cleanAfterValue,
                shopId,
              } as Prisma.CategoryUncheckedCreateInput,
            });
          } else if (step.modelName === 'ProductVariant') {
            createdRecord = await tx.productVariant.create({
              data: {
                ...cleanAfterValue,
                shopId,
              } as Prisma.ProductVariantUncheckedCreateInput,
            });
          } else if (step.modelName === 'Story') {
            createdRecord = await tx.story.create({
              data: {
                ...cleanAfterValue,
                shopId,
              } as Prisma.StoryUncheckedCreateInput,
            });
          } else if (step.modelName === 'DiscountCode') {
            createdRecord = await tx.discountCode.create({
              data: {
                ...cleanAfterValue,
                shopId,
              } as Prisma.DiscountCodeUncheckedCreateInput,
            });
          } else {
            throw new Error(`مدل نامعتبر: ${step.modelName}`);
          }

          if (tempRefKey) {
            refMap.set(tempRefKey, createdRecord.id);
          }

          // Update step with the newly created record ID
          await tx.aiChangeStep.update({
            where: { id: step.id },
            data: {
              recordId: createdRecord.id,
              status: 'completed',
            },
          });
        } else if (step.action === 'update' && realRecordId) {
          const beforeValue: Record<string, unknown> = {};

          let current: any = null;
          if (step.modelName === 'Product') {
            current = await tx.product.findFirst({ where: { id: realRecordId, shopId } });
          } else if (step.modelName === 'Category') {
            current = await tx.category.findFirst({ where: { id: realRecordId, shopId } });
          } else if (step.modelName === 'ProductVariant') {
            current = await tx.productVariant.findFirst({ where: { id: realRecordId, shopId } });
          } else if (step.modelName === 'Story') {
            current = await tx.story.findFirst({ where: { id: realRecordId, shopId } });
          } else if (step.modelName === 'DiscountCode') {
            current = await tx.discountCode.findFirst({ where: { id: realRecordId, shopId } });
          } else {
            throw new Error(`مدل نامعتبر: ${step.modelName}`);
          }

          if (!current) {
            throw new Error(`رکورد ${step.modelName} با شناسه ${realRecordId} یافت نشد.`);
          }
          
          // Extract only the fields we are modifying to store as beforeValue
          for (const key of Object.keys(cleanAfterValue || {})) {
            beforeValue[key] = current[key];
          }

          if (step.modelName === 'Product') {
            await tx.product.update({
              where: { id: realRecordId },
              data: cleanAfterValue,
            });
          } else if (step.modelName === 'Category') {
            await tx.category.update({
              where: { id: realRecordId },
              data: cleanAfterValue,
            });
          } else if (step.modelName === 'ProductVariant') {
            await tx.productVariant.update({
              where: { id: realRecordId },
              data: cleanAfterValue,
            });
          } else if (step.modelName === 'Story') {
            await tx.story.update({
              where: { id: realRecordId },
              data: cleanAfterValue,
            });
          } else if (step.modelName === 'DiscountCode') {
            await tx.discountCode.update({
              where: { id: realRecordId },
              data: cleanAfterValue,
            });
          }

          // Update step with beforeValue
          await tx.aiChangeStep.update({
            where: { id: step.id },
            data: {
              recordId: realRecordId,
              beforeValue,
              status: 'completed',
            },
          });
        } else if (step.action === 'delete' && realRecordId) {
          let beforeValue: Record<string, unknown> | null = null;

          let current: any = null;
          if (step.modelName === 'Product') {
            current = await tx.product.findFirst({ where: { id: realRecordId, shopId } });
          } else if (step.modelName === 'Category') {
            current = await tx.category.findFirst({ where: { id: realRecordId, shopId } });
          } else if (step.modelName === 'ProductVariant') {
            current = await tx.productVariant.findFirst({ where: { id: realRecordId, shopId } });
          } else if (step.modelName === 'Story') {
            current = await tx.story.findFirst({ where: { id: realRecordId, shopId } });
          } else if (step.modelName === 'DiscountCode') {
            current = await tx.discountCode.findFirst({ where: { id: realRecordId, shopId } });
          } else {
            throw new Error(`مدل نامعتبر: ${step.modelName}`);
          }

          if (!current) {
            throw new Error(`رکورد ${step.modelName} با شناسه ${realRecordId} یافت نشد.`);
          }
          
          beforeValue = current as unknown as Record<string, unknown>;

          if (step.modelName === 'Product') {
            await tx.product.delete({
              where: { id: realRecordId },
            });
          } else if (step.modelName === 'Category') {
            await tx.category.delete({
              where: { id: realRecordId },
            });
          } else if (step.modelName === 'ProductVariant') {
            await tx.productVariant.delete({
              where: { id: realRecordId },
            });
          } else if (step.modelName === 'Story') {
            await tx.story.delete({
              where: { id: realRecordId },
            });
          } else if (step.modelName === 'DiscountCode') {
            await tx.discountCode.delete({
              where: { id: realRecordId },
            });
          }

          // Update step with beforeValue
          await tx.aiChangeStep.update({
            where: { id: step.id },
            data: {
              recordId: realRecordId,
              beforeValue,
              status: 'completed',
            },
          });
        }
      }
    });

    // 4. Update changeset status to 'executed' (AI-003: align with central state machine;
    // 'completed' is not a valid ChangeSetState. The resting state becomes 'verified' or
    // 'partially_failed' after verification, both of which are rollbackable.)
    validateTransition('executing', 'executed');
    await prisma.aiChangeSet.update({
      where: { id: changeSetId },
      data: {
        status: 'executed',
        executedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    console.error('[executeChangeSet] Execution failed, rolling back:', error);

    const errorMessage = error instanceof Error ? error.message : 'خطای ناشناخته در اجرا';

    // 5. Update changeset status to failed (executing -> failed is a valid central transition).
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
