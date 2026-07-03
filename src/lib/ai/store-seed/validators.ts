import { SeedProduct, SeedArticle, BusinessBlueprint } from './types';
import { getIndustryRule } from './industry-rules';

const FORBIDDEN_TITLES = [
  'محصول تستی',
  'محصول نمونه',
  'محصول شماره',
  'sample product',
  'test product',
  'محصول ویژه فروشگاه',
  'کالای تستی',
  'مقاله تستی',
  'مقاله نمونه'
];

const FORBIDDEN_IMAGE_QUERIES = [
  'product',
  'shopping',
  'store',
  'ecommerce'
];

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function validateBlueprint(blueprint: any): { valid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (!blueprint) {
    return {
      valid: false,
      issues: [{ field: 'global', message: 'ساختار بلوپرینت خالی است.', severity: 'error' }]
    };
  }

  if (!blueprint.businessType || blueprint.businessType.trim().length === 0) {
    issues.push({ field: 'businessType', message: 'نوع کسب‌وکار مشخص نشده است.', severity: 'error' });
  }

  if (!blueprint.niche || blueprint.niche.trim().length === 0) {
    issues.push({ field: 'niche', message: 'نیچ (حوزه تخصصی) مشخص نشده است.', severity: 'error' });
  }

  if (blueprint.confidence === undefined || typeof blueprint.confidence !== 'number') {
    issues.push({ field: 'confidence', message: 'میزان اطمینان نامعتبر است.', severity: 'error' });
  }

  if (!blueprint.brandTone || blueprint.brandTone.trim().length === 0) {
    issues.push({ field: 'brandTone', message: 'لحن برند مشخص نشده است.', severity: 'error' });
  }

  if (!blueprint.priceLevel || !['budget', 'medium', 'luxury'].includes(blueprint.priceLevel)) {
    issues.push({ field: 'priceLevel', message: 'سطح قیمت نامعتبر است.', severity: 'error' });
  }

  if (!Array.isArray(blueprint.mainCategories) || blueprint.mainCategories.length === 0) {
    issues.push({ field: 'mainCategories', message: 'دسته‌بندی‌های اصلی مشخص نشده‌اند.', severity: 'error' });
  }

  return {
    valid: !issues.some(i => i.severity === 'error'),
    issues
  };
}

