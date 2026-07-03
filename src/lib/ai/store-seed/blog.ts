import { callAiGateway } from '@/lib/ai-gateway';
import { BusinessBlueprint, SeedArticle } from './types';
import { getSeedImage } from './image-queries';

const BLOG_SYSTEM_PROMPT = `You are generating specialized Persian blog content for an ecommerce store.

Use the Business Blueprint, SEO keywords, product categories, and customer questions.
Articles must help the shop sell better and answer real customer questions.
Never generate generic articles.
Never use placeholder article titles.
The content must be useful, engaging, and beautifully formatted in HTML using headings (h2, h3), paragraphs, and lists.
Do NOT use markdown inside the "content" field; use HTML tags instead.

You MUST return a valid JSON array of articles matching this structure:
[
  {
    "title": "Realistic, engaging blog post title in Persian (e.g. روتین پوستی روزانه برای پوست‌های چرب و جوش‌دار)",
    "slug": "english-slug-only-lowercase-and-hyphens",
    "excerpt": "A short, engaging summary of the article in Persian (1-2 sentences)",
    "content": "<h2>مقدمه</h2><p>متن مقدمه...</p><h3>بخش اول</h3><p>متن بخش اول...</p><ul><li>مورد اول</li></ul>", // Beautiful HTML content, at least 400 words
    "seoTitle": "Persian SEO title",
    "seoDescription": "Persian SEO description",
    "keywords": ["keyword1", "keyword2"],
    "relatedProductCategories": ["One of the mainCategory names"]
  }
]

Return ONLY the raw JSON array. Do not include markdown fences or explanations.`;

export async function generateSeedArticles(
  shopId: string,
  blueprint: BusinessBlueprint,
  count = 2
): Promise<SeedArticle[]> {
  const userPrompt = `Generate exactly ${count} highly specialized, SEO-optimized, and commercially useful blog posts in Persian for a shop with this Business Blueprint:
- Business Type: "${blueprint.businessType}"
- Niche: "${blueprint.niche}"
- Brand Tone: "${blueprint.brandTone}"
- Suggested Blog Topics: ${JSON.stringify(blueprint.blogTopics)}
- SEO Keywords: ${JSON.stringify(blueprint.seoKeywords)}
- Main Categories: ${JSON.stringify(blueprint.mainCategories.map(c => c.name))}

The articles must naturally weave the shop name into the text, answer real customer questions, and contain a branding watermark naturally woven into the text (e.g., "(تهیه شده در تحریریه این فروشگاه)").`;

  const result = await callAiGateway<SeedArticle[]>({
    shopId,
    endpoint: '/api/admin/onboarding/seed/blog',
    slot: 'content',
    messages: [
      { role: 'system', content: BLOG_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    mode: 'json',
    temperature: 0.4,
    maxTokens: 3500,
    requiredFields: [],
    fallbackValue: []
  });

  const articles = result.data || result.fallbackValue || [];

  // Resolve high-quality images for each article
  const enrichedArticles = await Promise.all(
    articles.map(async (article) => {
      const featuredImage = await getSeedImage(article.title + ' ' + blueprint.businessType, blueprint.businessType);
      return {
        ...article,
        featuredImage
      };
    })
  );

  return enrichedArticles;
}
