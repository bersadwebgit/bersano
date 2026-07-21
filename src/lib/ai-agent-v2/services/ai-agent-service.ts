import { generatePlan } from '../planning/planner';
import { reviewPlan } from '../planning/plan-reviewer';
import { createChangeSet } from '../persistence/change-set-repository';
import { captureBeforeSnapshots } from '../planning/snapshot';
import { ChangeSetDto } from '../contracts/change-set';

export async function createAgentPlan(opts: {
  shopId: string;
  prompt: string;
  actorId: string;
}): Promise<{ changeSetId: string; plan: ChangeSetDto }> {
  const plan = await generatePlan({ shopId: opts.shopId, prompt: opts.prompt });
  const review = await reviewPlan(plan, opts.shopId, opts.prompt);
  const finalPlan = review.correctedPlan || plan;

  // AI-002: A rejected safety/business review must DEFINITIVELY block approval and execution.
  // The plan is still persisted (for transparency in the preview) but in a non-approvable state:
  // 'clarification_required' has no valid transition to 'approved' in the central state machine,
  // so approveAgentPlan() and executeChangeSet() (which requires 'approved') are both blocked.
  // Note: reviewPlan() fails closed (returns approved:false on error), so a reviewer failure also blocks.
  const resolvedRiskLevel = review.riskLevel || finalPlan.riskLevel;
  const status = review.approved ? 'preview_ready' : 'clarification_required';
  const riskAnalysis = review.approved
    ? finalPlan.riskAnalysis
    : [
        'این طرح توسط بازبین ایمنی/قوانین کسب‌وکار رد شد و قابل تأیید یا اجرا نیست.',
        review.feedback ? `دلیل: ${review.feedback}` : null,
        finalPlan.riskAnalysis || null,
      ]
        .filter(Boolean)
        .join('\n');

  // AI-018: capture a canonical before-snapshot at plan-creation time so the preview reads stored
  // state (stable across requests) and the stale-guard can detect drift before execution.
  const snapshotSteps = await captureBeforeSnapshots(finalPlan.steps, opts.shopId);

  const changeSetId = await createChangeSet({
    shopId: opts.shopId,
    prompt: opts.prompt,
    status,
    riskLevel: resolvedRiskLevel,
    riskAnalysis,
    summary: finalPlan.summary,
    steps: snapshotSteps,
    planVersion: 1,
  });

  return {
    changeSetId,
    plan: { ...finalPlan, id: changeSetId, riskLevel: resolvedRiskLevel, riskAnalysis, steps: snapshotSteps },
  };
}
