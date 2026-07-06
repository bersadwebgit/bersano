'use client';

import { useState, useEffect } from 'react';

interface Variant {
  id: string;
  name: string;
  colorCode?: string | null;
  imageUrl?: string | null;
  price: number;
  stock: number;
  isDefault?: boolean;
  optionsJson?: string | null;
}

interface ProductVariantsProps {
  variants?: Variant[];
  selectedVariantId: string | null;
  onVariantChange: (id: string | null) => void;
}

export default function ProductVariants({ variants, selectedVariantId, onVariantChange }: ProductVariantsProps) {
  const hasVariants = variants && variants.length > 0;
  if (!hasVariants) return null;

  // Detect separator for flat name fallback
  const separator = variants!.some(v => v.name.includes(' - ')) ? ' - ' :
                    variants!.some(v => v.name.includes(' / ')) ? ' / ' :
                    variants!.some(v => v.name.includes(' | ')) ? ' | ' : null;

  // Unify variants into a structured format with an `options` object
  const parsedVariants = variants!.map(v => {
    let options: Record<string, string> = {};
    if (v.optionsJson) {
      try {
        options = JSON.parse(v.optionsJson);
      } catch (e) {
        // fallback to name parsing
      }
    }
    
    // Fallback to name parsing if optionsJson is empty or failed
    if (Object.keys(options).length === 0) {
      if (separator) {
        const parts = v.name.split(separator).map(p => p.trim());
        parts.forEach((part, idx) => {
          const label = idx === 0 ? 'ویژگی ۱' : idx === 1 ? 'ویژگی ۲' : `ویژگی ${idx + 1}`;
          options[label] = part;
        });
      } else {
        options['ویژگی'] = v.name;
      }
    }
    return { ...v, options };
  });

  // Extract all unique option keys (e.g., ["رنگ", "سایز"])
  const optionKeys = Array.from(
    new Set(parsedVariants.flatMap(v => Object.keys(v.options)))
  );

  // State to hold currently selected options (even if they don't form a valid variant)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [prevSelectedId, setPrevSelectedId] = useState<string | null>(null);

  // Sync props to state on mount or when selectedVariantId changes externally
  useEffect(() => {
    if (selectedVariantId !== prevSelectedId) {
      const activeVar = parsedVariants.find(v => v.id === selectedVariantId);
      if (activeVar) {
        setSelectedOptions({ ...activeVar.options });
        setPrevSelectedId(selectedVariantId);
      }
    }
  }, [selectedVariantId, prevSelectedId, parsedVariants]);

  // Find if there is a matching variant for the currently selected options
  const matchingVariant = parsedVariants.find(v => {
    return optionKeys.every(k => v.options[k] === selectedOptions[k]);
  });

  // Handle option selection
  const handleOptionSelect = (key: string, value: string) => {
    const newOptions = { ...selectedOptions, [key]: value };
    setSelectedOptions(newOptions);

    // Find if there is a matching variant for the new selection
    const match = parsedVariants.find(v => {
      return optionKeys.every(k => v.options[k] === newOptions[k]);
    });

    if (match) {
      onVariantChange(match.id);
      setPrevSelectedId(match.id);
    } else {
      onVariantChange(null);
      setPrevSelectedId(null);
    }
  };

  // Check if an option value is completely out of stock across all variants
  const isOptionValueOutOfStock = (key: string, value: string) => {
    const matchingVariants = parsedVariants.filter(v => v.options[key] === value);
    return matchingVariants.every(v => v.stock <= 0);
  };

  // Check if an option value is unavailable in combination with other active selections
  const isOptionCombinationUnavailable = (key: string, value: string) => {
    return !parsedVariants.some(v => {
      return optionKeys.every(k => {
        if (k === key) return v.options[k] === value;
        return v.options[k] === selectedOptions[k];
      });
    });
  };

  // Smart color code lookup for a specific value
  const getColorCode = (key: string, value: string) => {
    if (!key.includes('رنگ')) return null;
    const match = parsedVariants.find(v => v.options[key] === value && v.colorCode);
    return match?.colorCode || null;
  };

  const pillClass = (isSelected: boolean, isOutOfStock: boolean, isUnavailable: boolean) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs transition-all relative select-none cursor-pointer ${
      isSelected
        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-300 font-bold shadow-xs'
        : isUnavailable
        ? 'border-gray-200/60 bg-gray-50/50 text-gray-400 dark:border-gray-800/40 dark:bg-gray-900/20 dark:text-gray-500 opacity-60'
        : 'border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600'
    } ${isOutOfStock && !isSelected ? 'opacity-50' : ''}`;

  return (
    <div className="mb-6 space-y-5" dir="rtl">
      {optionKeys.map(key => {
        const values = Array.from(new Set(parsedVariants.map(v => v.options[key]).filter(Boolean)));
        if (values.length === 0) return null;

        return (
          <div key={key} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                انتخاب {key}
              </h3>
              {selectedOptions[key] && (
                <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md font-bold">
                  {selectedOptions[key]}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {values.map(value => {
                const isSelected = selectedOptions[key] === value;
                const isOutOfStock = isOptionValueOutOfStock(key, value);
                const isUnavailable = isOptionCombinationUnavailable(key, value);
                const colorCode = getColorCode(key, value);

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleOptionSelect(key, value)}
                    className={pillClass(isSelected, isOutOfStock, isUnavailable)}
                    title={isUnavailable ? 'این ترکیب موجود نیست' : isOutOfStock ? 'ناموجود' : undefined}
                  >
                    {colorCode && (
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600 shrink-0 shadow-xs"
                        style={{ backgroundColor: colorCode }}
                      />
                    )}
                    <span className={`font-semibold ${isOutOfStock ? 'line-through decoration-gray-400' : ''}`}>
                      {value}
                    </span>
                    {isOutOfStock && !isUnavailable && (
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">(ناموجود)</span>
                    )}
                    {isUnavailable && (
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">(غیرفعال)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Selected Variant Status Message */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">وضعیت ترکیب انتخابی:</span>
        {matchingVariant ? (
          matchingVariant.stock > 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              آماده ارسال (موجود در انبار)
            </span>
          ) : (
            <span className="text-red-500 font-bold">
              این تنوع ناموجود است.
            </span>
          )
        ) : (
          <span className="text-amber-600 dark:text-amber-400 font-bold">
            این ترکیب موجود نیست.
          </span>
        )}
      </div>
    </div>
  );
}
