'use client';

import { useState } from 'react';

interface ExpandableDescriptionProps {
  description: string;
  maxLength?: number;
}

export default function ExpandableDescription({ description, maxLength = 150 }: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description) {
    return <p className="text-gray-600 dark:text-gray-400 text-xs leading-loose break-words whitespace-pre-wrap">توضیحاتی برای این محصول ثبت نشده است.</p>;
  }

  const shouldTruncate = description.length > maxLength;
  const displayText = isExpanded ? description : (shouldTruncate ? description.slice(0, maxLength) + '...' : description);

  return (
    <div>
      <p className="text-gray-600 dark:text-gray-400 text-xs leading-loose break-words whitespace-pre-wrap">
        {displayText}
      </p>
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 dark:text-blue-400 text-xs font-bold mt-2 hover:underline focus:outline-none"
        >
          {isExpanded ? 'نمایش کمتر' : 'مشاهده بیشتر'}
        </button>
      )}
    </div>
  );
}
