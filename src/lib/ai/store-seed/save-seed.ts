import { prisma } from '@/lib/prisma';
import { embedProduct } from '@/lib/product-embedding';
import { updateSeedJob } from './profile';
import { SeedProduct, SeedArticle, SeedHomepage, BusinessBlueprint } from './types';

/**
 * Safely saves the generated seed preview data to the database inside a transaction.
 * Marks all created records with isSampleData = true, generatedByAi = true, and seedJobId.
 */
export async function saveSeedData(
  shopId: string,
  jobId: string,
  blueprint: BusinessBlueprint,
  categories: { name: string; slug: string }[],
  products: SeedProduct[],
  articles: SeedArticle[],
  homepage: SeedHomepage,
  shopSettings: {
    shopName: string;
    themeColor: string;
    contactPhone?: string;
    contactEmail?: string;
    address?: string;
  }
) {
  const { shopName, themeColor, contactPhone, contactEmail, address } = shopSettings;

  // 1. Fetch hashed password of existing admin to use for sample customer
  const adminUser = await prisma.user.findFirst({
    where: { shopId, role: 'admin' }
  });
  const hashedPassword = adminUser?.password || '$2a$10$X7mG6pXW4p9m8P5d8q6V7O'; // Fallback dummy hash

  const createdProductIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    // A. Clear any existing sample data first to avoid duplicates
    await deleteSampleDataWithTx(shopId, tx);

    // B. Create Categories
    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      const createdCat = await tx.category.create({
        data: {
          shopId,
          name: cat.name,
          slug: cat.slug,
          isActive: true,
          isDemo: true,
          isSampleData: true,
          generatedByAi: true,
          seedJobId: jobId
        }
      });
      categoryMap.set(cat.name, createdCat.id);
    }

    // C. Create Products
    for (const prod of products) {
      const categoryId = categoryMap.get(prod.category) || null;
      const createdProd = await tx.product.create({
        data: {
          shopId,
          title: prod.title,
          type: prod.type || 'physical',
          categoryId,
          description: prod.description,
          price: prod.price,
          discount: prod.compareAtPrice > prod.price ? prod.compareAtPrice - prod.price : 0,
          imageUrl: prod.imageUrl,
          galleryUrls: JSON.stringify(prod.galleryUrls || []),
          stock: prod.stock,
          brand: blueprint.niche,
          seoTitle: prod.seoTitle,
          seoDescription: prod.seoDescription,
          isDemo: true,
          isSampleData: true,
          generatedByAi: true,
          seedJobId: jobId
        }
      });

      createdProductIds.push(createdProd.id);

      // Create product variants if any
      if (prod.variants && prod.variants.length > 0) {
        for (const variant of prod.variants) {
          await tx.productVariant.create({
            data: {
              shopId,
              productId: createdProd.id,
              name: variant.name,
              price: variant.price,
              stock: variant.stock,
              colorCode: variant.colorCode || null
            }
          });
        }
      }
    }

    // D. Create Blog Posts
    let blogCategory = await tx.blogCategory.findFirst({
      where: { shopId, slug: 'articles' }
    });

    if (!blogCategory) {
      blogCategory = await tx.blogCategory.create({
        data: {
          shopId,
          name: 'مقالات علمی و راهنما',
          slug: 'articles',
          isDemo: true
        }
      });
    }

    for (const article of articles) {
      await tx.blogPost.create({
        data: {
          shopId,
          title: article.title,
          slug: article.slug,
          content: article.content,
          summary: article.excerpt,
          featuredImage: article.featuredImage,
          status: 'published',
          categoryId: blogCategory.id,
          tags: JSON.stringify(article.keywords || []),
          seoTitle: article.seoTitle,
          seoDescription: article.seoDescription,
          isDemo: true,
          isSampleData: true,
          generatedByAi: true,
          seedJobId: jobId
        }
      });
    }

    // E. Create Sample Customer & Reviews
    const sampleCustomer = await tx.user.create({
      data: {
        email: 'sample.customer@example.com',
        password: hashedPassword,
        name: 'امیرحسین رضایی',
        phone: '09121111111',
        shopId,
        role: 'customer',
        isDemo: true
      }
    });

    if (createdProductIds.length > 0) {
      await tx.review.create({
        data: {
          shopId,
          productId: createdProductIds[0],
          userId: sampleCustomer.id,
          rating: 5,
          comment: 'بسیار عالی و باکیفیت بود، دقیقاً مطابق توضیحات صنف ما. ارسال هم خیلی سریع انجام شد. ممنون از فروشگاه خوبتون.',
          status: 'approved',
          isBuyer: true,
          showOnHomepage: true,
          isDemo: true
        }
      });
    }

    // F. Create Hero Slides / Banners
    for (const banner of homepage.banners) {
      await tx.heroSlide.create({
        data: {
          shopId,
          imageUrl: banner.imageUrl || '',
          title: banner.title,
          subtitle: banner.subtitle,
          linkUrl: '/shop',
          linkText: 'مشاهده محصولات',
          isDemo: true,
        }
      });
    }

    // G. Update Shop Settings & Homepage Layout
    const customFooterConfig = {
      enabled: true,
      theme: 'dark',
      bgColor: themeColor || '#0f172a',
      textColor: '#f8fafc',
      linkColor: '#f8fafc',
      linkHoverColor: '#cbd5e1',
      borderColor: 'rgba(148, 163, 184, 0.15)',
      aboutText: homepage.aboutShort,
      copyrightText: `تمامی حقوق مادی و معنوی این سایت متعلق به ${shopName} می‌باشد.`,
      showSocials: true,
      socials: [
        { platform: 'instagram', url: 'https://instagram.com', enabled: true },
        { platform: 'telegram', url: 'https://t.me', enabled: true },
        { platform: 'whatsapp', url: 'https://wa.me', enabled: true },
      ],
      showContactInfo: true,
      contactEmail: contactEmail || 'support@example.com',
      contactPhone: contactPhone || '09123456789',
      contactAddress: address || '',
      columns: [
        {
          id: 'col-1',
          title: 'راهنمای خرید',
          links: [
            { id: 'link-1-1', label: 'نحوه ثبت سفارش', url: '/pages/how-to-order', target: '_self' },
            { id: 'link-1-2', label: 'رویه پرداخت', url: '/pages/payment-methods', target: '_self' },
            { id: 'link-1-3', label: 'شیوه‌های ارسال', url: '/pages/shipping-methods', target: '_self' },
          ],
        },
        {
          id: 'col-2',
          title: 'خدمات مشتریان',
          links: [
            { id: 'link-2-1', label: 'پاسخ به پرسش‌های متداول', url: '/faq', target: '_self' },
            { id: 'link-2-2', label: 'رویه بازگرداندن کالا', url: '/pages/returns', target: '_self' },
            { id: 'link-2-3', label: 'شرایط و قوانین', url: '/pages/terms', target: '_self' },
          ],
        },
        {
          id: 'col-3',
          title: 'دسترسی سریع',
          links: [
            { id: 'link-3-1', label: 'فروشگاه', url: '/shop', target: '_self' },
            { id: 'link-3-2', label: 'وبلاگ', url: '/blog', target: '_self' },
            { id: 'link-3-3', label: 'درباره ما', url: '/pages/about-us', target: '_self' },
            { id: 'link-3-4', label: 'تماس با ما', url: '/pages/contact-us', target: '_self' },
          ],
        },
      ],
      badges: [],
      customHtml: '',
    };

    await tx.shopSettings.update({
      where: { shopId },
      data: {
        shopName,
        themeColor,
        description: homepage.aboutShort,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        address: address || undefined,
        setupWizardCompleted: true,
        hasDemoData: true,
        footerConfig: JSON.stringify(customFooterConfig),
        faqsConfig: JSON.stringify(homepage.faqs || []),
        customHomeConfig: JSON.stringify({
          heroTitle: homepage.hero.title,
          heroSubtitle: homepage.hero.subtitle,
          heroCtaText: homepage.hero.ctaText,
          heroCtaUrl: '/shop',
          showStories: true,
          showSlider: true,
          showHero: true,
          showCategoryQuickAccess: true,
          showReviews: true,
          showBlog: true,
          showFeatures: true,
          showShoppable: true,
        }),
      }
    });
  });

  console.log(`[SHOP SEED] categories created count: ${categories.length}`);
  console.log(`[SHOP SEED] products created count: ${createdProductIds.length}`);

  // 2. Trigger product embedding asynchronously (non-blocking)
  if (createdProductIds.length > 0) {
    Promise.allSettled(
      createdProductIds.map((id) => embedProduct(id, shopId))
    ).catch((err) => {
      console.error('[saveSeedData] Failed to embed products:', err);
    });
  }

  // 3. Update seed job status to saved
  await updateSeedJob(jobId, {
    status: 'saved',
    progress: 100
  });

  return { success: true, createdProductIds };
}

