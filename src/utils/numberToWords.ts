/**
 * Converts a number to its Persian words representation.
 * Supports numbers up to 999,999,999,999,999 (quadrillions).
 */

const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const dahgan = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const sadgan = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const dah = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

export function numberToWordsPersian(num: number): string {
  if (num === 0) return 'صفر';
  
  // Handle negative numbers if any
  const isNegative = num < 0;
  let absoluteNum = Math.abs(Math.abs(num));
  
  // Convert to string and pad to multiple of 3
  let numStr = Math.floor(absoluteNum).toString();
  if (numStr.length > 15) {
    return 'عدد بسیار بزرگ است';
  }
  
  while (numStr.length % 3 !== 0) {
    numStr = '0' + numStr;
  }
  
  const groups: string[] = [];
  for (let i = 0; i < numStr.length; i += 3) {
    groups.push(numStr.substring(i, i + 3));
  }
  
  const parts: string[] = [];
  let scaleIndex = groups.length - 1;
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const s = parseInt(group[0], 10);
    const d = parseInt(group[1], 10);
    const y = parseInt(group[2], 10);
    
    let groupText = '';
    
    if (s > 0) {
      groupText += sadgan[s];
    }
    
    if (d > 0) {
      if (groupText !== '') groupText += ' و ';
      if (d === 1) {
        groupText += dah[y];
      } else {
        groupText += dahgan[d];
        if (y > 0) {
          groupText += ' و ' + yekan[y];
        }
      }
    } else if (y > 0) {
      if (groupText !== '') groupText += ' و ';
      groupText += yekan[y];
    }
    
    if (groupText !== '') {
      const scale = scales[scaleIndex];
      if (scale !== '') {
        groupText += ' ' + scale;
      }
      parts.push(groupText);
    }
    
    scaleIndex--;
  }
  
  const result = parts.join(' و ');
  return (isNegative ? 'منفی ' : '') + result;
}
