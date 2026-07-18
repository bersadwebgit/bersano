import '../../../scripts/mock-setup';
import { resolveProduct, fuzzyScore } from '../../../src/lib/ai-agent-v2/routing/entity-resolver';

export async function testEntityResolver() {
  console.log('   Checking Entity Resolution order and fuzzy matches...');
  
  const score = fuzzyScore('کفش ورزشی نایک آبی', 'نایک');
  if (score < 0.4) throw new Error('Fuzzy scoring returned too low score for partial match');

  const resolved = await resolveProduct('آیفون ۱۳', 'shop_1');
  if (!resolved || resolved.id !== 'prod_1') {
    throw new Error('Failed to resolve product dynamically');
  }

  console.log('   ✓ Entity Resolver passed!');
  return true;
}
