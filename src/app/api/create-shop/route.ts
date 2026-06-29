import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getDemoSeedingData } from '@/lib/demo-data';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopName, subdomain, ownerName, ownerEmail, ownerPassword, contactPhone, otpCode, businessField = 'general' } = body;

    // Validation
    if (!shopName || !subdomain || !ownerEmail || !ownerPassword || !ownerName || !contactPhone || !otpCode) {
      return NextResponse.json(
        { error: 'لطفاً تمامی فیلدهای ستاره‌دار را پر کنید.' },
        { status: 400 }
      );
    }

    // Normalize phone number
    let normalizedPhone = contactPhone.trim();
    if (normalizedPhone.startsWith('+98')) {
      normalizedPhone = '0' + normalizedPhone.substring(3);
    } else if (normalizedPhone.startsWith('98') && normalizedPhone.length === 11) {
      normalizedPhone = '0' + normalizedPhone.substring(2);
    } else if (normalizedPhone.startsWith('9') && normalizedPhone.length === 10) {
      normalizedPhone = '0' + normalizedPhone;
    }

    const iranPhoneRegex = /^09\d{9}$/;
    if (!iranPhoneRegex.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'شماره موبایل وارد شده معتبر نیست.' },
        { status: 400 }
      );
    }

    // Validate subdomain format (only alphanumeric and hyphens, no spaces, lowercase)
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { error: 'ساب‌دامین فقط می‌تواند شامل حروف کوچک انگلیسی، اعداد و خط تیره (-) باشد.' },
        { status: 400 }
      );
    }

    // Check if subdomain is reserved or already exists
    const reservedSubdomains = ['admin', 'super-admin', 'api', 'www', 'mail', 'blog', 'shop', 'setup'];
    if (reservedSubdomains.includes(subdomain.toLowerCase())) {
      return NextResponse.json(
        { error: 'این ساب‌دامین رزرو شده است و قابل استفاده نیست.' },
        { status: 400 }
      );
    }

    // 1. Check duplicate subdomain
    const existingShop = await prisma.shopSettings.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
      allowCrossTenant: true
    } as any);

    if (existingShop) {
      return NextResponse.json(
        { error: 'این ساب‌دامین قبلاً ثبت شده است. لطفاً نام دیگری انتخاب کنید.' },
        { status: 400 }
      );
    }

    // 2. Check duplicate email among admins
    const existingUserByEmail = await prisma.user.findFirst({
      where: { 
        email: ownerEmail.toLowerCase().trim(),
        role: 'admin'
      },
      allowCrossTenant: true
    } as any);

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'این ایمیل قبلاً برای یک فروشگاه دیگر ثبت شده است.' },
        { status: 400 }
      );
    }

    // 3. Check duplicate phone among admins
    const existingUserByPhone = await prisma.user.findFirst({
      where: { 
        phone: normalizedPhone,
        role: 'admin'
      },
      allowCrossTenant: true
    } as any);

    if (existingUserByPhone) {
      return NextResponse.json(
        { error: 'این شماره موبایل قبلاً برای یک فروشگاه دیگر ثبت شده است.' },
        { status: 400 }
      );
    }

    // 4. Verify OTP Code
    const now = new Date();
    const otpRecord = await prisma.otp.findFirst({
      where: {
        phone: normalizedPhone,
        shopId: 'saas_platform',
        code: otpCode.trim(),
        expiresAt: {
          gt: now
        }
      }
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'کد تایید پیامک شده اشتباه یا منقضی شده است.' },
        { status: 400 }
      );
    }

    // Generate unique shopId
    const shopId = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);
    const customField = body.customBusinessField?.trim() || (businessField === 'general' ? shopName : '');
    const demoData = await getDemoSeedingData(businessField, customField, 'both');

    // Create Shop and User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Owner User
      const user = await tx.user.create({
        data: {
          email: ownerEmail.toLowerCase(),
          password: hashedPassword,
          name: ownerName,
          phone: normalizedPhone,
          shopId,
          role: 'admin',
        }
      });

      const customFooterConfig = {
        enabled: true,
        theme: 'dark',
        bgColor: demoData.themeColor || '#0f172a',
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
        contactEmail: ownerEmail.toLowerCase(),
        contactPhone: normalizedPhone,
        contactAddress: '',
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

      // 2. Create the Shop Settings
      const shop = await tx.shopSettings.create({
        data: {
          shopId,
          shopName,
          subdomain: subdomain.toLowerCase(),
          contactEmail: ownerEmail.toLowerCase(),
          contactPhone: normalizedPhone,
          isApproved: true, // Newly registered shops start as active/approved by default
          isActive: true,
          themeColor: demoData.themeColor, // Customized based on business field
          currency: 'IRT', // Default Iranian Toman
          language: 'fa',
          homePageType: 'custom',
          hasDemoData: true,
          footerConfig: JSON.stringify(customFooterConfig),
          aboutUsPage: demoData.aboutUsPage || undefined,
          termsPage: demoData.termsPage || undefined,
          faqsConfig: demoData.faqsConfig ? JSON.stringify(demoData.faqsConfig) : undefined,
          customHomeConfig: JSON.stringify({
            heroTitle: `به فروشگاه ${shopName} خوش آمدید`,
            heroSubtitle: `بهترین و باکیفیت‌ترین محصولات را با مناسب‌ترین قیمت از ما بخواهید.`,
            heroCtaText: 'ورود به فروشگاه',
            heroCtaUrl: '/shop',
            showStories: true,
            showSlider: true,
            showHero: true,
            showWelcomeBanner: true,
            welcomeTitle: 'به فروشگاه رسمی {shopName} خوش آمدید',
            welcomeFeature1: 'ضمانت اصالت کالا',
            welcomeFeature2: 'پشتیبانی سریع',
            welcomeFeature3: 'ارسال به سراسر کشور',
            showCategoryQuickAccess: true,
            showReviews: true,
            showBlog: true,
            showFeatures: true,
            showShoppable: true,
          }),
        }
      });

      // 3. Create Categories
      const categoryPhysical = await tx.category.create({
        data: {
          shopId,
          name: demoData.physicalCategory.name,
          slug: demoData.physicalCategory.slug,
          isActive: true,
          isDemo: true,
        }
      });

      const categoryDigital = await tx.category.create({
        data: {
          shopId,
          name: demoData.digitalCategory.name,
          slug: demoData.digitalCategory.slug,
          isActive: true,
          isDemo: true,
        }
      });

      // 4. Create Sample Customer Users for reviews
      const customer1 = await tx.user.create({
        data: {
          email: 'amir@example.com',
          password: hashedPassword,
          name: 'امیرحسین رضایی',
          phone: '09121111111',
          shopId,
          role: 'customer',
          isDemo: true,
        }
      });

      const customer2 = await tx.user.create({
        data: {
          email: 'maryam@example.com',
          password: hashedPassword,
          name: 'مریم حسینی',
          phone: '09122222222',
          shopId,
          role: 'customer',
          isDemo: true,
        }
      });

      // 5. Create Physical Products (Multiple)
      let firstPhysicalProduct = null;
      const physicalProductsToCreate = demoData.physicalProducts && demoData.physicalProducts.length > 0
        ? demoData.physicalProducts
        : (demoData.physicalProduct ? [demoData.physicalProduct] : []);

      if (physicalProductsToCreate.length > 0) {
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

      // 6. Create Digital Products (Multiple)
      let firstDigitalProduct = null;
      const digitalProductsToCreate = demoData.digitalProducts && demoData.digitalProducts.length > 0
        ? demoData.digitalProducts
        : (demoData.digitalProduct ? [demoData.digitalProduct] : []);

      if (digitalProductsToCreate.length > 0) {
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

      // 7. Create Reviews for Physical Product
      if (firstPhysicalProduct) {
        await tx.review.createMany({
          data: demoData.physicalReviews.map(r => ({
            shopId,
            productId: firstPhysicalProduct.id,
            userId: r.customerName === 'امیرحسین رضایی' ? customer1.id : customer2.id,
            rating: r.rating,
            comment: r.comment,
            status: 'approved',
            isBuyer: true,
            showOnHomepage: true,
            isDemo: true,
          }))
        });
      }

      // 8. Create Reviews for Digital Product
      if (firstDigitalProduct) {
        await tx.review.createMany({
          data: demoData.digitalReviews.map(r => ({
            shopId,
            productId: firstDigitalProduct.id,
            userId: r.customerName === 'امیرحسین رضایی' ? customer1.id : customer2.id,
            rating: r.rating,
            comment: r.comment,
            status: 'approved',
            isBuyer: true,
            showOnHomepage: true,
            isDemo: true,
          }))
        });
      }

      // 9. Create default Menu Items
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
          description: 'مطالب، راهنماها و آموزش‌های تخصصی متناسب با کسب‌وکار شما',
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
          authorId: user.id,
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
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // expires in 30 days
            isDemo: true,
          }))
        });
      }

      // 14. Delete OTP record as the last step of the transaction to prevent replay only after successful shop creation
      await tx.otp.deleteMany({
        where: {
          phone: normalizedPhone,
          shopId: 'saas_platform'
        }
      });

      return { user, shop };
    });

    return NextResponse.json({
      success: true,
      shop: {
        shopId: result.shop.shopId,
        shopName: result.shop.shopName,
        subdomain: result.shop.subdomain,
      },
      owner: {
        name: result.user.name,
        email: result.user.email,
      }
    });

  } catch (error) {
    console.error('Error creating shop dynamically:', error);
    return NextResponse.json(
      { error: 'خطایی در سرور رخ داد. لطفاً مجدداً تلاش کنید.' },
      { status: 500 }
    );
  }
}
