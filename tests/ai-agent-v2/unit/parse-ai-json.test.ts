import { parseAiJson, extractBalancedJson, isTruncatedJson } from '../../../src/lib/parse-ai-json';

export async function testParseAiJson(): Promise<boolean> {
  console.log('   Checking Enhanced AI JSON Parser...');

  // 1. Plain JSON
  const plainInput = '{"riskLevel": "low", "summary": "Test plain JSON"}';
  const plainResult = parseAiJson<{ riskLevel: string; summary: string }>(plainInput, ['riskLevel', 'summary'], {});
  if (plainResult.data.riskLevel !== 'low' || plainResult.data.summary !== 'Test plain JSON') {
    throw new Error('Plain JSON parsing failed');
  }

  // 2. Markdown JSON fence
  const fenceInput = 'Some text before\n```json\n{"riskLevel": "medium", "summary": "Test fence"}\n```\nSome text after';
  const fenceResult = parseAiJson<{ riskLevel: string; summary: string }>(fenceInput, ['riskLevel', 'summary'], {});
  if (fenceResult.data.riskLevel !== 'medium' || fenceResult.data.summary !== 'Test fence') {
    throw new Error('Markdown JSON fence parsing failed');
  }

  // 3. Balanced JSON object with surrounding text
  const balancedInput = 'Here is the response: {"riskLevel": "high", "summary": "Test balanced"} and some trailing text';
  const balancedResult = parseAiJson<{ riskLevel: string; summary: string }>(balancedInput, ['riskLevel', 'summary'], {});
  if (balancedResult.data.riskLevel !== 'high' || balancedResult.data.summary !== 'Test balanced') {
    throw new Error('Balanced JSON object extraction failed');
  }

  // 4. Truncation detection
  const truncatedInput = '{"riskLevel": "low", "summary": "Truncated string';
  if (!isTruncatedJson(truncatedInput)) {
    throw new Error('Truncation detection failed to flag truncated JSON');
  }

  // 5. Truncation repair (at most one deterministic repair attempt)
  const truncatedResult = parseAiJson<{ riskLevel: string; summary: string }>(truncatedInput, ['riskLevel', 'summary'], { summary: 'fallback' });
  if (truncatedResult.data.riskLevel !== 'low' || !truncatedResult.data.summary) {
    throw new Error('Truncated JSON repair failed');
  }
  if (!truncatedResult.warnings.some(w => w.includes('ناقص') || w.includes('truncated'))) {
    throw new Error('Truncated JSON should produce a warning');
  }

  // 6. Canonical schema validation and fallback
  const missingFieldInput = '{"riskLevel": "low"}';
  const validationResult = parseAiJson<{ riskLevel: string; summary: string }>(
    missingFieldInput,
    ['riskLevel', 'summary'],
    { summary: 'default_summary' }
  );
  if (validationResult.data.riskLevel !== 'low' || validationResult.data.summary !== 'default_summary') {
    throw new Error('Canonical schema validation failed to apply fallback values');
  }
  if (!validationResult.warnings.some(w => w.includes('default_summary') || w.includes('پیش‌فرض') || w.includes('summary'))) {
    throw new Error('Missing required field should produce a warning');
  }

  console.log('   ✓ Enhanced AI JSON Parser verified successfully!');
  return true;
}
