// [HARDENED] — validation, error isolation, save safety
import { sanitizeHtml } from './sanitize-html';

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

export function validateAndSanitizeProductControl(data: any): { isValid: boolean; issues: string[]; sanitizedData: any } {
  const issues: string[] = [];
  const sanitizedData: any = {};

  if (!data || typeof data !== 'object') {
    return { isValid: false, issues: ['داده ورودی نامعتبر است.'], sanitizedData: null };
  }

  sanitizedData.success = !!data.success;
  sanitizedData.explanation = typeof data.explanation === 'string' ? data.explanation : '';
  
  if (data.warnings && Array.isArray(data.warnings)) {
    sanitizedData.warnings = data.warnings.filter((w: any) => typeof w === 'string');
  } else {
    sanitizedData.warnings = [];
  }

  if (!data.formData || typeof data.formData !== 'object') {
    issues.push('بخش formData یافت نشد یا نامعتبر است.');
    return { isValid: false, issues, sanitizedData: null };
  }

  const fd = data.formData;
  const sfd: any = {};

  if (!fd.title || typeof fd.title !== 'string' || fd.title.trim().length === 0) {
    issues.push('عنوان محصول الزامی است.');
  } else {
    sfd.title = fd.title.trim().substring(0, 200);
  }

  if (fd.price !== undefined) {
    const price = Number(fd.price);
    if (isNaN(price) || price < 0) {
      issues.push('قیمت محصول نمی‌تواند منفی باشد.');
    } else {
      sfd.price = price;
    }
  } else {
    sfd.price = 0;
  }

  if (fd.stock !== undefined) {
    const stock = Number(fd.stock);
    if (isNaN(stock) || stock < 0) {
      issues.push('موجودی محصول نمی‌تواند منفی باشد.');
    } else {
      sfd.stock = Math.floor(stock);
    }
  } else {
    sfd.stock = 0;
  }

  if (fd.discountPercent !== undefined) {
    const discount = Number(fd.discountPercent);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      issues.push('درصد تخفیف باید بین ۰ تا ۱۰۰ باشد.');
    } else {
      sfd.discountPercent = discount;
    }
  } else if (fd.discount !== undefined) {
    // Backward compatibility for discount
    const discount = Number(fd.discount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      issues.push('درصد تخفیف باید بین ۰ تا ۱۰۰ باشد.');
    } else {
      sfd.discountPercent = discount;
    }
  } else {
    sfd.discountPercent = 0;
  }

  if (fd.sku !== undefined) {
    sfd.sku = typeof fd.sku === 'string' ? fd.sku.trim().substring(0, 100) : '';
  }

  if (fd.brand !== undefined) sfd.brand = typeof fd.brand === 'string' ? fd.brand.trim() : null;
  if (fd.categoryId !== undefined) sfd.categoryId = typeof fd.categoryId === 'string' ? fd.categoryId : null;
  if (fd.isActive !== undefined) sfd.isActive = !!fd.isActive;
  if (fd.isSpecial !== undefined) sfd.isSpecial = !!fd.isSpecial;
  if (fd.specialEndsAt !== undefined) sfd.specialEndsAt = fd.specialEndsAt ? new Date(fd.specialEndsAt).toISOString() : null;

  if (fd.wholesalePrice !== undefined) {
    const wp = Number(fd.wholesalePrice);
    if (!isNaN(wp) && wp >= 0) sfd.wholesalePrice = wp;
  }
  if (fd.moq !== undefined) {
    const moq = Number(fd.moq);
    if (!isNaN(moq) && moq >= 0) sfd.moq = Math.floor(moq);
  }
  if (fd.wholesaleUnit !== undefined) sfd.wholesaleUnit = typeof fd.wholesaleUnit === 'string' ? fd.wholesaleUnit.trim() : null;
  if (fd.wholesaleUnitSize !== undefined) {
    const wus = Number(fd.wholesaleUnitSize);
    if (!isNaN(wus) && wus >= 0) sfd.wholesaleUnitSize = wus;
  }
  if (fd.isWholesaleOnly !== undefined) sfd.isWholesaleOnly = !!fd.isWholesaleOnly;

  sfd.description = fd.description ? sanitizeHtml(fd.description) : '';
  sfd.fullDescription = fd.fullDescription ? sanitizeHtml(fd.fullDescription) : '';

  sanitizedData.formData = sfd;

  if (data.variants !== undefined) {
    if (Array.isArray(data.variants)) {
      const sv: any[] = [];
      const variantsToProcess = data.variants.slice(0, 20);
      for (const v of variantsToProcess) {
        if (v && typeof v === 'object') {
          const price = Number(v.price);
          const stock = Number(v.stock);
          if (isNaN(price) || price < 0) {
            issues.push('قیمت تنوع محصول نمی‌تواند منفی باشد.');
            continue;
          }
          if (isNaN(stock) || stock < 0) {
            issues.push('موجودی تنوع محصول نمی‌تواند منفی باشد.');
            continue;
          }
          sv.push({
            price,
            stock: Math.floor(stock),
            sku: typeof v.sku === 'string' ? v.sku.trim().substring(0, 100) : '',
            options: typeof v.options === 'object' ? v.options : {},
          });
        }
      }
      sanitizedData.variants = sv;
    } else {
      issues.push('تنوع‌های محصول باید آرایه باشند.');
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    sanitizedData,
  };
}
