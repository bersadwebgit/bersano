import Link from 'next/link';
import { ArrowLeft, Camera, Package, FileDown, CreditCard, Search, MessageSquareText } from 'lucide-react';
import Section from '@/components/marketing/ui/Section';
import SectionHeading from '@/components/marketing/ui/SectionHeading';
import Card from '@/components/marketing/ui/Card';
import Faq from '@/components/marketing/ui/Faq';
import FeatureGrid from '@/components/marketing/sections/FeatureGrid';
import ComparisonTable from '@/components/marketing/sections/ComparisonTable';
import PricingTable, { type PricingPlanView } from '@/components/marketing/sections/PricingTable';
import CtaSection from '@/components/marketing/sections/CtaSection';
import Hero from '@/components/marketing/home/Hero';
import StructuredData from '@/components/marketing/StructuredData';
import type { MarketingContent } from '@/lib/marketing-cms';
import type { MarketingGlobals } from '@/lib/marketing-globals';
import { organizationSchema, websiteSchema, softwareApplicationSchema, faqSchema } from '@/lib/marketing-schema';

interface HomeLandingProps {
  content: MarketingContent;
  pricing: MarketingContent['pricing'];
  globals: MarketingGlobals;
}

const SOLUTIONS = [
  { title: 'فروشگاه اینستاگرامی', desc: 'مخاطب دایرکت را به خریدار وفادار تبدیل کنید', href: '/instagram-shop', icon: Camera },
  { title: 'عمده‌فروشی و B2B', desc: 'قیمت پله‌ای، حداقل سفارش و پنل نمایندگان', href: '/wholesale', icon: Package },
  { title: 'محصولات دیجیتال', desc: 'فروش فایل و لایسنس با تحویل امن و آنی', href: '/digital-products', icon: FileDown },
  { title: 'پرداخت و ارسال', desc: 'درگاه‌های محلی و مدیریت یکپارچه ارسال', href: '/payments-shipping', icon: CreditCard },
  { title: 'سئو و تولید محتوا', desc: 'رتبه گرفتن در گوگل با محتوای تولیدشده هوشمند', href: '/seo-content', icon: Search },
  { title: 'ابزارهای بازاریابی', desc: 'کد تخفیف، باشگاه مشتریان و کمپین هدفمند', href: '/marketing-tools', icon: MessageSquareText },
];

const PROBLEMS = [
  { title: 'دایرکت شلوغ و سفارش‌های گم‌شده', desc: 'پاسخ‌گویی دستی در دایرکت، ثبت سفارش با کاغذ و پیگیری کارت‌به‌کارت، فروش را کند و پرخطا می‌کند.' },
  { title: 'وابستگی به الگوریتم پلتفرم', desc: 'کاهش دیده‌شدن، محدودیت و ریسک بسته‌شدن پیج یعنی همه‌چیز روی زمینی است که مال شما نیست.' },
  { title: 'هزینه و پیچیدگی سایت اختصاصی', desc: 'سایت اختصاصی گران، زمان‌بر و نیازمند نگهداری فنی مداوم است؛ برای کسب‌وکار نوپا صرفه ندارد.' },
];

const STEPS = [
  { title: 'ثبت‌نام و انتخاب نام فروشگاه', desc: 'در چند دقیقه فروشگاه شما روی زیردامنه اختصاصی آماده می‌شود.' },
  { title: 'افزودن محصول با کمک هوش مصنوعی', desc: 'محصول را وارد کنید؛ توضیح، سئو و دسته‌بندی به‌صورت هوشمند پیشنهاد می‌شود.' },
  { title: 'مدیریت با گفت‌وگوی فارسی', desc: 'قیمت، موجودی، محتوا و تحلیل فروش را با پیام ساده مدیریت کنید؛ هر تغییر با پیش‌نمایش و تایید شما اجرا می‌شود.' },
];

function toPricingView(plans: MarketingContent['pricing']): PricingPlanView[] {
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    desc: p.desc,
    price: p.price,
    period: p.period,
    features: p.features,
    badge: p.badge,
    ctaText: p.ctaText,
    ctaLink: p.ctaLink,
    highlighted: p.highlighted ?? p.id === 'professional',
  }));
}

