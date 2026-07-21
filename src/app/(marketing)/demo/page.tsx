import type { Metadata } from 'next';
import { Award, Cpu } from 'lucide-react';
import Section from '@/components/marketing/ui/Section';
import Badge from '@/components/marketing/ui/Badge';
import CtaSection from '@/components/marketing/sections/CtaSection';
import DemoGallery from '@/components/marketing/demo/DemoGallery';
import StructuredData from '@/components/marketing/StructuredData';
import { buildMarketingMetadata } from '@/lib/marketing-seo';
import { breadcrumbSchema } from '@/lib/marketing-schema';

export async function generateMetadata(): Promise<Metadata> {
  return buildMarketingMetadata({
    title: 'دموی فروشگاه‌های هوشمند برسانا',
    description:
      'نمونه فروشگاه‌های آماده برسانا برای پوشاک، آرایشی، محصولات دیجیتال و عمده‌فروشی را ببینید و با یک کلیک فروشگاهی مشابه بسازید.',
    path: '/demo',
  });
}

export default function DemoPage() {
  return (
    <div className="text-right">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'خانه', path: '/' },
          { name: 'دمو', path: '/demo' },
        ])}
      />

      <Section tone="surface" spacing="lg">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <Badge tone="primary">
            <Award className="h-3.5 w-3.5" aria-hidden="true" /> ویترین دموهای زنده برسانا
          </Badge>
          <h1 className="text-3xl font-black leading-tight text-mk-strong dark:text-white sm:text-4xl">
            دموی فروشگاه‌های هوشمند برسانا
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-mk-muted">
            قبل از ثبت‌نام، نمونه فروشگاه‌ها را ببینید و با یک کلیک فروشگاهی مشابه برای کسب‌وکار خود بسازید.
          </p>
        </div>
      </Section>

      <Section tone="surface" spacing="sm">
        <DemoGallery />
      </Section>

      <Section tone="muted">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Cpu className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-black text-mk-strong dark:text-white sm:text-2xl">
            هر دمو با یک پرامپت فارسی کاملاً شخصی‌سازی می‌شود
          </h2>
          <p className="max-w-xl text-xs font-bold leading-relaxed text-mk-muted sm:text-sm">
            پس از انتخاب هر دمو محدود به ساختار آن نیستید؛ با یک پیام ساده مثل «رنگ‌ها را لوکس‌تر کن» یا
            «۲۰ محصول نمونه اضافه کن»، چیدمان و محتوای فروشگاه را تغییر می‌دهید.
          </p>
        </div>
      </Section>

      <CtaSection
        title="فروشگاهی شبیه دموهای بالا می‌خواهید؟"
        subtitle="راه‌اندازی و پیکربندی اولیه سریع و رایگان است. همین حالا شروع کنید."
        primaryLabel="شروع رایگان ساخت فروشگاه"
        primaryHref="/register"
        secondaryLabel="مشاهده تعرفه‌ها"
        secondaryHref="/pricing"
        analyticsLocation="demo_final_cta"
      />
    </div>
  );
}
