import type { Metadata } from 'next';
import { Sparkles, Target, ShieldCheck, Cpu, Store, HeartHandshake } from 'lucide-react';
import Section from '@/components/marketing/ui/Section';
import SectionHeading from '@/components/marketing/ui/SectionHeading';
import Badge from '@/components/marketing/ui/Badge';
import Card from '@/components/marketing/ui/Card';
import CtaSection from '@/components/marketing/sections/CtaSection';
import StructuredData from '@/components/marketing/StructuredData';
import { buildMarketingMetadata } from '@/lib/marketing-seo';
import { aboutPageSchema, breadcrumbSchema, organizationSchema } from '@/lib/marketing-schema';

export async function generateMetadata(): Promise<Metadata> {
  return buildMarketingMetadata({
    title: 'درباره برسانا',
    description:
      'برسانا یک فروشگاه‌ساز هوشمند فارسی است که مدیریت فروشگاه اینترنتی را با گفت‌وگو به زبان فارسی و فناوری RAG ساده می‌کند. با ماموریت و ارزش‌های ما آشنا شوید.',
    path: '/about',
  });
}

const VALUES = [
  {
    icon: Cpu,
    title: 'هوش مصنوعی واقعی، نه شعار',
    desc: 'دستیار برسانا با فناوری RAG داده‌های واقعی فروشگاه شما را می‌خواند و بر اساس آن‌ها عمل می‌کند؛ نه پاسخ‌های کلی و بی‌ربط.',
  },
  {
    icon: ShieldCheck,
    title: 'کنترل کامل با شما',
    desc: 'هیچ تغییری بدون پیش‌نمایش و تایید شما اعمال نمی‌شود. مالکیت داده و برند همیشه در دست خودتان است.',
  },
  {
    icon: Store,
    title: 'ساخته‌شده برای بازار ایران',
    desc: 'فارسی روان، تقویم شمسی، درگاه‌ها و روش‌های ارسال محلی و طراحی موبایل‌محور متناسب با مشتری ایرانی.',
  },
  {
    icon: HeartHandshake,
    title: 'رشد کنار فروشنده',
    desc: 'با پلن رایگان شروع می‌کنید و همراه رشد کسب‌وکارتان ارتقا می‌دهید؛ بدون هزینه‌های سنگین اولیه.',
  },
];

export default function AboutPage() {
  return (
    <div className="text-right">
      <StructuredData
        data={[
          breadcrumbSchema([
            { name: 'خانه', path: '/' },
            { name: 'درباره ما', path: '/about' },
          ]),
          aboutPageSchema(),
          organizationSchema(),
        ]}
      />

      <Section tone="surface" spacing="lg">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <Badge tone="primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> داستان برسانا
          </Badge>
          <h1 className="text-3xl font-black leading-tight text-mk-strong dark:text-white sm:text-4xl">
            فروشگاه‌سازی که با شما فارسی حرف می‌زند
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-mk-muted">
            برسانا با یک باور ساده ساخته شد: راه‌اندازی و مدیریت فروشگاه اینترنتی نباید نیازمند دانش فنی یا
            هزینه‌های سنگین باشد. ما هوش مصنوعی را به یک همکار واقعی برای فروشندگان تبدیل کردیم.
          </p>
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          <Card padding="lg" className="flex flex-col gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600/10 text-primary-600">
              <Target className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-black text-mk-strong dark:text-white">ماموریت ما</h2>
            <p className="text-[13px] font-medium leading-relaxed text-mk-muted">
              می‌خواهیم هر فروشنده‌ای در ایران بتواند بدون واسطه و بدون دانش فنی، صاحب یک فروشگاه حرفه‌ای شود و
              کارهای تکراری را به دستیار هوشمند بسپارد تا روی رشد فروش تمرکز کند.
            </p>
          </Card>
          <Card padding="lg" className="flex flex-col gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600/10 text-primary-600">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-black text-mk-strong dark:text-white">چه چیزی ما را متفاوت می‌کند</h2>
            <p className="text-[13px] font-medium leading-relaxed text-mk-muted">
              برخلاف فروشگاه‌سازهای معمولی که فقط قالب و فرم می‌دهند، در برسانا با یک پیام فارسی فروشگاه را مدیریت
              می‌کنید؛ و برخلاف سایت سفارشی، سریع و کم‌هزینه راه می‌افتید و مالک کامل برند و داده خود می‌مانید.
            </p>
          </Card>
        </div>
      </Section>

      <Section tone="surface">
        <SectionHeading eyebrow="ارزش‌های ما" title="باورهایی که برسانا را می‌سازند" className="mb-10" />
        <div className="grid gap-5 sm:grid-cols-2">
          {VALUES.map((v) => (
            <Card key={v.title} padding="lg" className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-600/10 text-primary-600">
                <v.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-mk-strong dark:text-white">{v.title}</h3>
                <p className="text-[13px] font-medium leading-relaxed text-mk-muted">{v.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <CtaSection
        title="بیایید فروشگاه شما را بسازیم"
        subtitle="همین حالا رایگان شروع کنید و قدرت مدیریت فروشگاه با زبان فارسی را تجربه کنید."
        primaryLabel="شروع رایگان ساخت فروشگاه"
        primaryHref="/register"
        secondaryLabel="تماس با ما"
        secondaryHref="/contact"
        analyticsLocation="about_final_cta"
      />
    </div>
  );
}
