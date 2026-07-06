import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getDemoSeedingData } from '@/lib/demo-data';
import { clearShopDemoDataWithTx } from '@/lib/clear-demo-data';

const generateAiDescription = (shopName: string, businessField: string) => {
  switch (businessField) {
    case 'clothing':
      return `به فروشگاه ${shopName} خوش آمدید. ما با بهره‌گیری از هوش مصنوعی، جدیدترین و باکیفیت‌ترین پوشاک و ترندهای روز مد را متناسب با سلیقه شما گردآوری کرده‌ایم. تجربه خریدی هوشمندانه، سریع و لذت‌بخش در دنیای مد و استایل.`;
    case 'electronics':
      return `فروشگاه ${shopName}، مرجع تخصصی لوازم دیجیتال، موبایل و لوازم جانبی هوشمند. با مشاوره هوش مصنوعی ما، بهترین و مناسب‌ترین گجت‌ها و تجهیزات الکترونیکی را با تضمین اصالت و بهترین قیمت انتخاب کنید.`;
    case 'cosmetics':
      return `فروشگاه زیبایی و سلامت ${shopName}. ارائه طیف گسترده‌ای از محصولات آرایشی، بهداشتی و مراقبت از پوست و مو از برترین برندهای جهان. زیبایی شما، مأموریت هوشمند ماست.`;
    case 'food':
      return `سوپرمارکت آنلاین ${shopName}. خرید آسان و هوشمندانه اقلام روزمره، مواد غذایی تازه و کالاهای مصرفی با ارسال سریع در کمترین زمان ممکن درب منزل شما. خرید خانه را به هوش مصنوعی بسپارید!`;
    case 'education':
      return `فروشگاه کتاب و لوازم‌التحریر ${shopName}. گنجینه‌ای از بهترین کتاب‌های عمومی و تخصصی، بازی‌های فکری و نوشت‌افزارهای مدرن برای ذهن‌های پویا و خلاق.`;
    default:
      return `به فروشگاه هوشمند ${shopName} خوش آمدید. پلتفرم تخصصی ارائه باکیفیت‌ترین محصولات و خدمات با رویکرد نوین و تجربه خریدی بهینه و لذت‌بخش برای مشتریان عزیز.`;
  }
};

