import { executeChatCompletion } from '../../ai-provider/client';
import { PlanningError } from '../contracts/errors';
import { ChangeSetDto } from '../contracts/change-set';
import { getAiModel } from '../../ai-model-resolver';
import { REVIEWER_PROMPTS } from '../prompts/reviewer';

export interface ReviewResult {
  approved: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  feedback: string;
  correctedPlan?: ChangeSetDto | null;
}

export async function reviewPlan(
  plan: ChangeSetDto,
  shopId: string,
  prompt: string
): Promise<ReviewResult> {
  try {
    const model = await getAiModel('simple', shopId);
    const result = await executeChatCompletion(
      {
        model,
        messages: [
          { role: 'system', content: REVIEWER_PROMPTS.systemPrompt },
          {
            role: 'user',
            content: `User Original Request: ${prompt}\n\nProposed ChangeSet:\n${JSON.stringify(plan, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
      },
      {
        shopId,
        endpoint: 'plan-reviewer',
        slot: 'simple',
        billingMode: 'platform',
      }
    );

    if (result instanceof Response) {
      throw new PlanningError('Received unexpected Response object instead of ChatCompletionResult.');
    }

    if (result.success) {
      const data = JSON.parse(result.text);
      return {
        approved: !!data.approved,
        riskLevel: data.riskLevel || plan.riskLevel,
        feedback: data.feedback || '',
        correctedPlan: data.correctedPlan || null,
      };
    }

    throw new PlanningError(result.error || 'Safety review failed.');
  } catch (error: unknown) {
    console.error('[reviewPlan] Safety review failed:', error);
    return {
      approved: false,
      riskLevel: plan.riskLevel,
      feedback: 'خطا در انجام بررسی امنیتی و قوانین کسب‌وکار طرح.',
    };
  }
}
