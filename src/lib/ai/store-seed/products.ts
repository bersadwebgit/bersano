import { callAiGateway } from '@/lib/ai-gateway';
import { BusinessBlueprint, SeedProduct } from './types';
import { getSeedImage } from './image-queries';

const PRODUCTS_SYSTEM_PROMPT = `You are generating realistic Persian ecommerce sample products.

Use the Business Blueprint and industry rules strictly.
Products must be specific to the shop niche.
Never generate generic demo products.
Never use placeholder product names.
Never generate duplicate products.
Never generate unsafe, illegal, restricted, medical, weapon, adult, drug, or prohibited products.
Prices must be realistic for Iranian ecommerce (in Toman, e.g. 250000 Toman, NOT USD).
Attributes must match the industry.

You MUST return a valid JSON array of products matching this structure:
[
  {
    "title": "Realistic Product Title in Persian (e.g. قهوه عربیکا برزیل مدیوم رست ۲۵۰ گرمی)",
    "slug": "english-slug-only-lowercase-and-hyphens",
    "category": "The name of one of the mainCategories from the blueprint",
    "shortDescription": "Persian short description",
    "description": "Persian full description (at least 2 paragraphs, informative and professional)",
    "price": 250000, // Integer in Toman
    "compareAtPrice": 290000, // Integer in Toman (higher than price, or 0 if no discount)
    "stock": 50, // Integer
    "sku": "SKU-CODE",
    "attributes": {
      "Attribute Name (e.g. نوع پوست)": "Attribute Value (e.g. چرب)"
    },
    "variants": [
      { "name": "Variant Name (e.g. قرمز یا ۲۵۰ گرمی)", "price": 250000, "stock": 25, "colorCode": "#hex-code-or-null" }
    ],
    "seoTitle": "Persian SEO title",
    "seoDescription": "Persian SEO description",
    "imageSearchQueryEn": "Specific English query for Pexels search (e.g. minimal skincare serum bottle on white background)",
    "imageAltFa": "Persian image alt text",
    "imageStyle": "minimalist | modern | warm | luxury",
    "tags": ["tag1", "tag2"]
  }
]

Return ONLY the raw JSON array. Do not include markdown fences or explanations.`;

export async function generateSeedProducts(
  shopId: string,
  blueprint: BusinessBlueprint,
  productType: string,
  count = 3
): Promise<SeedProduct[]> {
  const userPrompt = `Generate exactly ${count} highly specialized, realistic, and commercially appealing sample products for a shop with this Business Blueprint:
- Business Type: "${blueprint.businessType}"
- Niche: "${blueprint.niche}"
- Brand Tone: "${blueprint.brandTone}"
- Price Level: "${blueprint.priceLevel}"
- Main Categories: ${JSON.stringify(blueprint.mainCategories.map(c => c.name))}
- Product Rules: ${JSON.stringify(blueprint.productRules)}
- Product Attributes Required: ${JSON.stringify(blueprint.productAttributes)}
- Product Type: "${productType}" (which can be "physical", "digital", or "both")

Ensure the products are highly realistic for the Iranian market.
Prices must be in Toman (IRT) and match the price range in the blueprint: ${blueprint.productRules.priceRange.min} to ${blueprint.productRules.priceRange.max} Toman.
Make sure to generate exactly ${productType === 'both' ? '2 physical and 1 digital' : `${count} ${productType}`} products.`;

  const result = await callAiGateway<SeedProduct[]>({
    shopId,
    endpoint: '/api/admin/onboarding/seed/products',
    slot: 'simple',
    messages: [
      { role: 'system', content: PRODUCTS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    mode: 'json',
    temperature: 0.3,
    maxTokens: 3000,
    requiredFields: [],
    fallbackValue: []
  });

  const products = result.data || result.fallbackValue || [];

  // Resolve high-quality images for each product
  const enrichedProducts = await Promise.all(
    products.map(async (product) => {
      const imageUrl = await getSeedImage(product.imageSearchQueryEn, blueprint.businessType);
      return {
        ...product,
        imageUrl,
        galleryUrls: [imageUrl]
      };
    })
  );

  return enrichedProducts;
}
