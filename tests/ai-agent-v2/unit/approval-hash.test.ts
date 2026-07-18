import '../../../scripts/mock-setup';
import { calculateApprovalHash } from '../../../src/lib/ai-agent-v2/core/approval-hash';

export async function testApprovalHash() {
  console.log('   Checking Cryptographic Approval Hashing...');
  
  const hash1 = calculateApprovalHash({
    shopId: 'shop_1',
    actorId: 'user_1',
    capabilityName: 'product.update',
    steps: [{ action: 'update', modelName: 'Product', recordId: 'prod_1', afterValue: { price: 200 }, order: 0, status: 'pending' }],
    riskLevel: 'medium',
    planVersion: 1,
  });

  const hash2 = calculateApprovalHash({
    shopId: 'shop_1',
    actorId: 'user_1',
    capabilityName: 'product.update',
    steps: [{ action: 'update', modelName: 'Product', recordId: 'prod_1', afterValue: { price: 200 }, order: 0, status: 'pending' }],
    riskLevel: 'medium',
    planVersion: 1,
  });

  if (hash1 !== hash2) throw new Error('Hashing is not deterministic!');
  
  console.log('   ✓ Cryptographic Hashing passed!');
  return true;
}
