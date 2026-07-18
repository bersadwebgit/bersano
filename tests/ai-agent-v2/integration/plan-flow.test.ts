import '../../../scripts/mock-setup';
import { createAgentPlan } from '../../../src/lib/ai-agent-v2/services/ai-agent-service';
import { getChangeSet } from '../../../src/lib/ai-agent-v2/persistence/change-set-repository';
import { mockCompletionResponse } from '../../../scripts/mock-setup';

export async function testPlanFlow() {
  console.log('   Checking Integration: Plan Generation Flow...');
  
  mockCompletionResponse.text = JSON.stringify({
    riskLevel: 'low',
    riskAnalysis: 'بدون ریسک خاص',
    summary: 'ویرایش قیمت محصول نایک',
    steps: [
      {
        action: 'update',
        modelName: 'Product',
        recordId: 'prod_2',
        afterValue: { price: 2700000 },
        order: 0,
      },
    ],
  });

  const { changeSetId } = await createAgentPlan({
    shopId: 'shop_1',
    prompt: 'قیمت کفش نایک را به ۲.۷ میلیون تغییر بده',
    actorId: 'user_admin',
  });

  const saved = await getChangeSet(changeSetId, 'shop_1');
  if (!saved || saved.steps.length !== 1) throw new Error('Failed to persist changeset plan or steps');

  console.log('   ✓ Plan generation flow is fully integrated and saved!');
  return true;
}
export { testPlanFlow as planFlow };
