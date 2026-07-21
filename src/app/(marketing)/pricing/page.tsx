import type { Metadata } from 'next';
import Link from 'next/link';
import { Star, ArrowLeft } from 'lucide-react';
import Section from '@/components/marketing/ui/Section';
import SectionHeading from '@/components/marketing/ui/SectionHeading';
import Badge from '@/components/marketing/ui/Badge';
import Faq from '@/components/marketing/ui/Faq';
import PricingTable, { type PricingPlanView } from '@/components/marketing/sections/PricingTable';
import ComparisonTable from '@/components/marketing/sections/ComparisonTable';
import CtaSection from '@/components/marketing/sections/CtaSection';
import PricingQuiz from '@/components/marketing/pricing/PricingQuiz';
import StructuredData from '@/components/marketing/StructuredData';
import { getMarketingPricingPlans } from '@/lib/marketing-cms';
import { buildMarketingMetadata } from '@/lib/marketing-seo';
import { faqSchema, breadcrumbSchema } from '@/lib/marketing-schema';

export async function generateMetadata(): Promise<Metadata> {
  return buildMarketingMetadata({
    title: 'تعرفه‌ها و قیمت فروشگاه‌ساز برسانا',
    description:
      'تعرفه‌های شفاف برسانا؛ با پلن رایگان شروع کنید و هر زمان فروش‌تان رشد کرد ارتقا دهید. مقایسه کامل امکانات پلن‌ها و راهنمای انتخاب.',
    path: '/pricing',
  });
}

const FAQS = [
  {
    q: 'برسانا چه فرقی با فروشگاه‌سازهای معمولی دارد؟',
    a: 'فروشگاه‌سازهای معمولی فقط قالب و فرم در اختیار شما می‌گذارند؛ اما در برسانا می‌توانید با زبان فارسی با فروشگاه خود گفت‌وگو کنید و دستیار هوشمند کارهایی مثل ثبت محصول، تولید سئو، تغییر ظاهر و تحلیل فروش را انجام می‌دهد.',
  },
  {
    q: 'RAG در برسانا یعنی چه؟',
    a: 'فناوری RAG به هوش مصنوعی اجازه می‌دهد قبل از پاسخ، داده‌های واقعی فروشگاه شما (محصولات، سفارش‌ها و تنظیمات) را جست‌وجو و تحلیل کند؛ بنابراین پاسخ‌ها دقیق و متناسب با کسب‌وکار شماست، نه پاسخ‌های عمومی.',
  },
  {
    q: 'آیا هوش مصنوعی بدون تایید من تغییری ذخیره می‌کند؟',
    a: 'خیر. دستیار برسانا ابتدا پیش‌نمایش تغییرات پیشنهادی را نشان می‌دهد و تنها پس از تایید شما، تغییرات اعمال می‌شود.',
  },
  {
    q: 'آیا برای استفاده به دانش فنی نیاز دارم؟',
    a: 'خیر. راه‌اندازی و مدیریت فروشگاه در برسانا بدون نیاز به برنامه‌نویسی است و از طریق گفت‌وگو با دستیار هوشمند و پنل ساده انجام می‌شود.',
  },
  {
    q: 'می‌توانم بعداً پلن را ارتقا یا تغییر دهم؟',
    a: 'بله. می‌توانید با پلن رایگان شروع کنید و هر زمان فروش شما رشد کرد، به پلن بالاتر ارتقا دهید؛ داده‌های فروشگاه شما حفظ می‌شود.',
  },
];

const COMPARISON_COLUMNS = [
  { key: 'start', label: 'شروع' },
  { key: 'pro', label: 'حرفه‌ای', highlight: true },
  { key: 'growth', label: 'رشد' },
];

