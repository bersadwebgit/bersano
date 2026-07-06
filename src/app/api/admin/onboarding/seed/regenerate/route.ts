import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

    // 1. Create a fresh seed job
    const job = await prisma.shopSeedJob.create({
      data: {
        shopId,
        status: 'pending',
        progress: 0
      }
    });

    await updateSeedJob(job.id, {
      status: 'pending',
      phase: 'generating_blueprint',
      progress: 10
    });

    // 2. Generate blueprint
    const blueprint = await generateBusinessBlueprint(shopId, {
      shopName: body.shopName || 'فروشگاه من',
      description: body.shortDescription || '',
      businessField: body.businessField || 'general',
      productType: body.productType || 'digital',
      shortDescription: body.shortDescription || '',
      targetAudience: body.targetAudience || '',
      brandTone: body.brandTone || '',
      activityLocation: body.activityLocation || ''
    });

    // 3. Generate categories, products, articles, and homepage
    await updateSeedJob(job.id, {
      status: 'pending',
      phase: 'generating_products',
      progress: 40
    });

    const categories = blueprint.mainCategories.map(c => ({ name: c.name, slug: c.slug }));
    const products = await generateSeedProducts(shopId, blueprint, body.productType || 'digital');

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

    // 4. Validate generated products and articles
    const warnings: string[] = [];
    const validProducts = products.filter(p => {
      const { valid, issues } = validateProduct(p, blueprint, body.businessField || 'general');
      if (!valid) {
        issues.forEach(issue => warnings.push(`محصول "${p.title}": ${issue.message}`));
      }
      return valid;
    });

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

    // 5. Update seed job to preview_ready
    await updateSeedJob(job.id, {
      status: 'preview_ready',
      phase: 'completed',
      progress: 100,
      previewJson: previewData
    });

    return NextResponse.json(previewData);
  } catch (error: any) {
    console.error('[API Regenerate] Error:', error);
    return NextResponse.json({ error: error?.message || 'خطایی در بازتولید پیش‌نمایش رخ داد.' }, { status: 500 });
  }
}