export async function POST(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const shopId = decoded.shopId;
    const body = await request.json();
    const { 
      shopName, 
      businessField, 
      themeColor, 
      contactPhone, 
      contactEmail, 
      address, 
      productType,
      shortDescription,
      targetAudience,
      brandTone,
      activityLocation
    } = body;

    if (!shopName || !businessField || !themeColor) {
      return NextResponse.json(
        { error: 'لطفاً نام فروشگاه، زمینه فعالیت و رنگ‌بندی را مشخص کنید.' },
        { status: 400 }
      );
    }

    // Generate smart description based on inputs
    const description = shortDescription || generateAiDescription(shopName, businessField);

    // Fetch hashed password of existing user (admin) to use for sample demo customers
    const adminUser = await prisma.user.findFirst({
      where: { shopId, role: 'admin' }
    });
    const hashedPassword = adminUser?.password || '';

    // Run dynamic setup inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Remove previous demo data only — keep real merchant content intact
      await clearShopDemoDataWithTx(shopId, tx);
      const demoData = await getDemoSeedingData(businessField, shopName, productType || 'digital', {
        shortDescription,
        targetAudience,
        brandTone,
        activityLocation
      });

      // 2. Build custom footer config
      const customFooterConfig = {
        enabled: true,
        theme: 'dark',
        bgColor: themeColor || '#0f172a',
        textColor: '#f8fafc',
        linkColor: '#f8fafc',
        linkHoverColor: '#cbd5e1',
        borderColor: 'rgba(148, 163, 184, 0.15)',
        aboutText: demoData.footerAboutText || `ما در ${shopName} همواره تلاش می‌کنیم تا بهترین و باکیفیت‌ترین محصولات را با مناسب‌ترین قیمت به دست شما برسانیم. رضایت شما بزرگترین سرمایه ماست.`,
        copyrightText: demoData.footerCopyrightText || `تمامی حقوق مادی و معنوی این سایت متعلق به ${shopName} می‌باشد.`,
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

      // 3. Update the Shop Settings
      const shop = await tx.shopSettings.update({
        where: { shopId },
        data: {
          shopName,
          themeColor,
          description,
          contactPhone: contactPhone || undefined,
          contactEmail: contactEmail || undefined,
          address: address || undefined,
          setupWizardCompleted: true,
          hasDemoData: true, // We have successfully seeded field-specific demo data
          productType: productType || 'digital',
          footerConfig: JSON.stringify(customFooterConfig),
          aboutUsPage: demoData.aboutUsPage || undefined,
          termsPage: demoData.termsPage || undefined,
          faqsConfig: demoData.faqsConfig ? JSON.stringify(demoData.faqsConfig) : undefined,
          customHomeConfig: JSON.stringify({
            heroTitle: `به فروشگاه ${shopName} خوش آمدید`,
            heroSubtitle: description || `بهترین و باکیفیت‌ترین محصولات را با مناسب‌ترین قیمت از ما بخواهید.`,
            heroCtaText: 'ورود به فروشگاه',
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

      // 4. Create Categories based on productType
      const isPhysicalEnabled = (productType === 'physical' || productType === 'both');
      const isDigitalEnabled = (productType === 'digital' || productType === 'both');

      let categoryPhysical = null;
      if (isPhysicalEnabled && demoData.physicalCategory) {
        categoryPhysical = await tx.category.create({
          data: {
            shopId,
            name: demoData.physicalCategory.name,
            slug: demoData.physicalCategory.slug,
            isActive: true,
            isDemo: true,
          }
        });
      }

      let categoryDigital = null;
      if (isDigitalEnabled && demoData.digitalCategory) {
        categoryDigital = await tx.category.create({
          data: {
            shopId,
            name: demoData.digitalCategory.name,
            slug: demoData.digitalCategory.slug,
            isActive: true,
            isDemo: true,
          }
        });
      }

      // 5. Create Sample Customers
      const customer1 = await tx.user.create({
        data: {
          email: 'customer1@example.com',
          password: hashedPassword,
          name: 'علی محمدی',
          phone: '09123333333',
          shopId,
          role: 'customer',
          isDemo: true,
        }
      });

      const customer2 = await tx.user.create({
        data: {
          email: 'customer2@example.com',
          password: hashedPassword,
          name: 'زهرا رضایی',
          phone: '09124444444',
          shopId,
          role: 'customer',
          isDemo: true,
        }
      });

      // 6. Create Physical Products (Multiple)
      let firstPhysicalProduct = null;
      const physicalProductsToCreate = demoData.physicalProducts && demoData.physicalProducts.length > 0
        ? demoData.physicalProducts
        : (demoData.physicalProduct ? [demoData.physicalProduct] : []);

      if (categoryPhysical && isPhysicalEnabled && physicalProductsToCreate.length > 0) {
        for (const prod of physicalProductsToCreate) {
          const createdProd = await tx.product.create({
            data: {
              shopId,
              title: prod.title,
              type: 'physical',
              categoryId: categoryPhysical.id,
              price: prod.price,
              discount: prod.discount,
              stock: prod.stock,
              description: prod.description,
              fullDescription: prod.fullDescription,
              features: JSON.stringify(prod.features),
              specs: JSON.stringify(prod.specs),
              galleryUrls: JSON.stringify(prod.galleryUrls),
              imageUrl: prod.imageUrl,
              isActive: true,
              isDemo: true,
              variants: {
                create: (prod.variants || []).map(v => ({
                  shopId,
                  name: v.name,
                  price: v.price,
                  stock: v.stock,
                  colorCode: v.colorCode,
                }))
              }
            }
          });
          if (!firstPhysicalProduct) {
            firstPhysicalProduct = createdProd;
          }
        }
      }

      // 7. Create Digital Products (Multiple)
      let firstDigitalProduct = null;
      const digitalProductsToCreate = demoData.digitalProducts && demoData.digitalProducts.length > 0
        ? demoData.digitalProducts
        : (demoData.digitalProduct ? [demoData.digitalProduct] : []);

      if (categoryDigital && isDigitalEnabled && digitalProductsToCreate.length > 0) {
        for (const prod of digitalProductsToCreate) {
          const createdProd = await tx.product.create({
            data: {
              shopId,
              title: prod.title,
              type: 'digital',
              categoryId: categoryDigital.id,
              price: prod.price,
              discount: prod.discount,
              stock: prod.stock,
              description: prod.description,
              fullDescription: prod.fullDescription,
              features: JSON.stringify(prod.features),
              specs: JSON.stringify(prod.specs),
              galleryUrls: JSON.stringify(prod.galleryUrls),
              imageUrl: prod.imageUrl,
              fileUrl: prod.fileUrl || '/downloads/demo-digital-file.pdf',
              fileFormat: prod.fileFormat || 'PDF',
              fileSize: prod.fileSize || '4.8 MB',
              previewUrl: prod.previewUrl || prod.imageUrl,
              techSpecs: prod.techSpecs || 'قابل اجرا در تمامی دستگاه‌ها.',
              downloadFiles: JSON.stringify(prod.downloadFiles || [
                { name: prod.title, url: '/downloads/demo-digital-file.pdf', size: '4.8 MB', format: 'PDF' }
              ]),
              isActive: true,
              isDemo: true,
            }
          });
          if (!firstDigitalProduct) {
            firstDigitalProduct = createdProd;
          }
        }
      }

      // 8. Create Reviews
      const reviewsToCreate = [];
      if (firstPhysicalProduct && isPhysicalEnabled && demoData.physicalReviews) {
        reviewsToCreate.push(...demoData.physicalReviews.map(r => ({
          shopId,
          productId: firstPhysicalProduct.id,
          userId: r.customerName.includes('امیر') ? customer1.id : customer2.id,
          rating: r.rating,
          comment: r.comment,
          status: 'approved',
          isBuyer: true,
          showOnHomepage: true,
          isDemo: true,
        })));
      }
      if (firstDigitalProduct && isDigitalEnabled && demoData.digitalReviews) {
        reviewsToCreate.push(...demoData.digitalReviews.map(r => ({
          shopId,
          productId: firstDigitalProduct.id,
          userId: r.customerName.includes('امیر') ? customer1.id : customer2.id,
          rating: r.rating,
          comment: r.comment,
          status: 'approved',
          isBuyer: true,
          showOnHomepage: true,
          isDemo: true,
        })));
      }

      if (reviewsToCreate.length > 0) {
        await tx.review.createMany({
          data: reviewsToCreate
        });
      }

      // 9. Recreate Menu Items if deleted or just ensure defaults are active
      await tx.menuItem.deleteMany({ where: { shopId } });
      await tx.menuItem.createMany({
        data: [
          { shopId, title: 'صفحه اصلی', url: '/', order: 1 },
          { shopId, title: 'فروشگاه', url: '/shop', order: 2 },
          { shopId, title: 'وبلاگ', url: '/blog', order: 3 },
        ]
      });

      // 10. Create Blog Category
      const blogCategory = await tx.blogCategory.create({
        data: {
          shopId,
          name: demoData.blogCategory.name,
          slug: demoData.blogCategory.slug,
          description: 'دانستنی‌ها، راهنماها و مقالات تخصصی کسب‌وکار شما',
          isDemo: true,
        }
      });

      // 11. Create Sample Blog Post
      await tx.blogPost.create({
        data: {
          shopId,
          title: demoData.blogPost.title,
          slug: demoData.blogPost.slug,
          summary: demoData.blogPost.summary,
          content: demoData.blogPost.content,
          featuredImage: demoData.blogPost.featuredImage,
          status: 'published',
          publishedAt: new Date(),
          authorId: adminUser?.id || null,
          categoryId: blogCategory.id,
          tags: JSON.stringify(demoData.blogPost.tags),
          seoTitle: demoData.blogPost.seoTitle,
          seoDescription: demoData.blogPost.seoDescription,
          allowComments: true,
          faqs: JSON.stringify(demoData.blogPost.faqs),
          isDemo: true,
        }
      });

      // 12. Create Hero Slides
      if (demoData.slides && demoData.slides.length > 0) {
        await tx.heroSlide.createMany({
          data: demoData.slides.map((s, idx) => ({
            shopId,
            imageUrl: s.imageUrl,
            title: s.title,
            subtitle: s.subtitle,
            linkText: s.linkText,
            linkUrl: s.linkUrl,
            order: idx,
            isActive: true,
            displayLocation: 'both',
            isDemo: true,
          }))
        });
      }

      // 13. Create Stories
      if (demoData.stories && demoData.stories.length > 0) {
        await tx.story.createMany({
          data: demoData.stories.map(s => ({
            shopId,
            title: s.title,
            thumbnailUrl: s.thumbnailUrl,
            mediaUrl: s.mediaUrl,
            mediaType: s.mediaType,
            text: s.text,
            linkText: s.linkText,
            linkUrl: s.linkUrl,
            isActive: true,
            displayLocation: 'both',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isDemo: true,
          }))
        });
      }

      return shop;
    });

    return NextResponse.json({
      success: true,
      message: 'فروشگاه شما با موفقیت و بر اساس هوش مصنوعی پیکربندی شد.',
      shop: result
    });

  } catch (error) {
    console.error('Error in setup-wizard API:', error);
    return NextResponse.json(
      { error: 'خطایی در ثبت تنظیمات هوش مصنوعی فروشگاه رخ داد.' },
      { status: 500 }
    );
  }
}
