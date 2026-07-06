import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { hashOtp } from '@/lib/sms';

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
      // Check if the owner's phone or email matches this existing shop (recovery from previous timeout)
      const matchingUser = await prisma.user.findFirst({
        where: {
          shopId: existingShop.shopId,
          OR: [
            { email: ownerEmail.toLowerCase().trim() },
            { phone: normalizedPhone }
          ]
        },
        allowCrossTenant: true
      } as any);

      if (matchingUser) {
        // The same owner is retrying after a previous successful creation (e.g., due to client-side timeout)
        return NextResponse.json({
          alreadyCreated: true,
          shop: {
            shopId: existingShop.shopId,
            shopName: existingShop.shopName,
            subdomain: existingShop.subdomain,
          },
          owner: {
            name: matchingUser.name,
            email: matchingUser.email,
          }
        });
      }

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

    if (otpRecord.attempts >= 5) {
      await prisma.otp.deleteMany({
        where: {
          phone: normalizedPhone,
          shopId: 'saas_platform',
        },
      });
      return NextResponse.json(
        { error: 'این کد تایید به دلیل تلاش‌های ناموفق مکرر مسدود شده است. لطفاً مجدداً کد جدید دریافت کنید.' },
        { status: 400 }
      );
    }

    const isMatch = otpRecord.code === hashOtp(otpCode);

    if (!isMatch) {
      const newAttempts = otpRecord.attempts + 1;
      if (newAttempts >= 5) {
        await prisma.otp.deleteMany({
          where: {
            phone: normalizedPhone,
            shopId: 'saas_platform',
          },
        });
        return NextResponse.json(
          { error: 'این کد تایید به دلیل تلاش‌های ناموفق مکرر مسدود شده است. لطفاً مجدداً کد جدید دریافت کنید.' },
          { status: 400 }
        );
      }

      await prisma.otp.update({
        where: { id: otpRecord.id },
        data: { attempts: newAttempts },
      });

      return NextResponse.json(
        { error: `کد تایید وارد شده نادرست است. تعداد تلاش‌های باقی‌مانده: ${5 - newAttempts}` },
        { status: 400 }
      );
    }

    // Generate unique shopId
    const shopId = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

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
        bgColor: '#0f172a',
        textColor: '#f8fafc',
        linkColor: '#f8fafc',
        linkHoverColor: '#cbd5e1',
        borderColor: 'rgba(148, 163, 184, 0.15)',
        aboutText: `ما در ${shopName} همواره تلاش می‌کنیم تا بهترین و باکیفیت‌ترین محصولات را با مناسب‌ترین قیمت به دست شما برسانیم. رضایت شما بزرگترین سرمایه ماست.`,
        copyrightText: `تمامی حقوق مادی و معنوی این سایت متعلق به ${shopName} می‌باشد.`,
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
          themeColor: '#2563eb', // Default blue theme
          currency: 'IRT', // Default Iranian Toman
          language: 'fa',
          homePageType: 'custom',
          hasDemoData: false, // Starts without demo data, completed via setup wizard
          setupWizardCompleted: false,
          footerConfig: JSON.stringify(customFooterConfig),
          customHomeConfig: JSON.stringify({
            heroTitle: `به فروشگاه ${shopName} خوش آمدید`,
            heroSubtitle: `بهترین و باکیفیت‌ترین محصولات را با مناسب‌ترین قیمت از ما بخواهید.`,
            heroCtaText: 'ورود به فروشگاه',
            heroCtaUrl: '/shop',
            showStories: true,
            showSlider: true,
            showHero: true,
            showWelcomeBanner: true,
            welcomeTitle: `به فروشگاه رسمی ${shopName} خوش آمدید`,
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

      // 3. Create default Menu Items
      await tx.menuItem.createMany({
        data: [
          { shopId, title: 'صفحه اصلی', url: '/', order: 1 },
          { shopId, title: 'فروشگاه', url: '/shop', order: 2 },
          { shopId, title: 'وبلاگ', url: '/blog', order: 3 },
        ]
      });

      // 4. Initialize Shop Seed Profile
      await tx.shopSeedProfile.create({
        data: {
          shopId,
          businessType: businessField,
          niche: '',
          targetAudience: '[]',
          priceLevel: 'medium',
          brandTone: 'trust',
          mainCategories: '[]',
          source: 'onboarding'
        }
      });

      // 5. Initialize Shop Seed Job
      await tx.shopSeedJob.create({
        data: {
          shopId,
          status: 'pending',
          progress: 0
        }
      });

      // 6. Delete OTP record
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
