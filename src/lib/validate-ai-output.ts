// [HARDENED] — validation, error isolation, save safety

export const validators = {
  customHome: (data: any) => {
    const issues: string[] = [];
    if (data.homePageType && !['shop', 'custom'].includes(data.homePageType))
      issues.push('نوع صفحه اصلی نامعتبر است.');
    if (data.sectionOrder && !Array.isArray(data.sectionOrder))
      issues.push('ترتیب بخش‌ها باید آرایه باشد.');
    if (data.blogLimit && (data.blogLimit < 1 || data.blogLimit > 20))
      issues.push('تعداد مقالات باید بین ۱ تا ۲۰ باشد.');
    if (data.reviewsLimit && (data.reviewsLimit < 1 || data.reviewsLimit > 20))
      issues.push('تعداد نظرات باید بین ۱ تا ۲۰ باشد.');
    return issues;
  },

  product: (data: any) => {
    const issues: string[] = [];
    if (data.price !== undefined && data.price < 0)
      issues.push('قیمت نمی‌تواند منفی باشد.');
    if (data.stock !== undefined && data.stock < 0)
      issues.push('موجودی نمی‌تواند منفی باشد.');
    if (data.discountPercent !== undefined && 
        (data.discountPercent < 0 || data.discountPercent > 100))
      issues.push('درصد تخفیف باید بین ۰ تا ۱۰۰ باشد.');
    return issues;
  },

  discount: (data: any) => {
    const issues: string[] = [];
    if (data.type === 'percent' && data.value > 100)
      issues.push('تخفیف درصدی نمی‌تواند بیشتر از ۱۰۰٪ باشد.');
    if (data.type === 'fixed' && data.value < 0)
      issues.push('مقدار تخفیف نمی‌تواند منفی باشد.');
    if (data.usageLimit !== undefined && data.usageLimit < 1)
      issues.push('محدودیت استفاده باید حداقل ۱ باشد.');
    return issues;
  },

  order: (data: any) => {
    const issues: string[] = [];
    const validStatuses = ['pending','processing','shipped','delivered','cancelled','refunded'];
    if (data.status && !validStatuses.includes(data.status))
      issues.push(`وضعیت "${data.status}" نامعتبر است.`);
    if (data.targetOrderIds && !Array.isArray(data.targetOrderIds))
      issues.push('شناسه‌های سفارش باید آرایه باشند.');
    return issues;
  },

  settings: (data: any) => {
    const issues: string[] = [];
    if (data.themeColor && !/^#[0-9A-Fa-f]{6}$/.test(data.themeColor))
      issues.push('کد رنگ تمپلیت باید معتبر باشد (مثال: #2563eb).');
    if (data.specialDealsLimit && (data.specialDealsLimit < 1 || data.specialDealsLimit > 50))
      issues.push('تعداد شگفت‌انگیزها باید بین ۱ تا ۵۰ باشد.');
    return issues;
  },
};
