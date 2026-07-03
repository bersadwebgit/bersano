import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getOrCreateSeedProfile, getOrCreateSeedJob, updateSeedJob } from '@/lib/ai/store-seed/profile';
import { generateBusinessBlueprint } from '@/lib/ai/store-seed/blueprint';
import { generateSeedProducts } from '@/lib/ai/store-seed/products';
import { generateSeedArticles } from '@/lib/ai/store-seed/blog';
import { generateSeedHomepage } from '@/lib/ai/store-seed/homepage';
import { validateProduct, validateArticle } from '@/lib/ai/store-seed/validators';

export async function POST(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const shopId = decoded.shopId;
    const body = await request.json();

    console.log(`[SHOP SEED] preview started for shop: ${shopId}`);

    // 1. Get or create seed profile and job
    const profile = await getOrCreateSeedProfile(shopId, body);
    const job = await getOrCreateSeedJob(shopId);

    await updateSeedJob(job.id, {
      status: 'pending',
      phase: 'generating_blueprint',
      progress: 10
    });

    // 2. Generate or fetch blueprint
    const blueprint = await generateBusinessBlueprint(shopId, {
      shopName: body.shopName || 'فروشگاه من',
      description: body.shortDescription || '',
      businessField: body.businessField || 'general',
      productType: body.productType || 'physical',
      shortDescription: body.shortDescription || '',
      targetAudience: body.targetAudience || '',
      brandTone: body.brandTone || '',
      activityLocation: body.activityLocation || ''
    });

    console.log(`[SHOP SEED] blueprint generated for shop: ${shopId}`);
    console.log(`[SHOP SEED] confidence: ${blueprint.confidence}`);

    // 3. Check confidence rule
    if (blueprint.confidence < 0.65) {
      await updateSeedJob(job.id, {
        status: 'failed',
        phase: 'unclear_input',
        progress: 100,
        error: 'اطلاعات وارد شده کافی نیست.'
      });

      return NextResponse.json({
        jobId: job.id,
        blueprint,
        categories: [],
        products: [],
        articles: [],
        homepage: {},
        warnings: ['اطلاعات وارد شده برای تولید هوشمند محتوا کافی نیست.'],
        requiresMoreInfo: true,
        questions: blueprint.questionsIfUnclear || [
          'فروشگاه شما بیشتر چه محصولاتی می‌فروشد؟',
          'مشتری اصلی شما کیست؟',
          'سطح قیمت محصولات شما اقتصادی، متوسط یا لوکس است؟',
          'سه دسته اصلی فروشگاه را بنویسید.',
          'لحن برند شما رسمی، دوستانه، لوکس یا فانتزی است؟'
        ]
      });
    }

    // 4. Generate categories, products, articles, and homepage
    await updateSeedJob(job.id, {
      status: 'pending',
      phase: 'generating_products',
      progress: 40
    });

    const categories = blueprint.mainCategories.map(c => ({ name: c.name, slug: c.slug }));
    const products = await generateSeedProducts(shopId, blueprint, body.productType || 'physical');

    await updateSeedJob(job.id, {
      status: 'pending',
      phase: 'generating_blog',
      progress: 70
    });

    const articles = await generateSeedArticles(shopId, blueprint);

    await updateSeedJob(job.id, {
      status: 'pending',
      phase: 'generating_homepage',
      progress: 90
    });

    const homepage = await generateSeedHomepage(shopId, blueprint);

    console.log(`[SHOP SEED] products generated count: ${products.length}`);

    // 5. Validate generated products and articles
    const warnings: string[] = [];
    const validProducts = products.filter(p => {
      const { valid, issues } = validateProduct(p, blueprint, body.businessField || 'general');
      if (!valid) {
        console.warn(`[SHOP SEED] Product validation failed for "${p.title}":`, JSON.stringify(issues));
        issues.forEach(issue => warnings.push(`محصول "${p.title}": ${issue.message}`));
      }
      return valid;
    });

    console.log(`[SHOP SEED] products valid count: ${validProducts.length}`);

    const validArticles = articles.filter(a => {
      const { valid, issues } = validateArticle(a);
      if (!valid) {
        issues.forEach(issue => warnings.push(`مقاله "${a.title}": ${issue.message}`));
      }
      return valid;
    });

    const previewData = {
      jobId: job.id,
      blueprint,
      categories,
      products: validProducts,
      articles: validArticles,
      homepage,
      warnings,
      requiresMoreInfo: false,
      questions: []
    };

    // 6. Update seed job to preview_ready
    await updateSeedJob(job.id, {
      status: 'preview_ready',
      phase: 'completed',
      progress: 100,
      previewJson: previewData
    });

    return NextResponse.json(previewData);
  } catch (error: any) {
    console.error('[API Preview] Error:', error);
    return NextResponse.json({ error: error?.message || 'خطایی در تولید پیش‌نمایش رخ داد.' }, { status: 500 });
  }
}
