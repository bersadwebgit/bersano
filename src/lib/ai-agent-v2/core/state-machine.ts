import { InvalidTransitionError } from '../contracts/errors';

export type ChangeSetState =
  | 'draft'
  | 'planning'
  | 'clarification_required'
  | 'preview_ready'
  | 'awaiting_approval'
  | 'approved'
  | 'executing'
  | 'executed'
  | 'verified'
  | 'stale'
  | 'partially_failed'
  | 'failed'
  | 'cancelled'
  | 'rejected'
  | 'rolling_back'
  | 'rolled_back'
  | 'rollback_failed'
  | 'expired';

const VALID_TRANSITIONS: Record<ChangeSetState, Set<ChangeSetState>> = {
  draft: new Set(['planning', 'cancelled']),
  planning: new Set(['clarification_required', 'preview_ready', 'failed']),
  clarification_required: new Set(['planning', 'cancelled']),
  preview_ready: new Set(['awaiting_approval', 'approved', 'cancelled', 'stale']),
  awaiting_approval: new Set(['approved', 'rejected', 'cancelled', 'stale']),
  approved: new Set(['executing', 'cancelled', 'stale']),
  executing: new Set(['executed', 'partially_failed', 'failed']),
  executed: new Set(['verified', 'failed']),
  verified: new Set(['rolling_back', 'stale']),
  stale: new Set(['planning', 'cancelled']),
  partially_failed: new Set(['rolling_back', 'failed']),
  failed: new Set(['rolling_back']),
  cancelled: new Set([]),
  rejected: new Set([]),
  rolling_back: new Set(['rolled_back', 'rollback_failed']),
  rolled_back: new Set([]),
  rollback_failed: new Set([]),
  expired: new Set([]),
};

export function validateTransition(from: ChangeSetState, to: ChangeSetState): void {
  if (from === to) return;
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    throw new InvalidTransitionError(from, to);
  }
}
