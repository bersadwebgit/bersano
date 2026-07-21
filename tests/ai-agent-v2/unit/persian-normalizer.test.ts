import '../../../scripts/mock-setup';
import { normalizePersian, parsePriceExpression } from '../../../src/lib/ai-agent-v2/routing/persian-normalizer';

export async function testPersianNormalizer() {
  console.log('   Checking Persian Text Normalization...');
  
  const normalized = normalizePersian('كتاب كفش آيفون ۱۰،۰۰۰ تومان');
  if (!normalized.includes('کفش') || !normalized.includes('10000')) {
    throw new Error('Persian normalization failed to clean Arabic characters and numbers');
  }

  const price = parsePriceExpression('۲۰ هزار تومان');
  if (price !== 20000) throw new Error('Failed to parse price expression: 20000');

  console.log('   ✓ Persian Text Normalizer passed!');
  return true;
}
