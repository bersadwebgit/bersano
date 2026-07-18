import { executeChatCompletion } from '../../ai-provider/client';
import { RoutingError } from '../contracts/errors';
import { getAiModel } from '../../ai-model-resolver';
import { normalizePersian } from './persian-normalizer';

export interface RouteResult {
  capability: string;
  confidence: number;
  reason: string;
}

const DETERMINISTIC_PATTERNS = [
  { pattern: /محصول|کالا|موجودی|قیمت|تخفیف|برند/i, capability: 'manage_products' },
  { pattern: /دسته|دسته‌بندی|شاخه/i, capability: 'manage_categories' },
  { pattern: /سفارش|فاکتور|خرید/i, capability: 'manage_orders' },
];

function deterministicRoute(prompt: string): RouteResult | null {
  const normalized = normalizePersian(prompt);

  for (const item of DETERMINISTIC_PATTERNS) {
    if (item.pattern.test(normalized)) {
      return {
        capability: item.capability,
        confidence: 1.0,
        reason: `Deterministic match on ${item.capability} keywords`,
      };
    }
  }

  return null;
}

async function aiRoute(prompt: string, shopId: string): Promise<RouteResult> {
  const systemPrompt = `You are an elite intent router for an e-commerce SaaS platform.
Your task is to classify the user's Persian prompt into one of the following capabilities:
- manage_products: ایجاد، ویرایش یا حذف محصولات فروشگاه (شامل عنوان، قیمت، موجودی، برند، تخفیف و ویژگی‌های عمده‌فروشی)
- manage_categories: ایجاد، ویرایش یا حذف دسته‌بندی‌های محصولات فروشگاه
- manage_orders: مشاهده، تغییر وضعیت یا لغو سفارشات ثبت شده مشتریان

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
        billingMode: 'platform',
      }
    );

    if (result && 'success' in result && result.success) {
      const data = JSON.parse(result.text);
      if (data.capability && data.capability !== 'unknown') {
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
  const detResult = deterministicRoute(prompt);
  if (detResult) {
    return detResult;
  }

  return await aiRoute(prompt, shopId);
}
