/**
 * Central AI Pricing Helper
 * Single source of truth for estimating the cost of an AI request in USD.
 *
 * AI-008 (Phase C): pricing must never be hardcoded in multiple files. Chat and embedding have
 * separate formulas, and an unknown model must NOT silently record a definitive zero cost — it
 * returns a best-effort estimate flagged as `unresolved` plus an observability warning so billing
 * can reconcile later instead of under-charging to $0.
 */

export type CostStatus = 'resolved' | 'unresolved';
export type AiOperationType = 'chat' | 'embedding';

export interface ResolvedCost {
  costUsd: number;
  costStatus: CostStatus;
}

interface Rate {
  in: number; // USD per input token
  out: number; // USD per output token
}

const PER_1M = 1_000_000;

// Chat model pricing registry (per 1M tokens → per token). Keys are lowercase substrings.
const CHAT_PRICING: Array<{ match: (m: string) => boolean; rate: Rate }> = [
  { match: (m) => m.includes('gemini-2.5-flash-lite') || m.includes('gemini-2.5-flash'), rate: { in: 0.075 / PER_1M, out: 0.30 / PER_1M } },
  { match: (m) => m.includes('claude-3-5-sonnet') || m.includes('claude-sonnet-4.6') || m.includes('claude-sonnet-4-6') || m.includes('claude-3.5-sonnet'), rate: { in: 3.0 / PER_1M, out: 15.0 / PER_1M } },
  { match: (m) => m.includes('claude-3-5-haiku') || m.includes('claude-3.5-haiku') || m.includes('claude-3-haiku'), rate: { in: 0.25 / PER_1M, out: 1.25 / PER_1M } },
  { match: (m) => m.includes('gpt-4o-mini'), rate: { in: 0.15 / PER_1M, out: 0.60 / PER_1M } },
  { match: (m) => m.includes('gpt-4o') && !m.includes('mini'), rate: { in: 2.5 / PER_1M, out: 10.0 / PER_1M } },
  { match: (m) => m.includes('gemini-2.5-pro') || m.includes('gemini-1.5-pro'), rate: { in: 1.25 / PER_1M, out: 5.0 / PER_1M } },
  { match: (m) => m.includes('llama-3-8b') || m.includes('llama-3.1-8b'), rate: { in: 0.05 / PER_1M, out: 0.05 / PER_1M } },
];

// Embedding model pricing registry (input-only; embeddings have no output tokens).
const EMBEDDING_PRICING: Array<{ match: (m: string) => boolean; rate: number }> = [
  { match: (m) => m.includes('text-embedding-3-small'), rate: 0.02 / PER_1M },
  { match: (m) => m.includes('text-embedding-3-large'), rate: 0.13 / PER_1M },
  { match: (m) => m.includes('text-embedding-ada-002'), rate: 0.10 / PER_1M },
];

// Best-effort defaults used only when the model is unknown (flagged 'unresolved').
const DEFAULT_CHAT_RATE: Rate = { in: 0.15 / PER_1M, out: 0.60 / PER_1M };
const DEFAULT_EMBEDDING_RATE = 0.02 / PER_1M;

/**
 * Resolves cost + a resolution status. Unknown models are estimated (never a definitive $0) and
 * flagged 'unresolved' with an observability warning so billing can reconcile.
 */
export function resolveAiCost(
  model: string,
  tokensIn: number,
  tokensOut: number,
  operationType: AiOperationType = 'chat'
): ResolvedCost {
  if (!model || typeof model !== 'string') {
    console.warn('[ai-pricing] Cost unresolved: missing/invalid model name.');
    const rate = operationType === 'embedding' ? DEFAULT_EMBEDDING_RATE : DEFAULT_CHAT_RATE.in;
    return { costUsd: tokensIn * rate, costStatus: 'unresolved' };
  }

  const m = model.toLowerCase();

  if (operationType === 'embedding') {
    const known = EMBEDDING_PRICING.find((e) => e.match(m));
    if (known) {
      return { costUsd: tokensIn * known.rate, costStatus: 'resolved' };
    }
    console.warn(`[ai-pricing] Cost unresolved for unknown embedding model: ${model}`);
    return { costUsd: tokensIn * DEFAULT_EMBEDDING_RATE, costStatus: 'unresolved' };
  }

  const known = CHAT_PRICING.find((c) => c.match(m));
  if (known) {
    return { costUsd: tokensIn * known.rate.in + tokensOut * known.rate.out, costStatus: 'resolved' };
  }
  console.warn(`[ai-pricing] Cost unresolved for unknown chat model: ${model}`);
  return {
    costUsd: tokensIn * DEFAULT_CHAT_RATE.in + tokensOut * DEFAULT_CHAT_RATE.out,
    costStatus: 'unresolved',
  };
}

/**
 * Backward-compatible numeric cost helper. Existing callers keep working unchanged; new callers
 * that need the resolution status should use `resolveAiCost`.
 */
export function calculateAiCost(model: string, tokensIn: number, tokensOut: number): number {
  if (!model || typeof model !== 'string') {
    return 0;
  }
  return resolveAiCost(model, tokensIn, tokensOut, 'chat').costUsd;
}
