import { generatePlan } from '../planning/planner';
import { reviewPlan } from '../planning/plan-reviewer';
import { createChangeSet } from '../persistence/change-set-repository';
import { ChangeSetDto } from '../contracts/change-set';

export async function createAgentPlan(opts: {
  shopId: string;
  prompt: string;
  actorId: string;
}): Promise<{ changeSetId: string; plan: ChangeSetDto }> {
  const plan = await generatePlan({ shopId: opts.shopId, prompt: opts.prompt });
  const review = await reviewPlan(plan, opts.shopId, opts.prompt);
  const finalPlan = review.correctedPlan || plan;

  const changeSetId = await createChangeSet({
    shopId: opts.shopId,
    prompt: opts.prompt,
    status: 'preview_ready',
    riskLevel: finalPlan.riskLevel,
    riskAnalysis: finalPlan.riskAnalysis,
    summary: finalPlan.summary,
    steps: finalPlan.steps,
    planVersion: 1,
  });

  return { changeSetId, plan: { ...finalPlan, id: changeSetId } };
}
