const NON_VISION_PATTERNS: RegExp[] = [
  /\b(llama|mistral|mixtral|deepseek|gemma|phi-|falcon|zephyr|nous|wizardlm|dolphin|vicuna|olmo|yi-|solar-|granite-)\b/i,
  /\bgpt-3\.5\b/i,
  /\bgpt-oss\b/i,
  /\bflash-lite\b/i,
  /\bflashlite\b/i,
  /-lite(?::|$|\/)/i,
  /\b(sonar|command-r)\b/i,
  /\bqwen(?!.*vl)/i,
];

const VISION_PATTERNS: RegExp[] = [
  /\bvision\b/i,
  /\bgpt-4o\b/i,
  /\bgpt-4-turbo\b/i,
  /\bclaude-3\b/i,
  /\bclaude-(sonnet|opus|haiku)-[34]/i,
  /\bgemini-1\.5\b/i,
  /\bgemini-2\b/i,
  /\bgemini-pro-vision\b/i,
  /\bpixtral\b/i,
  /\bllava\b/i,
  /\bqwen.*vl\b/i,
  /\bmoondream\b/i,
  /\bllama-3\.2.*vision\b/i,
  /\bllama-4\b/i,
];

export function modelSupportsVision(model: string): boolean {
  const m = model.toLowerCase().trim();
  if (!m) return false;

  if (NON_VISION_PATTERNS.some((pattern) => pattern.test(m))) {
    return false;
  }

  return VISION_PATTERNS.some((pattern) => pattern.test(m));
}
