/**
 * Minimal Image Generator for Shop Builder
 * Generates beautiful, modern, RTL-friendly SVG placeholder images as Data URLs.
 */

interface Gradient {
  stop1: string;
  stop2: string;
  bgStop1: string;
  bgStop2: string;
}

const PREMIUM_GRADIENTS: Gradient[] = [
  // Indigo / Purple (Muted/Minimal)
  { stop1: '#818cf8', stop2: '#c084fc', bgStop1: '#0b0f19', bgStop2: '#1e1b4b' },
  // Teal / Emerald (Muted/Minimal)
  { stop1: '#2dd4bf', stop2: '#34d399', bgStop1: '#060b11', bgStop2: '#062f23' },
  // Rose / Pink (Muted/Minimal)
  { stop1: '#fb7185', stop2: '#f472b6', bgStop1: '#0f0a11', bgStop2: '#3b0712' },
  // Blue / Cyan (Muted/Minimal)
  { stop1: '#60a5fa', stop2: '#38bdf8', bgStop1: '#030d1a', bgStop2: '#0c2340' },
  // Violet / Fuchsia (Muted/Minimal)
  { stop1: '#a78bfa', stop2: '#f472b6', bgStop1: '#0f0c1b', bgStop2: '#2d124d' },
  // Amber / Orange (Muted/Minimal)
  { stop1: '#fbbf24', stop2: '#f59e0b', bgStop1: '#0d0b07', bgStop2: '#2d1a04' }
];

