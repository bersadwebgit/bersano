import { callAiGateway } from '@/lib/ai-gateway';
import { BusinessBlueprint, SeedHomepage } from './types';
import { getSeedImage } from './image-queries';

const HOMEPAGE_SYSTEM_PROMPT = `You are generating specialized Persian homepage content for an ecommerce store.

Use the Business Blueprint, niche, and brand tone strictly.
Never generate generic homepage text.
Match the shop niche and customer type.
Trust badges must make sense for the industry.
Example:
- coffee: تازگی رست، ارسال سریع، بسته‌بندی بهداشتی
- cosmetics: ضمانت اصالت، مناسب نوع پوست، مشاوره خرید
- clothing: راهنمای سایز، امکان تعویض، تنوع رنگ

You MUST return a valid JSON object matching this structure:
{
  "hero": {
    "title": "Persian hero title (e.g. تجربه طعم واقعی قهوه تازه رست)",
    "subtitle": "Persian hero subtitle",
    "ctaText": "Persian CTA button text (e.g. ورود به فروشگاه)"
  },
  "banners": [
    {
      "title": "Banner Title in Persian",
      "subtitle": "Banner Subtitle in Persian",
      "imageSearchQueryEn": "Specific English query for Pexels search (e.g. minimal skincare serum bottle)",
      "imageAltFa": "Persian image alt text"
    }
  ],
  "aboutShort": "A short, persuasive brand bio in Persian (1-2 paragraphs) explaining who you are and your values",
  "faqs": [
    { "question": "Persian question", "answer": "Persian answer" }
  ],
  "trustBadges": ["Badge 1 (e.g. ضمانت اصالت)", "Badge 2", "Badge 3"]
}

Return ONLY the raw JSON object. Do not include markdown fences or explanations.`;

export async function generateSeedHomepage(
  shopId: string,
  blueprint: BusinessBlueprint
): Promise<SeedHomepage> {
  const userPrompt = `Generate specialized homepage content, FAQs, and trust badges in Persian for a shop with this Business Blueprint:
- Business Type: "${blueprint.businessType}"
- Niche: "${blueprint.niche}"
- Brand Tone: "${blueprint.brandTone}"
- Suggested HomePage Sections: ${JSON.stringify(blueprint.homePageSections)}

Ensure the FAQs and trust badges are highly relevant to the industry. For example, if the industry is cosmetics, trust badges should focus on authenticity, skin compatibility, and purchase consultation.`;

  const result = await callAiGateway<SeedHomepage>({
    shopId,
    endpoint: '/api/admin/onboarding/seed/homepage',
    slot: 'simple',
    messages: [
      { role: 'system', content: HOMEPAGE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    mode: 'json',
    temperature: 0.3,
    maxTokens: 2000,
    requiredFields: ['hero', 'banners', 'aboutShort', 'faqs', 'trustBadges'],
    fallbackValue: {
      hero: {
        title: `به فروشگاه تخصصی ما خوش آمدید`,
        subtitle: `ارائه‌دهنده باکیفیت‌ترین محصولات متناسب با سلیقه شما.`,
        ctaText: 'مشاهده محصولات'
      },
      banners: [
        {
          title: 'تخفیف ویژه اولین خرید',
          subtitle: 'با کد تخفیف WELCOME صاحب ۱۰٪ تخفیف روی سبد خرید خود شوید.',
          imageSearchQueryEn: 'shopping sale banner minimal',
          imageAltFa: 'بنر تخفیف ویژه اولین خرید'
        }
      ],
      aboutShort: `ما در این فروشگاه همواره تلاش می‌کنیم تا بهترین و باکیفیت‌ترین محصولات را با مناسب‌ترین قیمت به دست شما برسانیم. رضایت شما بزرگترین سرمایه ماست.`,
      faqs: [
        { question: 'رویه ارسال سفارشات چگونه است؟', answer: 'سفارشات شما از طریق پست پیشتاز و تیپاکس در سریع‌ترین زمان ممکن ارسال می‌شوند.' },
        { question: 'آیا امکان مرجوعی کالا وجود دارد؟', answer: 'بله، در صورت بروز هرگونه مشکل یا عدم رضایت، امکان مرجوعی کالا تا ۷ روز وجود دارد.' }
      ],
      trustBadges: ['ضمانت اصالت کالا', 'ارسال سریع به سراسر کشور', '۷ روز ضمانت بازگشت']
    }
  });

  const homepage = result.data || result.fallbackValue;

  // Resolve high-quality images for banners
  const enrichedBanners = await Promise.all(
    homepage.banners.map(async (banner) => {
      const imageUrl = await getSeedImage(banner.imageSearchQueryEn, blueprint.businessType);
      return {
        ...banner,
        imageUrl
      };
    })
  );

  return {
    ...homepage,
    banners: enrichedBanners
  };
}
