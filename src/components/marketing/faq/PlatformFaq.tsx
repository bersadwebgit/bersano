import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import Section from '@/components/marketing/ui/Section';
import SectionHeading from '@/components/marketing/ui/SectionHeading';
import Badge from '@/components/marketing/ui/Badge';
import Faq, { type FaqEntry } from '@/components/marketing/ui/Faq';
import CtaSection from '@/components/marketing/sections/CtaSection';
import StructuredData from '@/components/marketing/StructuredData';
import { faqSchema, breadcrumbSchema } from '@/lib/marketing-schema';

interface FaqGroup {
  title: string;
  items: FaqEntry[];
}

const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'شروع کار و راه‌اندازی',
    items: [
      {
        q: 'برسانا چیست و چه کاری انجام می‌دهد؟',
        a: 'برسانا یک فروشگاه‌ساز هوشمند فارسی است که به شما اجازه می‌دهد بدون دانش فنی، فروشگاه اینترنتی خود را بسازید و آن را با گفت‌وگو به زبان فارسی مدیریت کنید؛ از ثبت محصول و تولید سئو تا تغییر ظاهر و تحلیل فروش.',
      },
      {
        q: 'برای ساخت فروشگاه به دانش فنی یا برنامه‌نویسی نیاز دارم؟',
        a: 'خیر. کل فرآیند راه‌اندازی و مدیریت بدون کدنویسی است و از طریق پنل ساده و دستیار هوش مصنوعی انجام می‌شود.',
      },
      {
        q: 'راه‌اندازی فروشگاه چقدر طول می‌کشد؟',
        a: 'ساخت فروشگاه اولیه بسیار سریع است؛ پس از ثبت‌نام، انتخاب ظاهر و افزودن چند محصول، فروشگاه شما آماده نمایش است.',
      },
    ],
  },
  {
    title: 'هوش مصنوعی و RAG',
    items: [
      {
        q: 'هوش مصنوعی برسانا دقیقاً چه کارهایی انجام می‌دهد؟',
        a: 'دستیار هوشمند می‌تواند محصول ثبت کند، توضیحات و سئوی محصول بنویسد، ظاهر فروشگاه را تغییر دهد، کد تخفیف بسازد و گزارش فروش تحلیل کند؛ همه با یک پیام فارسی ساده.',
      },
      {
        q: 'RAG یعنی چه و چه فایده‌ای دارد؟',
        a: 'RAG به هوش مصنوعی اجازه می‌دهد قبل از پاسخ، داده‌های واقعی فروشگاه شما (محصولات، سفارش‌ها و تنظیمات) را جست‌وجو و تحلیل کند؛ بنابراین پاسخ‌ها دقیق و متناسب با کسب‌وکار شماست، نه پاسخ‌های کلی و عمومی.',
      },
      {
        q: 'آیا هوش مصنوعی بدون تایید من تغییری ذخیره می‌کند؟',
        a: 'خیر. دستیار ابتدا پیش‌نمایش تغییرات پیشنهادی را نشان می‌دهد و تنها پس از تایید شما تغییرات اعمال می‌شود.',
      },
    ],
  },
  {
    title: 'تعرفه‌ها و پرداخت',
    items: [
      {
        q: 'آیا می‌توانم رایگان شروع کنم؟',
        a: 'بله. می‌توانید با پلن رایگان شروع کنید و هر زمان فروش شما رشد کرد، به پلن بالاتر ارتقا دهید.',
      },
      {
        q: 'می‌توانم بعداً پلن را تغییر یا ارتقا دهم؟',
        a: 'بله. تغییر پلن در هر زمان ممکن است و داده‌های فروشگاه شما هنگام ارتقا حفظ می‌شود.',
      },
      {
        q: 'برای شروع به کارت بانکی نیاز دارم؟',
        a: 'برای شروع رایگان نیازی به وارد کردن اطلاعات کارت بانکی نیست.',
      },
    ],
  },
  {
    title: 'دامنه، فروش و پشتیبانی',
    items: [
      {
        q: 'آیا می‌توانم دامنه اختصاصی خودم را متصل کنم؟',
        a: 'بله. در پلن‌های مناسب می‌توانید دامنه اختصاصی .ir یا .com خود را به فروشگاه متصل کنید و برند رسمی خود را داشته باشید.',
      },
      {
        q: 'آیا برسانا از فروش عمده (B2B) پشتیبانی می‌کند؟',
        a: 'بله. امکاناتی مانند قیمت پله‌ای، حداقل سفارش (MOQ) و پنل همکاران برای فروش عمده در دسترس است.',
      },
      {
        q: 'پشتیبانی برسانا چگونه است؟',
        a: 'پشتیبانی به زبان فارسی ارائه می‌شود و بسته به پلن، از تیکت تا پشتیبانی اختصاصی را شامل می‌شود.',
      },
    ],
  },
];

const ALL_ITEMS: FaqEntry[] = FAQ_GROUPS.flatMap((g) => g.items);

/** Platform-level FAQ (shown on the marketing surface when there is no tenant shop). */
export default function PlatformFaq() {
  return (
    <div className="text-right">
      <StructuredData
        data={[
          breadcrumbSchema([
            { name: 'خانه', path: '/' },
            { name: 'سوالات متداول', path: '/faq' },
          ]),
          faqSchema(ALL_ITEMS)!,
        ]}
      />

      <Section tone="surface" spacing="lg">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <Badge tone="primary">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" /> راهنمای سریع برسانا
          </Badge>
          <h1 className="text-3xl font-black leading-tight text-mk-strong dark:text-white sm:text-4xl">
            سوالات متداول
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-mk-muted">
            پاسخ رایج‌ترین پرسش‌ها درباره ساخت فروشگاه، هوش مصنوعی، تعرفه‌ها و پشتیبانی. اگر پاسخ خود را
            نیافتید،
            <Link href="/contact" className="mx-1 font-black text-primary-600 hover:text-primary-700">
              با ما در تماس باشید
            </Link>
            .
          </p>
        </div>
      </Section>

      {FAQ_GROUPS.map((group, idx) => (
        <Section key={group.title} tone={idx % 2 === 0 ? 'muted' : 'surface'}>
          <SectionHeading title={group.title} align="center" className="mb-8" />
          <Faq items={group.items} />
        </Section>
      ))}

      <CtaSection
        title="آماده‌اید فروشگاه هوشمند خود را بسازید؟"
        subtitle="رایگان شروع کنید و فروشگاه را با دستیار فارسی راه‌اندازی کنید."
        primaryLabel="شروع رایگان ساخت فروشگاه"
        primaryHref="/register"
        secondaryLabel="مشاهده تعرفه‌ها"
        secondaryHref="/pricing"
        analyticsLocation="faq_final_cta"
      />
    </div>
  );
}
