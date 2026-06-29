import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import { getTenantShop } from '@/lib/tenant';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Home, FileText, ShieldAlert, Phone, Search } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { parseFooterConfig } from '@/types/footer';
import { parseAboutUsConfig } from '@/types/about-us';
import AboutUsClient from '@/components/AboutUsClient';
import { parseContactUsConfig } from '@/types/contact-us';
import ContactUsClient from '@/components/ContactUsClient';
import ContactUsTrackClient from '@/components/ContactUsTrackClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const shop = await getTenantShop(undefined, true);
  if (!shop) return { title: 'صفحه پیدا نشد' };

  let title = `شرایط و قوانین - ${shop.shopName}`;
  if (slug === 'about-us') {
    title = `درباره ما - ${shop.shopName}`;
  } else if (slug === 'contact-us') {
    title = `تماس با ما - ${shop.shopName}`;
  } else if (slug === 'contact-us-track') {
    title = `پیگیری پیام تماس با ما - ${shop.shopName}`;
  }

  return {
    title,
    description: shop.description || '',
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const shop = await getTenantShop(undefined, true);

  if (!shop) {
    return notFound();
  }

  const isAboutUs = slug === 'about-us';
  const isTerms = slug === 'terms';
  const isContactUs = slug === 'contact-us';
  const isContactUsTrack = slug === 'contact-us-track';

  if (!isAboutUs && !isTerms && !isContactUs && !isContactUsTrack) {
    const decodedSlug = decodeURIComponent(slug).toLowerCase();
    if (decodedSlug.includes('about') || decodedSlug.includes('درباره') || decodedSlug.includes('معرفی')) {
      permanentRedirect('/pages/about-us');
    }
    if (decodedSlug.includes('contact') || decodedSlug.includes('تماس') || decodedSlug.includes('ارتباط')) {
      permanentRedirect('/pages/contact-us');
    }
    if (decodedSlug.includes('track') || decodedSlug.includes('پیگیری')) {
      permanentRedirect('/pages/contact-us-track');
    }
    if (decodedSlug.includes('term') || decodedSlug.includes('قوانین') || decodedSlug.includes('شرایط')) {
      permanentRedirect('/pages/terms');
    }
    return notFound();
  }

  let pageTitle = 'شرایط و قوانین';
  if (isAboutUs) {
    pageTitle = 'درباره ما';
  } else if (isContactUs) {
    pageTitle = 'تماس با ما';
  } else if (isContactUsTrack) {
    pageTitle = 'پیگیری پیام تماس با ما';
  }

  let pageContent = shop.termsPage;
  if (isAboutUs) {
    pageContent = shop.aboutUsPage;
  } else if (isContactUs) {
    pageContent = shop.contactUsPage;
  }

  let aboutUsConfig = null;
  if (isAboutUs && pageContent) {
    aboutUsConfig = parseAboutUsConfig(pageContent);
  }

  let contactUsConfig = null;
  if (isContactUs && pageContent) {
    contactUsConfig = parseContactUsConfig(pageContent);
  }

  const [categories, menuItems] = await Promise.all([
    prisma.category.findMany({
      where: { shopId: shop.shopId, isActive: true },
      include: {
        children: {
          where: { isActive: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.menuItem.findMany({
      where: { shopId: shop.shopId, isActive: true },
      orderBy: { order: 'asc' }
    })
  ]);

  const headerConfig = shop.headerConfig ? JSON.parse(shop.headerConfig) : undefined;
  const footerConfig = parseFooterConfig(shop.footerConfig);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100 font-sans flex flex-col">
      <Header 
        shopName={shop.shopName} 
        logoUrl={shop.logoUrl} 
        menuItems={menuItems.map(item => ({
          id: item.id,
          title: item.title,
          url: item.url,
          color: item.color,
          icon: item.icon
        }))}
        categories={categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          parentId: cat.parentId,
          children: cat.children?.map(child => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            icon: child.icon,
            parentId: child.parentId
          }))
        }))}
        config={headerConfig}
      />

      <main className="flex-grow container mx-auto max-w-7xl px-4 py-8 md:py-12">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-5 md:mb-6 font-bold">
          <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            صفحه اصلی
          </Link>
          <ChevronLeft className="w-3 h-3" />
          <span className="text-gray-800 dark:text-gray-200 font-black">{pageTitle}</span>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100/80 dark:border-transparent rounded-3xl shadow-sm p-5 md:p-10 space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800/50 pb-5">
            <div
              className="p-2.5 rounded-2xl text-white shadow-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: shop.themeColor }}
            >
              {isAboutUs ? <Home className="w-5 h-5" /> : isContactUs ? <Phone className="w-5 h-5" /> : isContactUsTrack ? <Search className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-white">{pageTitle}</h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">فروشگاه اینترنتی {shop.shopName}</p>
            </div>
          </div>

          {/* Dynamic Content Area */}
          {isAboutUs && aboutUsConfig?.isStructured ? (
            <AboutUsClient config={aboutUsConfig} themeColor={shop.themeColor} />
          ) : isContactUs && contactUsConfig?.isStructured ? (
            <ContactUsClient config={contactUsConfig} themeColor={shop.themeColor} />
          ) : isContactUsTrack ? (
            <ContactUsTrackClient themeColor={shop.themeColor} />
          ) : pageContent ? (
            <div
              className="prose dark:prose-invert max-w-none text-xs md:text-sm font-bold leading-7 md:leading-8 space-y-4 text-gray-600 dark:text-gray-300"
              dangerouslySetInnerHTML={{ __html: pageContent }}
            />
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center text-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">محتوایی یافت نشد</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">هنوز محتوایی برای این صفحه تولید یا ثبت نشده است.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer shopName={shop.shopName} logoUrl={shop.logoUrl} config={footerConfig} />
      <BottomNav />
    </div>
  );
}
