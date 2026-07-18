// Target architecture index file for AI Agent V2

export * from './contracts/api';
export * from './contracts/capability';
export * from './contracts/change-set';
export * from './contracts/errors';
export * from './contracts/events';

export * from './core/state-machine';
export * from './core/risk-engine';
export * from './core/approval-hash';
export * from './core/idempotency';
export * from './core/secret-redaction';

export * from './routing/persian-normalizer';
export * from './routing/entity-resolver';
export * from './routing/intent-router';

export * from './planning/context-builder';
export * from './planning/planner';
export * from './planning/plan-reviewer';
export * from './planning/preview-builder';

export * from './persistence/change-set-repository';
export * from './persistence/audit-repository';
export * from './persistence/feedback-repository';

export * from './services/ai-agent-service';
export * from './services/approval-service';
export * from './services/execution-service';

export * from './observability/logger';
export * from './observability/metrics';
