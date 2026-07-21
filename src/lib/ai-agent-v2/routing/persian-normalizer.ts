/**
 * Utility to normalize Persian strings, numbers, punctuation, currencies and units.
 */
export function normalizePersian(text: string): string {
  if (!text) return '';

  let normalized = text.trim();

  // Arabic characters to Persian
  normalized = normalized.replace(/ي/g, 'ی').replace(/ك/g, 'ک');

  // Half-space (ZWNJ) to normal space
  normalized = normalized.replace(/\u200c/g, ' ');

  // Diacritics (Fatha, Damma, Kasra, Tanween, Shaddah)
  normalized = normalized.replace(/[\u064B-\u065F]/g, '');

  // Normalize numbers: Persian/Arabic to English
  const farsiDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  for (let i = 0; i < 10; i++) {
    normalized = normalized.replace(farsiDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }

  // Remove commas in numbers (e.g. 10,000 or ۱۰،۰۰۰ to 10000)
  normalized = normalized.replace(/(\d)[،,٠+](\d)/g, '$1$2');

  // Standardize multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');

  // Standardize currencies
  normalized = normalized.replace(/ریال/g, 'ریال').replace(/تومان|تمن/g, 'تومان');

  return normalized;
}

export function parsePriceExpression(expression: string): number | null {
  const normalized = normalizePersian(expression);
  const match = normalized.match(/\d+/);
  if (!match) return null;
  let value = parseInt(match[0], 10);
  
  if (normalized.includes('میلیون')) {
    value = value * 1000000;
  } else if (normalized.includes('هزار')) {
    value = value * 1000;
  }
  
  return value;
}
export function normalizePersianText(text: string): string {
  return normalizePersian(text);
}
