export interface BusinessBlueprint {
  businessType: string;
  niche: string;
  confidence: number;
  targetAudience: string[];
  brandTone: string;
  priceLevel: 'budget' | 'medium' | 'luxury';
  mainCategories: { name: string; slug: string; description?: string }[];
  productAttributes: { name: string; type: string; required: boolean; options?: string[] }[];
  productRules: {
    priceRange: { min: number; max: number };
    stockRange: { min: number; max: number };
    variantTypes: string[];
    mustHaveFields: string[];
  };
  seoKeywords: string[];
  blogTopics: { title: string; slug: string; excerpt: string; keywords: string[] }[];
  homePageSections: string[];
  imageSearchKeywords: string[];
  questionsIfUnclear: string[];
}

export interface SeedProduct {
  title: string;
  slug: string;
  category: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice: number;
  stock: number;
  sku: string;
  attributes: Record<string, string>;
  variants: { name: string; price: number; stock: number; colorCode?: string }[];
  seoTitle: string;
  seoDescription: string;
  imageSearchQueryEn: string;
  imageAltFa: string;
  imageStyle: string;
  tags: string[];
  type?: 'physical' | 'digital';
  imageUrl?: string;
  galleryUrls?: string[];
}

export interface SeedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  relatedProductCategories: string[];
  featuredImage?: string;
}

export interface SeedHomepage {
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
  };
  banners: {
    title: string;
    subtitle: string;
    imageSearchQueryEn: string;
    imageAltFa: string;
    imageUrl?: string;
  }[];
  aboutShort: string;
  faqs: { question: string; answer: string }[];
  trustBadges: string[];
}

export interface SeedPreview {
  jobId: string;
  blueprint: Partial<BusinessBlueprint>;
  categories: { name: string; slug: string }[];
  products: SeedProduct[];
  articles: SeedArticle[];
  homepage: SeedHomepage;
  warnings: string[];
  requiresMoreInfo: boolean;
  questions: string[];
}

export interface IndustryRule {
  requiredAttributes: { name: string; type: string; required: boolean; options?: string[] }[];
  defaultCategories: { name: string; slug: string; description?: string }[];
  priceRange: { min: number; max: number };
  stockRange: { min: number; max: number };
  variantTypes: string[];
  imageSearchHints: string[];
  blogTopicHints: string[];
  seoKeywordHints: string[];
  unsafeOrRestrictedExamples: string[];
}
