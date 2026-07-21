import '../../../scripts/mock-setup';
import { executePlan } from '../../../src/lib/ai-agent-v2/services/execution-service';
import { createChangeSet } from '../../../src/lib/ai-agent-v2/persistence/change-set-repository';
import { mockDb } from '../../../scripts/mock-setup';

export async function testExecuteFlow() {
  console.log('   Checking Integration: Plan Execution and Verification Flow...');
  
  const changeSetId = await createChangeSet({
    shopId: 'shop_1',
    prompt: 'تغییر قیمت کفش نایک',
    status: 'approved',
    riskLevel: 'medium',
    planVersion: 1,
    steps: [
      {
        action: 'update',
        modelName: 'Product',
        recordId: 'prod_2',
        afterValue: { price: 2800000 },
        order: 0,
        status: 'pending',
      },
    ],
  });

  const verification = await executePlan(changeSetId, 'shop_1', 'user_admin');
  if (!verification.success) throw new Error('Execution/Verification integration failed');

  const updatedProd = mockDb.products.get('prod_2');
  if (!updatedProd || updatedProd.price !== 2800000) throw new Error('Database updates were not made correctly');

  console.log('   ✓ Plan execution and verification flow is integrated!');
  return true;
}
export { testExecuteFlow as executeFlow };
