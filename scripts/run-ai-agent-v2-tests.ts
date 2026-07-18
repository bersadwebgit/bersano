import './mock-setup';
import { testStateMachine } from '../tests/ai-agent-v2/unit/state-machine.test';
import { testRiskEngine } from '../tests/ai-agent-v2/unit/risk-engine.test';
import { testApprovalHash } from '../tests/ai-agent-v2/unit/approval-hash.test';
import { testPersianNormalizer } from '../tests/ai-agent-v2/unit/persian-normalizer.test';
import { testIntentRouter } from '../tests/ai-agent-v2/unit/intent-router.test';
import { testEntityResolver } from '../tests/ai-agent-v2/unit/entity-resolver.test';
import { testPlanFlow } from '../tests/ai-agent-v2/integration/plan-flow.test';
import { testExecuteFlow } from '../tests/ai-agent-v2/integration/execute-flow.test';
import { runGoldenRunner } from '../tests/ai-agent-v2/golden-runner.test';

async function runTests() {
  console.log('\n\x1b[36m==================================================\x1b[0m');
  console.log('\x1b[36m   AI AGENT V2 DECOUPLED STABILIZED SUITE (2026)   \x1b[0m');
  console.log('\x1b[36m==================================================\x1b[0m\n');

  let failed = false;

  async function runSuite(name: string, fn: () => Promise<boolean>) {
    try {
      console.log(`⏳ Running ${name}...`);
      const success = await fn();
      if (success) {
        console.log(`   \x1b[32m✓ PASSED\x1b[0m\n`);
      } else {
        console.log(`   \x1b[31m✗ FAILED\x1b[0m\n`);
        failed = true;
      }
    } catch (err: unknown) {
      console.log(`   \x1b[31m✗ FAILED with error: ${err instanceof Error ? err.message : String(err)}\x1b[0m\n`);
      failed = true;
    }
  }

  // Unit Tests
  await runSuite('Unit: State Machine', testStateMachine);
  await runSuite('Unit: Risk Engine', testRiskEngine);
  await runSuite('Unit: Approval Hash', testApprovalHash);
  await runSuite('Unit: Persian Normalizer', testPersianNormalizer);
  await runSuite('Unit: Intent Router', testIntentRouter);
  await runSuite('Unit: Entity Resolver', testEntityResolver);

  // Integration Tests
  await runSuite('Integration: Plan Flow', testPlanFlow);
  await runSuite('Integration: Execute Flow', testExecuteFlow);

  // Golden Evaluation
  const goldenSuccess = await runGoldenRunner();
  if (!goldenSuccess) {
    failed = true;
  }

  console.log('\n\x1b[36m==================================================\x1b[0m');
  if (failed) {
    console.log('\x1b[31m   SOME SUITES FAILED   \x1b[0m');
    console.log('\x1b[36m==================================================\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32m   ALL SUITES PASSED SUCCESSFULLY!   \x1b[0m');
    console.log('\x1b[36m==================================================\x1b[0m\n');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test suite error:', err);
  process.exit(1);
});
