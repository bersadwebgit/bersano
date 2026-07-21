import '../../../scripts/mock-setup';
import * as contractErrors from '../../../src/lib/ai-agent-v2/contracts/errors';
import * as legacyErrors from '../../../src/lib/ai-agent-v2/errors';
import {
  AiAgentV2Error,
  ExecutionError as ContractExecutionError,
} from '../../../src/lib/ai-agent-v2/contracts/errors';
import { serializeError } from '../../../src/lib/ai-agent-v2/contracts/api';

/**
 * AI-029 — Unified Error Contract regression test.
 *
 * Guards against a re-introduction of the "split-brain" where two independent
 * `AiAgentV2Error` base classes existed (contracts/errors.ts vs the flat errors.ts),
 * which made `instanceof` fail across modules and broke HTTP status / safe-metadata mapping.
 */
export async function testErrorContract() {
  console.log('   Checking Unified Error Contract (single base class, cross-module instanceof)...');

  // 1. Class identity must be shared across both module paths.
  if (contractErrors.AiAgentV2Error !== legacyErrors.AiAgentV2Error) {
    throw new Error('AiAgentV2Error identity differs between contracts/errors and the legacy errors shim');
  }
  if (contractErrors.ExecutionError !== legacyErrors.ExecutionError) {
    throw new Error('ExecutionError identity differs across module paths — split-brain is back');
  }
  if (contractErrors.RollbackError !== legacyErrors.RollbackError) {
    throw new Error('RollbackError identity differs across module paths — split-brain is back');
  }

  // 2. Cross-module instanceof must hold for an error built via the legacy path.
  const err = new legacyErrors.ExecutionError('internal boom: postgres://user:pass@host');
  if (!(err instanceof ContractExecutionError)) {
    throw new Error('Error built from legacy path is not instanceof canonical ExecutionError');
  }
  if (!(err instanceof AiAgentV2Error)) {
    throw new Error('ExecutionError is not instanceof AiAgentV2Error');
  }

  // 3. Safe metadata (code / status / persianMessage) must be preserved.
  if (err.code !== 'EXECUTION_ERROR' || err.status !== 500 || !err.persianMessage) {
    throw new Error('Error safe metadata (code/status/persianMessage) not preserved');
  }

  // 4. serializeError must expose only code + persianMessage for a V2 error (no stack / no English message).
  const serialized = serializeError(err, 'req_error_contract');
  if (serialized.success !== false) throw new Error('serializeError must return a failure envelope');
  if (serialized.error.code !== 'EXECUTION_ERROR') throw new Error('serializeError dropped the error code');
  if (serialized.error.message !== err.persianMessage) {
    throw new Error('serializeError must surface the Persian message only');
  }
  const blob = JSON.stringify(serialized);
  if (blob.includes('postgres://') || blob.includes('boom')) {
    throw new Error('serializeError leaked the internal English message / secrets');
  }
  if (blob.toLowerCase().includes('"stack"')) {
    throw new Error('serializeError leaked a stack trace');
  }

  // 5. A generic (non-V2) error must be fully masked in production.
  const prevEnv = process.env.NODE_ENV;
  try {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const generic = serializeError(new Error('secret-db-dsn postgres://root:toor@db'), 'req_generic');
    if (JSON.stringify(generic).includes('secret-db-dsn')) {
      throw new Error('generic error leaked its internal message in production');
    }
    if (generic.success !== false || generic.error.code !== 'INTERNAL_SERVER_ERROR') {
      throw new Error('generic error envelope malformed');
    }
  } finally {
    (process.env as Record<string, string>).NODE_ENV = prevEnv || 'test';
  }

  console.log('   ✓ Unified error contract holds: one base class, cross-module instanceof, no info leak');
  return true;
}
