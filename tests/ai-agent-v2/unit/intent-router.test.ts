import '../../../scripts/mock-setup';
import { routeIntent } from '../../../src/lib/ai-agent-v2/routing/intent-router';

export async function testIntentRouter() {
  console.log('   Checking Regex and AI Intent Routing...');
  
  const route = await routeIntent('قیمت کفش نایک را کم کن', 'shop_1');
  if (route.capability !== 'manage_products') {
    throw new Error('Deterministic router failed to route product keywords');
  }

  console.log('   ✓ Intent Router passed!');
  return true;
}
