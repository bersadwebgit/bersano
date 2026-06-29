/**
 * Utility functions for color detection and mapping.
 */

const COLOR_MAP: Record<string, string> = {
  'سفید': '#ffffff',
  'white': '#ffffff',
  'مشکی': '#000000',
  'سیاه': '#000000',
  'black': '#000000',
  'قرمز': '#ff0000',
  'سرخ': '#ff0000',
  'red': '#ff0000',
  'آبی': '#0000ff',
  'blue': '#0000ff',
  'سبز': '#00ff00',
  'green': '#00ff00',
  'زرد': '#ffff00',
  'yellow': '#ffff00',
  'صورتی': '#ffc0cb',
  'pink': '#ffc0cb',
  'بنفش': '#800080',
  'purple': '#800080',
  'نارنجی': '#ffa500',
  'orange': '#ffa500',
  'قهوه‌ای': '#a52a2a',
  'قهوه ای': '#a52a2a',
  'brown': '#a52a2a',
  'خاکستری': '#808080',
  'طوسی': '#808080',
  'دودی': '#4b5563',
  'gray': '#808080',
  'grey': '#808080',
  'نقره‌ای': '#c0c0c0',
  'نقره ای': '#c0c0c0',
  'silver': '#c0c0c0',
  'طلایی': '#ffd700',
  'gold': '#ffd700',
  'کرم': '#fffdd0',
  'cream': '#fffdd0',
  'بژ': '#f5f5dc',
  'beige': '#f5f5dc',
  'سرمه‌ای': '#000080',
  'سرمه ای': '#000080',
  'سورمه‌ای': '#000080',
  'navy': '#000080',
  'فیروزه‌ای': '#40e0d0',
  'فیروزه ای': '#40e0d0',
  'turquoise': '#40e0d0',
  'یاسی': '#c8a2c8',
  'lilac': '#c8a2c8',
  'زرشکی': '#800020',
  'burgundy': '#800020',
  'crimson': '#dc143c',
  'یشمی': '#00a86b',
  'jade': '#00a86b',
  'زیتونی': '#808000',
  'olive': '#808000',
  'خردلی': '#ffdb58',
  'mustard': '#ffdb58',
  'مسی': '#b87333',
  'copper': '#b87333',
  'برنزی': '#cd7f32',
  'bronze': '#cd7f32',
  'لیمویی': '#ccff00',
  'lime': '#ccff00',
  'بادمجانی': '#614051',
  'eggplant': '#614051',
  'شکلاتی': '#d2691e',
  'chocolate': '#d2691e',
  'نوک مدادی': '#2f4f4f',
  'charcoal': '#2f4f4f',
  'شیری': '#fffff0',
  'ivory': '#fffff0'
};

/**
 * Detects hex color code from a color name (Persian or English).
 * 
 * @param name The color name to search for
 * @returns The hex color code or null if not found
 */
export function getColorHexFromName(name: string): string | null {
  if (!name) return null;
  const lowerName = name.toLowerCase().trim();

  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (lowerName === key || lowerName.includes(key)) {
      return hex;
    }
  }

  return null;
}
