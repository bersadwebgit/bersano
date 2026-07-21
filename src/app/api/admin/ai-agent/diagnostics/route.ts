import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { resolveAiProviderConfig } from '@/lib/ai-provider/config';
import { getAiModel } from '@/lib/ai-model-resolver';

export async function GET(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await resolveAiProviderConfig();
    const plannerModel = await getAiModel('complex', payload.shopId);
    const fallbackModel = await getAiModel('fallback', payload.shopId);
    const embeddingModel = process.env.AI_EMBEDDING_MODEL || await getAiModel('embedding', payload.shopId);

    return NextResponse.json({
      success: true,
      diagnostics: {
        selectedProvider: config.mode === 'gateway' ? 'Gateway Provider' : 'Direct OpenRouter',
        selectedTransportMode: config.mode,
        gatewayConfigured: !!(process.env.AI_GATEWAY_URL && process.env.AI_GATEWAY_TOKEN),
        directModeAllowed: process.env.AI_ALLOW_DIRECT_OPENROUTER?.trim().toLowerCase() === 'true',
        plannerModelConfigured: !!plannerModel,
        fallbackModelConfigured: !!fallbackModel,
        embeddingModelConfigured: !!embeddingModel,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