export default function HomeLanding({ content, pricing, globals }: HomeLandingProps) {
  const cta = globals.globalCta;

  const comparisonColumns = [
    { key: 'instagram', label: 'اینستاگرام' },
    { key: 'standard', label: 'فروشگاه‌ساز معمولی' },
    { key: 'bersana', label: 'برسانا', highlight: true },
  ];
  const comparisonRows = content.comparisons.map((row) => ({
    feature: row.feature,
    values: { instagram: row.instagram, standard: row.standard, bersana: row.bersana },
    isAi: row.isAi,
  }));

  const samplePrompt = content.prompts?.[0]?.prompt || 'برای این محصول توضیح و سئو بنویس';
  const sampleResult =
    content.prompts?.[0]?.outputPreview || 'عنوان سئو، توضیح متا، سوالات متداول و ساختار داده آماده شد.';

  const faqLd = faqSchema(content.faqs);

  return (
    <>
      <StructuredData
        data={[
          organizationSchema({ sameAs: [globals.social.instagram, globals.social.telegram, globals.social.linkedin].filter(Boolean) }),
          websiteSchema(),
          softwareApplicationSchema({ description: content.metaDesc, hasFreeTier: true }),
          ...(faqLd ? [faqLd] : []),
        ]}
      />

      <Hero
        title={content.heroTitle}
        subtitle={content.heroSubtitle}
        primaryLabel={cta.primaryLabel}
        primaryHref={cta.primaryHref}
        secondaryLabel={cta.secondaryLabel}
        secondaryHref={cta.secondaryHref}
        reassurances={['راه‌اندازی سریع', 'بدون نیاز به دانش فنی', 'شروع رایگان']}
        samplePrompt={samplePrompt}
        sampleResult={sampleResult}
      />

      {/* Trust bar — honest, non-numeric */}
      <Section tone="muted" spacing="sm" ariaLabel="مزایای کلیدی">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-xs font-bold text-mk-muted">
          <li>راه‌اندازی بدون کدنویسی</li>
          <li>دامنه و برند مستقل شما</li>
          <li>پرداخت و ارسال یکپارچه</li>
          <li>دستیار هوشمند فارسی با تایید شما</li>
        </ul>
      </Section>

      {/* Problem section */}
      <Section tone="surface" id="problem">
        <SectionHeading
          eyebrow="چرا برسانا"
          title="فروش آنلاین نباید این‌قدر سخت باشد"
          subtitle="اگر با این چالش‌ها روبه‌رو هستید، برسانا دقیقاً برای شما ساخته شده است."
          className="mb-10"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map((p, idx) => (
            <Card key={idx} padding="lg" className="h-full">
              <h3 className="text-sm font-black text-mk-strong dark:text-white">{p.title}</h3>
              <p className="mt-2 text-[13px] font-medium leading-relaxed text-mk-muted">{p.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section tone="muted" id="how-it-works">
        <SectionHeading
          eyebrow="نحوه کار"
          title="از ایده تا فروش، در سه قدم"
          subtitle="بدون درگیری فنی؛ فروشگاه حرفه‌ای‌تان را راه بیندازید و رشد دهید."
          className="mb-10"
        />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, idx) => (
            <Card as="li" key={idx} padding="lg">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-black text-white">
                {idx + 1}
              </div>
              <h3 className="text-sm font-black text-mk-strong dark:text-white">{step.title}</h3>
              <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-mk-muted">{step.desc}</p>
            </Card>
          ))}
        </ol>
      </Section>

      {/* Features */}
      <Section tone="surface" id="features">
        <SectionHeading
          eyebrow="امکانات"
          title="هرآنچه برای فروش حرفه‌ای لازم دارید"
          subtitle="ابزارهای واقعی و کاربردی، دسته‌بندی‌شده بر اساس نتیجه‌ای که برای کسب‌وکار شما می‌سازند."
          className="mb-10"
        />
        <FeatureGrid items={content.features} columns={3} />
        <div className="mt-8 text-center">
          <Link
            href="/features"
            className="inline-flex items-center gap-1.5 text-xs font-black text-primary-600 hover:text-primary-700"
          >
            مشاهده همه امکانات
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </Section>

      {/* Solutions */}
      <Section tone="muted" id="solutions">
        <SectionHeading
          eyebrow="راهکارها"
          title="برای هر مدل کسب‌وکار، یک راهکار مشخص"
          subtitle="برسانا با نیاز واقعی صنف شما هماهنگ می‌شود، نه برعکس."
          className="mb-10"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((sol) => (
            <Link key={sol.href} href={sol.href} className="group">
              <Card interactive padding="lg" className="h-full">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-300">
                  <sol.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-black text-mk-strong group-hover:text-primary-600 dark:text-white">
                  {sol.title}
                </h3>
                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-mk-muted">{sol.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      {/* Comparison */}
      <Section tone="surface" id="comparison">
        <SectionHeading
          eyebrow="مقایسه منصفانه"
          title="برسانا در کنار گزینه‌های دیگر"
          subtitle="مقایسه‌ای شفاف تا با آگاهی کامل تصمیم بگیرید."
          className="mb-8"
        />
        <ComparisonTable columns={comparisonColumns} rows={comparisonRows} caption="مقایسه برسانا با اینستاگرام و فروشگاه‌ساز معمولی" />
      </Section>

      {/* Pricing preview */}
      <Section tone="muted" id="pricing">
        <SectionHeading
          eyebrow="تعرفه‌ها"
          title="قیمت شفاف، بدون هزینه پنهان"
          subtitle="با پلن رایگان شروع کنید و هر زمان فروش‌تان رشد کرد، ارتقا دهید."
          className="mb-10"
        />
        <PricingTable plans={toPricingView(pricing)} />
        <div className="mt-8 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-xs font-black text-primary-600 hover:text-primary-700">
            مقایسه کامل پلن‌ها
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </Section>

      {/* FAQ */}
      <Section tone="surface" id="faq">
        <SectionHeading eyebrow="سوالات متداول" title="پاسخ به پرسش‌های رایج" className="mb-8" />
        <Faq items={content.faqs} />
      </Section>

      {/* Final CTA */}
      <CtaSection
        title="همین امروز فروشگاه هوشمند خود را بسازید"
        subtitle="راه‌اندازی سریع است و برای شروع نیازی به پرداخت ندارید. رشد فروش را از همین امروز آغاز کنید."
        primaryLabel={cta.primaryLabel}
        primaryHref={cta.primaryHref}
        secondaryLabel={cta.secondaryLabel}
        secondaryHref={cta.secondaryHref}
        reassurances={['شروع رایگان', 'بدون نیاز به کارت بانکی', 'پشتیبانی فارسی']}
        analyticsLocation="home_final_cta"
      />
    </>
  );
}