function getGradientByTitle(title: string): Gradient {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PREMIUM_GRADIENTS.length;
  return PREMIUM_GRADIENTS[index];
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function getBrandGradient(themeColor: string, title: string): Gradient {
  try {
    const hsl = hexToHsl(themeColor);
    
    // Mute the saturation to 40% - 55% for a minimal, pastel look
    const s = Math.min(Math.max(hsl.s, 40), 55);
    // Lightness to 55% - 65% for soft look
    const l = Math.min(Math.max(hsl.l, 55), 65);
    
    // Shift hue slightly based on title hashing for dynamic variety
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hueShift = (hash % 2 === 0 ? 30 : -30);
    const h2 = (hsl.h + hueShift + 360) % 360;
    
    const stop1 = hslToHex(hsl.h, s, l);
    const stop2 = hslToHex(h2, s, l);
    
    // Deep dark background tinted with brand color
    const bgStop1 = hslToHex(hsl.h, 12, 5);
    const bgStop2 = hslToHex(hsl.h, 15, 10);
    
    return { stop1, stop2, bgStop1, bgStop2 };
  } catch (e) {
    return getGradientByTitle(title);
  }
}

function splitTextIntoLines(text: string, maxChars: number = 25): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function generateMinimalImage(
  title: string,
  type: 'product' | 'article' | 'slider' | 'story' = 'product',
  categoryName?: string,
  themeColor?: string
): string {
  const gradient = themeColor ? getBrandGradient(themeColor, title) : getGradientByTitle(title);
  const lines = splitTextIntoLines(title, 28);
  
  // Icon path based on type
  let iconPath = '';
  if (type === 'product' || type === 'slider') {
    // Elegant shopping bag icon
    iconPath = `
      <path d="M-16 -10 L16 -10 L16 16 C16 22, 10 26, 0 26 C-10 26, -16 22, -16 16 Z" fill="none" stroke="url(#accent-grad)" stroke-width="4" stroke-linejoin="round" />
      <path d="M-8 -10 C-8 -20, 8 -20, 8 -10" fill="none" stroke="url(#accent-grad)" stroke-width="4" />
    `;
  } else {
    // Elegant book / article icon
    iconPath = `
      <path d="M-18 -15 L10 -15 C14 -15, 18 -11, 18 -7 L18 17 C18 21, 14 25, 10 25 L-18 25 Z" fill="none" stroke="url(#accent-grad)" stroke-width="4" stroke-linejoin="round" />
      <path d="M-18 -5 L10 -5" fill="none" stroke="url(#accent-grad)" stroke-width="3" />
      <path d="M-18 5 L10 5" fill="none" stroke="url(#accent-grad)" stroke-width="3" />
      <path d="M-18 15 L4 15" fill="none" stroke="url(#accent-grad)" stroke-width="3" />
    `;
  }

  // Define line styles for beautiful visual hierarchy
  interface LineStyle {
    fontSize: number;
    fontWeight: string;
    fill: string;
    opacity: number;
    lineHeight: number;
  }

  const lineStyles: LineStyle[] = [
    { fontSize: 38, fontWeight: '900', fill: 'url(#text-grad-primary)', opacity: 1, lineHeight: 54 },
    { fontSize: 28, fontWeight: '600', fill: 'url(#text-grad-secondary)', opacity: 0.85, lineHeight: 44 },
    { fontSize: 22, fontWeight: '500', fill: '#cbd5e1', opacity: 0.7, lineHeight: 36 }
  ];

  // Calculate coordinates for dynamic vertical centering
  let totalHeight = 0;
  const lineYOffsets: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const style = lineStyles[Math.min(i, lineStyles.length - 1)];
    lineYOffsets.push(totalHeight + style.fontSize);
    totalHeight += style.lineHeight;
  }
  const textBlockStartY = 370 - (totalHeight / 2);

  // If it's a slider or story, we don't render any text to keep it extremely clean and elegant as a background
  const isSlider = type === 'slider';
  const isStory = type === 'story';
  const isCleanBackground = isSlider || isStory;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gradient.bgStop1}" />
      <stop offset="100%" stop-color="${gradient.bgStop2}" />
    </linearGradient>
    <linearGradient id="accent-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${gradient.stop1}" />
      <stop offset="100%" stop-color="${gradient.stop2}" />
    </linearGradient>
    <linearGradient id="text-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f1f5f9" />
    </linearGradient>
    <linearGradient id="text-grad-secondary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e2e8f0" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${gradient.stop1}" stop-opacity="${isCleanBackground ? '0.22' : '0.12'}" />
      <stop offset="100%" stop-color="${gradient.bgStop1}" stop-opacity="0" />
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="600" rx="24" fill="url(#bg-grad)" />
  
  <!-- Ambient Glow in center -->
  <circle cx="400" cy="300" r="${isCleanBackground ? '400' : '350'}" fill="url(#glow)" />
  
  <!-- Decorative Grid/Patterns -->
  <g opacity="${isCleanBackground ? '0.05' : '0.02'}">
    <circle cx="400" cy="300" r="280" stroke="#ffffff" stroke-width="1.5" fill="none" />
    <circle cx="400" cy="300" r="180" stroke="#ffffff" stroke-width="1" fill="none" />
    <line x1="100" y1="300" x2="700" y2="300" stroke="#ffffff" stroke-width="1" />
    <line x1="400" y1="100" x2="400" y2="500" stroke="#ffffff" stroke-width="1" />
  </g>
  
  ${!isStory ? `
  <!-- Minimal Icon/Logo Placeholder (Only if not a story) -->
  <g transform="translate(400, ${isSlider ? '300' : '150'}) scale(${isSlider ? '1.4' : '1'})">
    <circle cx="0" cy="0" r="44" fill="#ffffff" fill-opacity="0.02" stroke="url(#accent-grad)" stroke-width="1" stroke-dasharray="4 4" />
    <g transform="translate(0, -4)">
      ${iconPath}
    </g>
  </g>
  ` : ''}
  
  ${!isCleanBackground ? `
  <!-- Text Content (RTL) -->
  <!-- Category/Subtitle -->
  ${categoryName ? `
  <g transform="translate(400, 240)">
    <text x="0" y="0" fill="${gradient.stop1}" font-family="Vazir, system-ui, -apple-system, sans-serif" font-size="13" font-weight="900" text-anchor="middle" letter-spacing="3" direction="rtl" opacity="0.85">
      ✦  ${categoryName.toUpperCase()}  ✦
    </text>
  </g>
  ` : ''}
  
  <!-- Title Lines with Visual Hierarchy -->
  <g transform="translate(0, 0)">
    ${lines.map((line, idx) => {
      const style = lineStyles[Math.min(idx, lineStyles.length - 1)];
      return `
    <text x="400" y="${textBlockStartY + lineYOffsets[idx]}" fill="${style.fill}" font-family="Vazir, system-ui, -apple-system, sans-serif" font-size="${style.fontSize}" font-weight="${style.fontWeight}" text-anchor="middle" direction="rtl" opacity="${style.opacity}">
      ${line}
    </text>
      `;
    }).join('')}
  </g>
  
  <!-- Bottom Accent Bar -->
  <rect x="350" y="495" width="100" height="3" rx="1.5" fill="url(#accent-grad)" opacity="0.6" />
  ` : ''}
  
  <!-- Watermark -->
  <text x="400" y="540" fill="#ffffff" fill-opacity="0.15" font-family="Vazir, system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" text-anchor="middle" letter-spacing="2">
    ${isSlider ? 'PREMIUM SLIDER BACKGROUND' : isStory ? 'PREMIUM STORY GRADIENT' : 'MINIMAL PLACEHOLDER'}
  </text>
</svg>
`.trim();

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
`.trim();

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
