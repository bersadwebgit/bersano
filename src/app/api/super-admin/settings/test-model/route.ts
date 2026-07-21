import { NextResponse } from 'next/server';
import { verifyPlatformSession } from '@/lib/platform-auth';
import { resolveAiModel, AiModelSlot, isEmbeddingCapableModel } from '@/lib/ai-model-resolver';
import { executeChatCompletion, executeEmbedding } from '@/lib/ai-provider/client';

export async function POST(request: Request) {
  const session = await verifyPlatformSession(['superadmin']);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { slot, model: customModel } = body;

    if (!slot) {
      return NextResponse.json({ error: 'مشخص کردن اسلات الزامی است.' }, { status: 400 });
    }

    // Resolve model for this slot
    const resolution = await resolveAiModel(customModel, slot as AiModelSlot);
    const resolvedModel = customModel ? String(customModel).trim() : resolution.model;

    const startTime = Date.now();
    const requestId = `test-slot-${slot}-${Math.random().toString(36).substring(7)}`;

    if (slot === 'embedding') {
      if (resolvedModel && !isEmbeddingCapableModel(resolvedModel)) {
        return NextResponse.json({
          success: false,
          model: resolvedModel,
          error: '[AI_INVALID_EMBEDDING_MODEL] مدل انتخاب شده برای Embedding قابلیت تولید وکتور را ندارد.',
        });
      }
      try {
        // AI-008: super-admin test call is explicitly quota-EXEMPT and recorded under the 'system'
        // bucket (never billed to a tenant), documented rather than accidental.
        const result = await executeEmbedding(
          {
            model: resolvedModel,
            input: 'تست تولید وکتور برای اسلات embedding',
          },
          {
            shopId: 'system',
            endpoint: `test-slot-${slot}`,
            capability: 'diagnostics:test-model',
            skipQuota: true,
            requestId,
          }
        );
        const latencyMs = Date.now() - startTime;
        return NextResponse.json({
          success: true,
          model: resolvedModel,
          latencyMs,
          dimension: result.length,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          model: resolvedModel,
          error: err.message || String(err),
        });
      }
    } else {
      try {
        const result = await executeChatCompletion({
          model: resolvedModel,
          messages: [{ role: 'user', content: 'respond with only "pong"' }],
          temperature: 0.1,
          max_tokens: 5,
        }, {
          shopId: 'system',
          endpoint: `test-slot-${slot}`,
          slot: slot as AiModelSlot,
          enableFallback: false,
          skipQuotaCheck: true,
          requestId,
        });

        const latencyMs = Date.now() - startTime;

        if (result instanceof Response) {
          return NextResponse.json({
            success: false,
            model: resolvedModel,
            error: 'Response was streamed when non-streamed expected',
          });
        }

        if (result.success) {
          return NextResponse.json({
            success: true,
            model: resolvedModel,
            latencyMs,
            text: result.text,
          });
        } else {
          return NextResponse.json({
            success: false,
            model: resolvedModel,
            error: result.error || 'Unknown error',
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          model: resolvedModel,
          error: err.message || String(err),
        });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
