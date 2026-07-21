import { executeChatCompletion } from '../../ai-provider/client';
import { AiProviderError } from '../../ai-provider/errors';
import { PlanningError } from '../contracts/errors';
import { buildShopContext } from './context-builder';
import { ChangeSetDto, ChangeSetSchema } from '../contracts/change-set';
import { parseAiJson } from '../../parse-ai-json';
import { getAiModel } from '../../ai-model-resolver';
import { PLANNER_PROMPTS } from '../prompts/planner';

export interface PlanOptions {
  shopId: string;
  prompt: string;
}

export async function generatePlan(opts: PlanOptions): Promise<ChangeSetDto> {
  const { shopId, prompt } = opts;

  const context = await buildShopContext({ shopId, prompt });

  try {
    const model = await getAiModel('complex', shopId);
    const result = await executeChatCompletion(
      {
        model,
        messages: [
          { role: 'system', content: PLANNER_PROMPTS.systemPrompt },
          { role: 'user', content: `Context:\n${context}\n\nUser Request: ${prompt}` },
        ],
        response_format: { type: 'json_object' },
      },
      {
        shopId,
        endpoint: 'planner',
        slot: 'complex',
        billingMode: 'tenant',
      }
    );

    if (result instanceof Response) {
      throw new PlanningError('Received unexpected Response object instead of ChatCompletionResult.');
    }

    if (result.success) {
      const { data: parsed } = parseAiJson<Record<string, unknown>>(result.text, ['steps', 'riskLevel'], {});
      if (!parsed || !parsed.steps) {
        throw new PlanningError('Failed to parse planner JSON output.');
      }

      const validated = ChangeSetSchema.parse({
        shopId,
        prompt,
        riskLevel: parsed.riskLevel,
        riskAnalysis: parsed.riskAnalysis,
        summary: parsed.summary,
        steps: parsed.steps,
      });
      return validated;
    }

    if (result.errorCode) {
      throw new AiProviderError(
        result.errorCode as any,
        result.error,
        result.status || 502
      );
    }

    throw new PlanningError(result.error || 'Planner failed to generate a plan.');
  } catch (error: unknown) {
    console.error('[generatePlan] Planning failed:', error);
    if (error instanceof AiProviderError || (error && typeof error === 'object' && 'code' in error && 'persianMessage' in error)) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : 'Planning failed.';
    throw new PlanningError(errorMessage);
  }
}
