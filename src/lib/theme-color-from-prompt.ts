const NAMED_COLORS: Array<{ pattern: RegExp; color: string }> = [
  { pattern: /سبز|green|زمرد|emerald|یشمی/i, color: '#059669' },
  { pattern: /آبی|blue|نیلی|indigo|سرمه/i, color: '#2563eb' },
  { pattern: /قرمز|red|رز|rose|یاقوت/i, color: '#dc2626' },
  { pattern: /بنفش|purple|violet|ارغوانی/i, color: '#7c3aed' },
  { pattern: /نارنجی|orange|کهربا|amber|عسلی/i, color: '#ea580c' },
  { pattern: /زرد|yellow|طلایی|gold/i, color: '#d97706' },
  { pattern: /صورتی|pink|fuchsia/i, color: '#db2777' },
  { pattern: /قهوه|coffee|brown|قهوه‌ای|قهوه ای/i, color: '#6f4e37' },
  { pattern: /مشکی|black|سیاه/i, color: '#171717' },
  { pattern: /سفید|white/i, color: '#f8fafc' },
  { pattern: /خاکستری|gray|grey|طوسی/i, color: '#64748b' },
  { pattern: /فیروزه|teal|cyan|فیروزه‌ای/i, color: '#0d9488' },
];

export function normalizeHexColor(color: unknown): string | null {
  if (color === null || color === undefined) return null;
  const trimmed = String(color).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return null;
}

export function extractHexFromPrompt(prompt: string): string | null {
  const match = prompt.match(/#([0-9A-Fa-f]{6})\b/);
  return match ? normalizeHexColor(`#${match[1]}`) : null;
}

export function detectThemeColorChangeIntent(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const mentionsColor = /رنگ|تم|theme|color|پوسته|برند|themeColor/.test(lower);
  const mentionsChange = /بشه|بذار|بزار|کن|قرار|تغییر|عوض|switch|change|set|make/.test(lower);
  const hasNamedColor = NAMED_COLORS.some(({ pattern }) => pattern.test(prompt));
  const hasHex = !!extractHexFromPrompt(prompt);
  return mentionsColor && (mentionsChange || hasNamedColor || hasHex);
}

export function resolveThemeColorFromPrompt(prompt: string): string | null {
  const explicit = extractHexFromPrompt(prompt);
  if (explicit) return explicit;

  for (const { pattern, color } of NAMED_COLORS) {
    if (pattern.test(prompt)) return color;
  }

  return null;
}

export function ensureThemeColorApplied(
  prompt: string,
  formData: Record<string, unknown>
): Record<string, unknown> {
  if (!detectThemeColorChangeIntent(prompt)) return formData;

  const resolved = resolveThemeColorFromPrompt(prompt);
  if (!resolved) return formData;

  const current = normalizeHexColor(formData.themeColor);
  if (current === resolved) return formData;

  return { ...formData, themeColor: resolved };
}