export function validateProduct(
  product: any,
  blueprint: Partial<BusinessBlueprint>,
  industryName: string
): { valid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (!product) {
    return {
      valid: false,
      issues: [{ field: 'global', message: 'اطلاعات محصول خالی است.', severity: 'error' }]
    };
  }

  // Auto-repair/sanitize product.slug
  if (!product.slug || typeof product.slug !== 'string' || product.slug.trim().length === 0) {
    product.slug = 'product-' + Math.random().toString(36).substring(2, 7);
  } else {
    product.slug = product.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    if (product.slug.length === 0) {
      product.slug = 'product-' + Math.random().toString(36).substring(2, 7);
    }
  }

  // 1. Title validation
  if (!product.title || product.title.trim().length === 0) {
    issues.push({ field: 'title', message: 'عنوان محصول نمی‌تواند خالی باشد.', severity: 'error' });
  } else {
    const titleLower = product.title.toLowerCase();
    if (FORBIDDEN_TITLES.some(f => titleLower.includes(f))) {
      issues.push({ field: 'title', message: `عنوان محصول "${product.title}" تستی یا نمونه است و مجاز نیست.`, severity: 'error' });
    }
  }

  // 2. Slug validation (now auto-repaired, so we only warn if it was empty/invalid originally)
  if (!product.slug) {
    issues.push({ field: 'slug', message: 'اسلاگ محصول نامعتبر است.', severity: 'warning' });
  }

  // 3. Price validation
  if (product.price === undefined || typeof product.price !== 'number' || product.price <= 0) {
    issues.push({ field: 'price', message: `قیمت محصول "${product.title || ''}" باید بزرگتر از صفر باشد.`, severity: 'error' });
  }

  // 4. Stock validation
  if (product.stock === undefined || typeof product.stock !== 'number' || product.stock < 0) {
    issues.push({ field: 'stock', message: `موجودی محصول "${product.title || ''}" نمی‌تواند منفی باشد.`, severity: 'error' });
  }

  // 5. Description validation
  if (!product.description || product.description.trim().length < 10) {
    issues.push({ field: 'description', message: `توضیحات محصول "${product.title || ''}" خیلی کوتاه است (حداقل ۱۰ کاراکتر).`, severity: 'error' });
  }

  // 6. Category validation
  if (!product.category || product.category.trim().length === 0) {
    issues.push({ field: 'category', message: `دسته‌بندی محصول "${product.title || ''}" مشخص نشده است.`, severity: 'error' });
  }

  // 7. Industry required attributes validation
  const rule = getIndustryRule(industryName);
  const attributes = product.attributes || {};
  for (const attr of rule.requiredAttributes) {
    if (attr.required && (attributes[attr.name] === undefined || String(attributes[attr.name]).trim().length === 0)) {
      issues.push({
        field: `attributes.${attr.name}`,
        message: `ویژگی الزامی "${attr.name}" برای صنف "${industryName}" در محصول "${product.title || ''}" وجود ندارد.`,
        severity: 'warning'
      });
    }
  }

  // 8. Image query validation
  if (!product.imageSearchQueryEn || product.imageSearchQueryEn.trim().length === 0) {
    issues.push({ field: 'imageSearchQueryEn', message: `عبارت جستجوی تصویر برای محصول "${product.title || ''}" خالی است.`, severity: 'warning' });
  } else {
    const queryLower = product.imageSearchQueryEn.toLowerCase();
    if (FORBIDDEN_IMAGE_QUERIES.includes(queryLower)) {
      issues.push({
        field: 'imageSearchQueryEn',
        message: `عبارت جستجوی تصویر "${product.imageSearchQueryEn}" برای محصول "${product.title || ''}" بیش از حد عمومی است.`,
        severity: 'warning'
      });
    }
  }

  // 9. Safety / Unsafe product validation
  const unsafeExamples = rule.unsafeOrRestrictedExamples || [];
  const textToSafetyCheck = `${product.title || ''} ${product.description || ''}`.toLowerCase();
  for (const unsafe of unsafeExamples) {
    if (textToSafetyCheck.includes(unsafe.toLowerCase())) {
      issues.push({
        field: 'safety',
        message: `محصول "${product.title || ''}" حاوی کلمات مشکوک یا غیرمجاز صنف ("${unsafe}") است.`,
        severity: 'error'
      });
    }
  }

  return {
    valid: !issues.some(i => i.severity === 'error'),
    issues
  };
}

export function validateArticle(article: any): { valid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (!article) {
    return {
      valid: false,
      issues: [{ field: 'global', message: 'اطلاعات مقاله خالی است.', severity: 'error' }]
    };
  }

  if (!article.title || article.title.trim().length === 0) {
    issues.push({ field: 'title', message: 'عنوان مقاله نمی‌تواند خالی باشد.', severity: 'error' });
  } else {
    const titleLower = article.title.toLowerCase();
    if (FORBIDDEN_TITLES.some(f => titleLower.includes(f))) {
      issues.push({ field: 'title', message: `عنوان مقاله "${article.title}" تستی یا نمونه است و مجاز نیست.`, severity: 'error' });
    }
  }

  if (!article.slug || article.slug.trim().length === 0) {
    issues.push({ field: 'slug', message: 'اسلاگ مقاله نمی‌تواند خالی باشد.', severity: 'error' });
  }

  if (!article.excerpt || article.excerpt.trim().length < 20) {
    issues.push({ field: 'excerpt', message: `خلاصه مقاله "${article.title || ''}" خیلی کوتاه است (حداقل ۲۰ کاراکتر).`, severity: 'error' });
  }

  if (!article.content || article.content.trim().length < 100) {
    issues.push({ field: 'content', message: `محتوای مقاله "${article.title || ''}" خیلی کوتاه است.`, severity: 'error' });
  }

  return {
    valid: !issues.some(i => i.severity === 'error'),
    issues
  };
}
