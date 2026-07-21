import '../../../scripts/mock-setup';
import { evaluateRisk } from '../../../src/lib/ai-agent-v2/core/risk-engine';

export async function testRiskEngine() {
  console.log('   Checking Risk Engine calculations...');
  
  const lowRisk = evaluateRisk([
    { action: 'update', modelName: 'Product', afterValue: { title: 'New title' }, order: 0, status: 'pending' }
  ]);
  if (lowRisk.riskLevel !== 'medium') throw new Error('Expected update product to be medium risk');

  const highRisk = evaluateRisk([
    { action: 'delete', modelName: 'Product', recordId: 'prod_1', order: 0, status: 'pending' }
  ]);
  if (highRisk.riskLevel !== 'high') throw new Error('Expected deletion to be high risk');

  console.log('   ✓ Risk Engine evaluation passed!');
  return true;
}
