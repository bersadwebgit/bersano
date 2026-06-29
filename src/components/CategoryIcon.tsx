'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';

interface CategoryIconProps {
  name?: string | null;
  className?: string;
  fallback?: React.ReactNode;
  size?: number;
}

export default function CategoryIcon({ 
  name, 
  className = "w-5 h-5", 
  fallback,
  size = 20
}: CategoryIconProps) {
  if (!name) {
    return fallback ? <>{fallback}</> : <LucideIcons.Folder className={className} size={size} />;
  }

  const trimmedName = name.trim();

  // 1. Check if it's an SVG string
  if (trimmedName.toLowerCase().includes('<svg')) {
    return (
      <div 
        className={`${className} flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain`} 
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: trimmedName }} 
      />
    );
  }

  // 2. Check if it's an image URL
  if (trimmedName.startsWith('http://') || trimmedName.startsWith('https://') || trimmedName.startsWith('/')) {
    return (
      <img 
        src={trimmedName} 
        alt="Category Icon" 
        className={className} 
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    );
  }

  // 3. Check if it matches a Lucide icon name (case-insensitive or exact match)
  // Standardize the name (e.g., "shirt" -> "Shirt", "shopping-bag" -> "ShoppingBag")
  const formattedName = trimmedName
    .replace(/(^\w|-\w)/g, (match) => match.replace('-', '').toUpperCase());

  const IconComponent = (LucideIcons as any)[formattedName] || (LucideIcons as any)[trimmedName];

  if (IconComponent) {
    return <IconComponent className={className} size={size} />;
  }

  // 4. Otherwise, treat it as an emoji or text
  return (
    <span 
      className="inline-flex items-center justify-center shrink-0 select-none" 
      style={{ fontSize: `${size * 0.8}px`, width: size, height: size }}
    >
      {trimmedName}
    </span>
  );
}