const COMPARISON_ROWS = [
  { feature: 'تعداد محصولات', values: { start: 'تا ۲۰ محصول', pro: 'نامحدود', growth: 'نامحدود' } },
  { feature: 'اتصال دامنه اختصاصی', values: { start: '—', pro: '.ir و .com', growth: 'چند دامنه' } },
  { feature: 'دستیار هوش مصنوعی', values: { start: '۵ درخواست/روز', pro: '۱۰۰ درخواست/روز', growth: 'نامحدود' }, isAi: true },
  { feature: 'RAG زنده روی کاتالوگ و فاکتور', values: { start: '—', pro: '—', growth: 'کامل' }, isAi: true },
  { feature: 'فروش محصول دیجیتال', values: { start: '—', pro: 'دارد', growth: 'دارد' } },
  { feature: 'سیستم عمده‌فروشی (B2B)', values: { start: '—', pro: '—', growth: 'قیمت پله‌ای و MOQ' } },
  { feature: 'همکاران فروشگاه (Staff)', values: { start: 'مدیر اصلی', pro: 'مدیر اصلی', growth: 'تا ۵ همکار' } },
  { feature: 'باشگاه مشتریان و وفاداری', values: { start: '—', pro: 'دارد', growth: 'پیشرفته' } },
  { feature: 'درون‌ریزی/برون‌ریزی اکسل', values: { start: '—', pro: '—', growth: 'کامل با AI' } },
];

export default async function PricingPage() {
  const plans = await getMarketingPricingPlans();
  const planViews: PricingPlanView[] = plans.map((p) => ({
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

  const quizPlans = planViews.map((p) => ({ id: p.id, name: p.name, ctaLink: p.ctaLink }));

  return (
    <div className="text-right">
      <StructuredData
        data={[
          breadcrumbSchema([
            { name: 'خانه', path: '/' },
            { name: 'تعرفه‌ها', path: '/pricing' },
          ]),
          faqSchema(FAQS)!,
        ]}
      />

      <Section tone="surface" spacing="lg">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <Badge tone="primary">
            <Star className="h-3.5 w-3.5" aria-hidden="true" /> پلن‌های منعطف برای هر ابعاد کسب‌وکار
          </Badge>
          <h1 className="text-3xl font-black leading-tight text-mk-strong dark:text-white sm:text-4xl">
            تعرفه‌های شفاف برای فروشگاه هوشمند شما
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-mk-muted">
            با پلن رایگان شروع کنید و هر زمان فروش شما رشد کرد، امکاناتی مثل دامنه اختصاصی، هوش مصنوعی بیشتر،
            عمده‌فروشی و همکاران را فعال کنید.
          </p>
        </div>
      </Section>

      <Section tone="surface" spacing="sm">
        <PricingTable plans={planViews} />
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="راهنمای انتخاب"
          title="کدام پلن مناسب شماست؟"
          subtitle="به چند سوال کوتاه پاسخ دهید تا بهترین پلن را پیشنهاد دهیم."
          className="mb-8"
        />
        <PricingQuiz plans={quizPlans} />
      </Section>

      <Section tone="surface">
        <SectionHeading title="مقایسه دقیق امکانات پلن‌ها" className="mb-8" />
        <ComparisonTable columns={COMPARISON_COLUMNS} rows={COMPARISON_ROWS} caption="مقایسه امکانات پلن‌های برسانا" />
      </Section>

      <Section tone="muted">
        <SectionHeading title="پاسخ به سوالات متداول" className="mb-8" />
        <Faq items={FAQS} />
        <div className="mt-8 text-center">
          <Link href="/faq" className="inline-flex items-center gap-1.5 text-xs font-black text-primary-600 hover:text-primary-700">
            مشاهده همه سوالات متداول
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </Section>

      <CtaSection
        title="ساده شروع کنید، حرفه‌ای رشد کنید"
        subtitle="ثبت‌نام کنید، ظاهر فروشگاه را انتخاب کنید و کاتالوگ را با دستیار هوشمند آماده کنید."
        primaryLabel="شروع رایگان ساخت فروشگاه"
        primaryHref="/register"
        secondaryLabel="مشاهده دمو"
        secondaryHref="/demo"
        analyticsLocation="pricing_final_cta"
      />
    </div>
  );
}
