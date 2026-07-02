/**
 * Central AI Pricing Helper
 * Calculates the estimated cost of an LLM request in USD based on model and token counts.
 */
export function calculateAiCost(model: string, tokensIn: number, tokensOut: number): number {
  if (!model || typeof model !== 'string') {
    return 0;
  }

  const m = model.toLowerCase();
  
  // Default rates (based on typical low-cost models like GPT-4o-mini or Gemini Flash)
  let rateIn = 0.15 / 1000000;  // Default rate per input token (0.15 USD per 1M)
  let rateOut = 0.60 / 1000000; // Default rate per output token (0.60 USD per 1M)

  if (m.includes('gemini-2.5-flash-lite') || m.includes('gemini-2.5-flash')) {
    rateIn = 0.075 / 1000000;
    rateOut = 0.30 / 1000000;
  } else if (m.includes('claude-3-5-sonnet') || m.includes('claude-sonnet-4.6') || m.includes('claude-3.5-sonnet')) {
    rateIn = 3.00 / 1000000;
    rateOut = 15.00 / 1000000;
  } else if (m.includes('claude-3-5-haiku') || m.includes('claude-3.5-haiku') || m.includes('claude-3-haiku')) {
    rateIn = 0.25 / 1000000;
    rateOut = 1.25 / 1000000;
  } else if (m.includes('gpt-4o-mini')) {
    rateIn = 0.15 / 1000000;
    rateOut = 0.60 / 1000000;
  } else if (m.includes('gpt-4o') && !m.includes('mini')) {
    rateIn = 2.50 / 1000000;
    rateOut = 10.00 / 1000000;
  } else if (m.includes('gemini-2.5-pro') || m.includes('gemini-1.5-pro')) {
    rateIn = 1.25 / 1000000;
    rateOut = 5.00 / 1000000;
  } else if (m.includes('llama-3-8b') || m.includes('llama-3.1-8b')) {
    rateIn = 0.05 / 1000000;
    rateOut = 0.05 / 1000000;
  } else if (m.includes('text-embedding-3-small')) {
    rateIn = 0.02 / 1000000;
    rateOut = 0.0;
  }

  return (tokensIn * rateIn) + (tokensOut * rateOut);
}
