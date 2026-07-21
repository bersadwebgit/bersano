import './mock-setup';
import { testErrorContract } from '../tests/ai-agent-v2/unit/error-contract.test';
import { testStateMachine } from '../tests/ai-agent-v2/unit/state-machine.test';
import { testRiskEngine } from '../tests/ai-agent-v2/unit/risk-engine.test';
import { testApprovalHash } from '../tests/ai-agent-v2/unit/approval-hash.test';
import { testApprovalIntegrity } from '../tests/ai-agent-v2/unit/approval-integrity.test';
import { testPersianNormalizer } from '../tests/ai-agent-v2/unit/persian-normalizer.test';
import { testIntentRouter } from '../tests/ai-agent-v2/unit/intent-router.test';
import { testEntityResolver } from '../tests/ai-agent-v2/unit/entity-resolver.test';
import { testExecutorValidation } from '../tests/ai-agent-v2/unit/executor-validation.test';
import { testIdempotency } from '../tests/ai-agent-v2/unit/idempotency.test';
import { testProductionFailures } from '../tests/ai-agent-v2/unit/production-failures.test';
import { testTransportParity } from '../tests/ai-agent-v2/unit/transport-parity.test';
import { testParseAiJson } from '../tests/ai-agent-v2/unit/parse-ai-json.test';
import { testSsrfEmbeddingGuard } from '../tests/ai-agent-v2/unit/ssrf-embedding.test';
import { testModelFidelity } from '../tests/ai-agent-v2/unit/model-fidelity.test';
import { testUsageQuotaBilling } from '../tests/ai-agent-v2/unit/usage-quota-billing.test';
import { testPreviewCanonical } from '../tests/ai-agent-v2/integration/preview-canonical.test';
import { testPlanFlow } from '../tests/ai-agent-v2/integration/plan-flow.test';
import { testExecuteFlow } from '../tests/ai-agent-v2/integration/execute-flow.test';
import { testReviewerBlock } from '../tests/ai-agent-v2/integration/reviewer-block.test';
import { testRollbackFlow } from '../tests/ai-agent-v2/integration/rollback-flow.test';
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
  await runSuite('Unit: Unified Error Contract (AI-029)', testErrorContract);
  await runSuite('Unit: State Machine', testStateMachine);
  await runSuite('Unit: Risk Engine', testRiskEngine);
  await runSuite('Unit: Approval Hash', testApprovalHash);
  await runSuite('Unit: Approval Integrity (AI-002)', testApprovalIntegrity);
  await runSuite('Unit: Persian Normalizer', testPersianNormalizer);
  await runSuite('Unit: Intent Router', testIntentRouter);
  await runSuite('Unit: Entity Resolver', testEntityResolver);
  await runSuite('Unit: Executor Validation (AI-003)', testExecutorValidation);
  await runSuite('Unit: Idempotency (AI-003/AI-008)', testIdempotency);
  await runSuite('Unit: Production Failures', testProductionFailures);
  await runSuite('Unit: Transport Parity', testTransportParity);
  await runSuite('Unit: AI JSON Parser', testParseAiJson);
  await runSuite('Unit: SSRF Embedding Guard (AI-001)', testSsrfEmbeddingGuard);
  await runSuite('Unit: Model Fidelity (AI-004)', testModelFidelity);
  await runSuite('Unit: Quota, Cost Tracking, and Billing (AI-008)', testUsageQuotaBilling);

  // Integration Tests
  await runSuite('Integration: Plan Flow', testPlanFlow);
  await runSuite('Integration: Execute Flow', testExecuteFlow);
  await runSuite('Integration: Reviewer Block (AI-002)', testReviewerBlock);
  await runSuite('Integration: Rollback Flow (AI-003)', testRollbackFlow);
  await runSuite('Integration: Preview Canonical + Stale-Guard (AI-018)', testPreviewCanonical);

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
