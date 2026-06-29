'use client';

interface Variant {
  id: string;
  name: string;
  colorCode?: string | null;
  imageUrl?: string | null;
  price: number;
  stock: number;
  isDefault?: boolean;
}

interface ProductVariantsProps {
  variants?: Variant[];
  selectedVariantId: string | null;
  onVariantChange: (id: string) => void;
}

export default function ProductVariants({ variants, selectedVariantId, onVariantChange }: ProductVariantsProps) {
  const hasVariants = variants && variants.length > 0;
  if (!hasVariants) return null;

  const selectedVariant = variants!.find(v => v.id === selectedVariantId) || null;

  // Multi-level variant handling (e.g. "سایز L - قرمز")
  const separator = variants!.some(v => v.name.includes(' - ')) ? ' - ' :
                    variants!.some(v => v.name.includes(' / ')) ? ' / ' :
                    variants!.some(v => v.name.includes(' | ')) ? ' | ' : null;

  const parsedVariants = separator
    ? variants!.map(v => ({
        ...v,
        parts: v.name.split(separator).map(p => p.trim())
      }))
    : [];

  const isMultiLevel = parsedVariants.length > 0 && parsedVariants.every(v => v.parts.length >= 2);

  const activeVariant = selectedVariant || variants![0];
  const activeParts = activeVariant && separator ? activeVariant.name.split(separator).map(p => p.trim()) : [];
  const selectedOpt1 = activeParts[0] || '';
  const selectedOpt2 = activeParts[1] || '';

  const option1Values = isMultiLevel ? Array.from(new Set(parsedVariants.map(v => v.parts[0]))) : [];
  const availableOpt2Variants = isMultiLevel ? parsedVariants.filter(v => v.parts[0] === selectedOpt1) : [];
  const option2Values = isMultiLevel ? Array.from(new Set(availableOpt2Variants.map(v => v.parts[1] || ''))) : [];

  const handleOpt1Change = (opt1: string) => {
    let target = parsedVariants.find(v => v.parts[0] === opt1 && v.parts[1] === selectedOpt2);
    if (!target) {
      target = parsedVariants.find(v => v.parts[0] === opt1 && v.stock > 0) ||
               parsedVariants.find(v => v.parts[0] === opt1);
    }
    if (target) {
      onVariantChange(target.id);
    }
  };

  const handleOpt2Change = (opt2: string) => {
    const target = parsedVariants.find(v => v.parts[0] === selectedOpt1 && v.parts[1] === opt2);
    if (target) {
      onVariantChange(target.id);
    }
  };

  const hasColorsInOpt2 = availableOpt2Variants.some(v => v.colorCode);
  const opt1Label = 'انتخاب مشخصه / سایز / ظرفیت';
  const opt2Label = hasColorsInOpt2 ? 'انتخاب رنگ' : 'انتخاب ویژگی / طرح';

  const pillClass = (isSelected: boolean, isOutOfStock: boolean) =>
    `flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs transition-all relative ${
      isSelected
        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-300 font-bold shadow-sm'
        : 'border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600'
    } ${isOutOfStock ? 'opacity-40' : ''}`;

  return (
    <div className="mb-6">
      {isMultiLevel ? (
        <div className="space-y-5">
          {/* Level 1 Option */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">{opt1Label}</h3>
            <div className="flex flex-wrap gap-2">
              {option1Values.map(opt1 => {
                const isSelected = opt1 === selectedOpt1;
                const opt1Variants = parsedVariants.filter(v => v.parts[0] === opt1);
                const isOutOfStock = opt1Variants.every(v => v.stock <= 0);

                return (
                  <button
                    key={opt1}
                    type="button"
                    onClick={() => handleOpt1Change(opt1)}
                    className={pillClass(isSelected, isOutOfStock)}
                  >
                    <span className={`font-medium ${isOutOfStock ? 'line-through' : ''}`}>{opt1}</span>
                    {isOutOfStock && (
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium mr-1">(ناموجود)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 2 Option */}
          {option2Values.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">{opt2Label}</h3>
              <div className="flex flex-wrap gap-2">
                {option2Values.map(opt2 => {
                  const variant = availableOpt2Variants.find(v => v.parts[1] === opt2);
                  const isSelected = opt2 === selectedOpt2;
                  const isOutOfStock = variant ? variant.stock <= 0 : true;

                  return (
                    <button
                      key={opt2}
                      type="button"
                      onClick={() => handleOpt2Change(opt2)}
                      className={pillClass(isSelected, isOutOfStock)}
                    >
                      {variant?.colorCode && (
                        <span
                          className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 shrink-0"
                          style={{ backgroundColor: variant.colorCode }}
                        />
                      )}
                      <span className={`font-medium ${isOutOfStock ? 'line-through' : ''}`}>{opt2}</span>
                      {isOutOfStock && (
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium mr-1">(ناموجود)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">انتخاب ویژگی</h3>
          <div className="flex flex-wrap gap-2">
            {variants!.map(variant => {
              const isSelected = variant.id === selectedVariantId;
              const isOutOfStock = variant.stock <= 0;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => onVariantChange(variant.id)}
                  className={pillClass(isSelected, isOutOfStock)}
                >
                  {variant.colorCode && (
                    <span
                      className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 shrink-0"
                      style={{ backgroundColor: variant.colorCode }}
                    />
                  )}
                  <span className={`font-medium ${isOutOfStock ? 'line-through' : ''}`}>{variant.name}</span>
                  {isOutOfStock && (
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium mr-1">(ناموجود)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
