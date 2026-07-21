// AI-029 (Unified Error Contract) — DEPRECATED module path.
//
// This file previously defined its OWN copy of `AiAgentV2Error` and its subclasses.
// That created a runtime "split-brain": an error thrown from a module importing here was
// NOT `instanceof` the error class imported from `./contracts/errors`, breaking error
// discrimination, HTTP status mapping and the safe-metadata contract in API routes.
//
// The single, canonical source of every V2 error is now `./contracts/errors`. This module
// is kept ONLY as a backward-compatible re-export so that any remaining (dead) legacy
// importer resolves to the exact same class identities. Do NOT add new imports from here.
//
// Scheduled for deletion once the dead legacy modules (flat planner.ts / plan-reviewer.ts /
// intent-router.ts) are removed and the duplicate-file gates in the Phase 2A report pass.
export * from './contracts/errors';
