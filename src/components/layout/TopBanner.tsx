'use client';

import Link from 'next/link';
import type { BannerConfig } from '@/types/header';

interface TopBannerProps {
  banner: BannerConfig;
}

// Helper to adjust color brightness (darken/lighten) dynamically for custom colors
function adjustColor(hex: string, percent: number): string {
  // Remove leading #
  const cleanedHex = hex.replace(/^\s*#|\s*$/g, '');
  // Standardize 3-character hex to 6-character hex
  const formattedHex = cleanedHex.length === 3 
    ? cleanedHex.replace(/(.)/g, '$1$1') 
    : cleanedHex;

  const r = parseInt(formattedHex.substring(0, 2), 16);
  const g = parseInt(formattedHex.substring(2, 4), 16);
  const b = parseInt(formattedHex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return hex; // Fallback to original if invalid hex
  }

  const factor = percent < 0 ? (1 + percent) : 1;
  const offset = percent < 0 ? 0 : 255 * percent;

  const newR = Math.min(255, Math.max(0, Math.round(r * factor + offset)));
  const newG = Math.min(255, Math.max(0, Math.round(g * factor + offset)));
  const newB = Math.min(255, Math.max(0, Math.round(b * factor + offset)));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function renderFormattedText(text: string, underlineImportant: boolean) {
  if (!text) return '';
  if (!underlineImportant) return text;

  // Match [text] or *text* or _text_ or __text__
  const regex = /\[([^\]]+)\]|\*([^*]+)\*|_([^_]+)_/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    // Add text before match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    const matchedText = match[1] || match[2] || match[3];
    parts.push(
      <span 
        key={matchIndex} 
        className="underline underline-offset-4 decoration-2 font-bold"
        style={{ textDecorationColor: 'currentColor' }}
      >
        {matchedText}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default function TopBanner({ banner }: TopBannerProps) {
  if (!banner.enabled) return null;

  const hasText = !!banner.text?.trim();
  const hasGif = !!banner.gifUrl?.trim();
  if (!hasText && !hasGif) return null;

  const baseColor = banner.bgColor || '#4f46e5';
  const bgType = banner.bgType ?? 'gradient';
  const isGradient = bgType === 'gradient';
  
  // Decide whether to use a beautiful multicolor SaaS gradient or a monochrome tone flow
  const isDefaultColor = baseColor.toLowerCase() === '#4f46e5' || baseColor.toLowerCase() === 'indigo';
  
  let backgroundImage = '';
  if (!hasGif && isGradient) {
    if (isDefaultColor) {
      backgroundImage = 'linear-gradient(270deg, #4f46e5 0%, #6366f1 20%, #8b5cf6 40%, #ec4899 60%, #3b82f6 80%, #4f46e5 100%)';
    } else {
      const colorDark = adjustColor(baseColor, -0.25);
      const colorLight = adjustColor(baseColor, 0.25);
      const colorMid = baseColor;
      backgroundImage = `linear-gradient(270deg, ${colorDark} 0%, ${colorMid} 25%, ${colorLight} 50%, ${colorMid} 75%, ${colorDark} 100%)`;
    }
  }

  const customStyle = {
    backgroundColor: baseColor,
    color: banner.textColor || '#ffffff',
    ...((hasGif || !isGradient) ? {} : {
      backgroundImage,
      backgroundSize: '200% auto',
      animation: 'topBannerGradientShift 10s ease infinite',
    })
  };

  const tagText = banner.tagText?.trim();
  const tagBgColor = banner.tagBgColor || '#ef4444';
  const tagTextColor = banner.tagTextColor || '#ffffff';
  const isTagAnimated = banner.tagAnimated !== false;
  const hasTagCheck = banner.tagWithCheck !== false;

  const checkIcon = hasTagCheck ? (
    <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"></path>
    </svg>
  ) : null;

  const tagElement = tagText ? (
    <span 
      style={{ 
        backgroundColor: tagBgColor, 
        color: tagTextColor,
        ...(isTagAnimated ? { animation: 'tagPulse 2s infinite ease-in-out' } : {})
      }}
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold leading-none select-none shrink-0 shadow-xs border border-white/10"
    >
      {checkIcon}
      <span>{tagText}</span>
    </span>
  ) : null;

  const content = hasGif ? (
    <div className="relative w-full flex justify-center items-center h-10 sm:h-12 md:h-14 overflow-hidden">
      <img
        src={banner.gifUrl!.trim()}
        alt={banner.text?.trim() || "بنر بالای فروشگاه"}
        className="h-full max-w-full object-contain mx-auto"
        loading="lazy"
      />
    </div>
  ) : (
    <div className="flex items-center justify-center gap-2 flex-wrap min-h-[20px]">
      {tagElement}
      <p className="text-xs sm:text-sm text-center font-medium leading-relaxed px-1 tracking-wide drop-shadow-sm">
        {renderFormattedText(banner.text.trim(), banner.underlineImportant !== false)}
      </p>
    </div>
  );

  return (
    <div style={customStyle} className="relative z-50 border-b border-white/10 shadow-sm">
      <div className={hasGif ? "w-full" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2"}>
        {banner.link?.trim() ? (
          <Link
            href={banner.link.trim()}
            className="block hover:scale-[1.01] hover:opacity-95 transition-all duration-300"
          >
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
      {!hasGif && isGradient && (
        <style>{`
          @keyframes topBannerGradientShift {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
        `}</style>
      )}
      {tagText && isTagAnimated && (
        <style>{`
          @keyframes tagPulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.06);
            }
          }
        `}</style>
      )}
    </div>
  );
}
