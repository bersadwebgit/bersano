import { executeChatCompletion } from '../ai-provider/client';
import { RoutingError } from './errors';
import { CAPABILITIES } from './capability-registry';
import { getAiModel } from '../ai-model-resolver';

export interface RouteResult {
  capability: string;
  confidence: number;
  reason: string;
}

/**
 * Layer 1: Deterministic routing using regex patterns
 */
function deterministicRoute(prompt: string): RouteResult | null {
  const p = prompt.trim();

  if (/محصول|کالا|موجودی|قیمت|تخفیف|برند/i.test(p)) {
    return {
      capability: 'manage_products',
      confidence: 1.0,
      reason: 'Deterministic match on product keywords',
    };
  }

  if (/دسته|دسته‌بندی|شاخه/i.test(p)) {
    return {
      capability: 'manage_categories',
      confidence: 1.0,
      reason: 'Deterministic match on category keywords',
    };
  }

  if (/سفارش|فاکتور|خرید/i.test(p)) {
    return {
      capability: 'manage_orders',
      confidence: 1.0,
      reason: 'Deterministic match on order keywords',
    };
  }

  return null;
}

/**
 * Layer 2: AI routing using the router model slot
 */
async function aiRoute(prompt: string, shopId: string): Promise<RouteResult> {
  const systemPrompt = `You are an elite intent router for an e-commerce SaaS platform.
Your task is to classify the user's Persian prompt into one of the following capabilities:
${Object.entries(CAPABILITIES)
  .map(([name, cap]) => `- ${name}: ${cap.description}`)
  .join('\n')}

Respond strictly with a JSON object in this format:
{
  "capability": "capability_name",
  "confidence": 0.0 to 1.0,
  "reason": "Brief reason in Persian"
}

If no capability matches, set capability to "unknown".`;

  try {
    const model = await getAiModel('router', shopId);
    const result = await executeChatCompletion(
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      },
      {
        shopId,
        endpoint: 'intent-router',
        slot: 'router',
        billingMode: 'platform', // Routing is system-owned and non-billable
      }
    );

    if ('success' in result && result.success) {
      const data = JSON.parse(result.text);
      if (data.capability && data.capability !== 'unknown' && CAPABILITIES[data.capability]) {
        return {
          capability: data.capability,
          confidence: data.confidence || 0.5,
          reason: data.reason || '',
        };
      }
    }
  } catch (error: unknown) {
    console.error('[aiRoute] AI routing failed:', error);
  }

  throw new RoutingError('Could not classify intent for prompt: ' + prompt);
}

export async function routeIntent(prompt: string, shopId: string): Promise<RouteResult> {
  // 1. Try deterministic routing first (fast & free)
  const detResult = deterministicRoute(prompt);
  if (detResult) {
    return detResult;
  }

  // 2. Fallback to AI routing
  return await aiRoute(prompt, shopId);
}
