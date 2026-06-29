'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CategorySeoSectionProps {
  seoTitle?: string | null;
  seoDescription?: string | null;
  categoryName: string;
}

export default function CategorySeoSection({ seoTitle, seoDescription, categoryName }: CategorySeoSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!seoDescription) return null;

  return (
    <div className="mt-12 mb-8 px-4 lg:px-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 lg:p-8 pt-10 lg:pt-12 shadow-sm relative overflow-hidden transition-all duration-300">
        
        {/* Decorative Badge */}
        <div className="absolute top-4 right-6 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full">
          راهنمای خرید و معرفی
        </div>

        {/* Header */}
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 mt-2">
          {seoTitle || `درباره دسته‌بندی ${categoryName}`}
        </h2>

        {/* Content Box with Expand/Collapse constraint */}
        <div 
          className={`relative transition-all duration-500 ease-in-out text-sm text-gray-600 dark:text-gray-300 leading-loose break-words whitespace-pre-wrap ${
            isExpanded ? 'max-h-[5000px]' : 'max-h-24 overflow-hidden'
          }`}
        >
          {seoDescription}

          {/* Fade Overlay for collapsed state */}
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Toggle Button */}
        <div className="mt-4 flex justify-center border-t border-gray-100 dark:border-gray-800 pt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors focus:outline-none"
          >
            {isExpanded ? (
              <>
                <span>بستن توضیحات</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>مشاهده بیشتر...</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