/**
 * Safely deletes only AI-generated sample data for a shop.
 * Never touches real user-created data.
 */
export async function deleteSampleData(shopId: string) {
  await prisma.$transaction(async (tx) => {
    await deleteSampleDataWithTx(shopId, tx);
  });
}

async function deleteSampleDataWithTx(shopId: string, tx: any) {
  // A. Find sample products to delete their variants, cartItems, etc.
  const sampleProducts = await tx.product.findMany({
    where: { shopId, isSampleData: true, generatedByAi: true },
    select: { id: true }
  });
  const sampleProductIds = sampleProducts.map((p: any) => p.id);

  if (sampleProductIds.length > 0) {
    await tx.cartItem.deleteMany({
      where: { shopId, productId: { in: sampleProductIds } }
    });
    await tx.productNotificationRequest.deleteMany({
      where: { shopId, productId: { in: sampleProductIds } }
    });
    await tx.orderItem.deleteMany({
      where: { shopId, productId: { in: sampleProductIds } }
    });
    await tx.productSetItem.deleteMany({
      where: { shopId, productId: { in: sampleProductIds } }
    });
    await tx.productVariant.deleteMany({
      where: { shopId, productId: { in: sampleProductIds } }
    });
    await tx.review.deleteMany({
      where: { shopId, productId: { in: sampleProductIds } }
    });
    await tx.product.deleteMany({
      where: { shopId, id: { in: sampleProductIds } }
    });
  }

  // B. Delete sample blog posts
  await tx.blogPost.deleteMany({
    where: { shopId, isSampleData: true, generatedByAi: true }
  });

  // C. Delete sample categories
  await tx.category.deleteMany({
    where: { shopId, isSampleData: true, generatedByAi: true }
  });

  // D. Delete sample hero slides
  await tx.heroSlide.deleteMany({
    where: { shopId, isDemo: true }
  });

  // E. Delete sample customer user
  await tx.user.deleteMany({
    where: { shopId, email: 'sample.customer@example.com', isDemo: true }
  });

  // F. Update shop settings hasDemoData flag
  await tx.shopSettings.update({
    where: { shopId },
    data: { hasDemoData: false }
  });
}
