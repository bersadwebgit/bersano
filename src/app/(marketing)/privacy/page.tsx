import type { Metadata } from 'next';
import Section from '@/components/marketing/ui/Section';
import StructuredData from '@/components/marketing/StructuredData';
import { buildMarketingMetadata } from '@/lib/marketing-seo';
import { breadcrumbSchema } from '@/lib/marketing-schema';

export async function generateMetadata(): Promise<Metadata> {
  return buildMarketingMetadata({
    title: 'حریم خصوصی',
    description:
      'سیاست حریم خصوصی برسانا؛ چه داده‌هایی جمع‌آوری می‌کنیم، چگونه از آن‌ها محافظت می‌کنیم و حقوق شما درباره اطلاعات شخصی‌تان.',
    path: '/privacy',
  });
}

const LAST_UPDATED = 'تیر ۱۴۰۵';

const SECTIONS: Array<{ heading: string; body: string[] }> = [
  {
    heading: '۱. مقدمه',
    body: [
      'حفظ حریم خصوصی شما برای برسانا اهمیت زیادی دارد. این سند توضیح می‌دهد چه اطلاعاتی جمع‌آوری می‌شود، چگونه استفاده و محافظت می‌شود و شما چه حقوقی دارید.',
    ],
  },
  {
    heading: '۲. اطلاعاتی که جمع‌آوری می‌کنیم',
    body: [
      'اطلاعات حساب کاربری مانند نام، ایمیل و شماره تماس که هنگام ثبت‌نام ارائه می‌دهید.',
      'اطلاعات فروشگاه شما شامل محصولات، سفارش‌ها و تنظیمات که برای ارائه سرویس لازم است.',
      'اطلاعات فنی مانند نوع دستگاه و رفتار کلی در سایت که به‌صورت غیرشخصی و برای بهبود سرویس استفاده می‌شود.',
    ],
  },
  {
    heading: '۳. نحوه استفاده از اطلاعات',
    body: [
      'از اطلاعات برای ارائه و بهبود سرویس، پشتیبانی، امنیت حساب و اطلاع‌رسانی‌های ضروری استفاده می‌کنیم.',
      'دستیار هوش مصنوعی برای پاسخ‌گویی دقیق ممکن است داده‌های فروشگاه شما را پردازش کند؛ این پردازش در چارچوب ارائه سرویس به خود شماست.',
    ],
  },
  {
    heading: '۴. اشتراک‌گذاری اطلاعات',
    body: [
      'اطلاعات شما را نمی‌فروشیم. داده‌ها تنها در حد لازم برای ارائه سرویس (مانند درگاه پرداخت یا سرویس ارسال) و مطابق قانون در اختیار اشخاص ثالث ضروری قرار می‌گیرد.',
    ],
  },
  {
    heading: '۵. کوکی‌ها و ابزارهای تحلیلی',
    body: [
      'برای عملکرد صحیح سایت و تحلیل غیرشخصی رفتار کاربران ممکن است از کوکی و ابزارهای تحلیلی استفاده شود. می‌توانید تنظیمات کوکی مرورگر خود را مدیریت کنید.',
    ],
  },
  {
    heading: '۶. امنیت داده‌ها',
    body: [
      'از روش‌های متعارف امنیتی برای محافظت از اطلاعات استفاده می‌کنیم؛ با این حال هیچ روشی صددرصد ایمن نیست و حفظ محرمانگی رمز عبور بر عهده کاربر است.',
    ],
  },
  {
    heading: '۷. حقوق شما',
    body: [
      'شما می‌توانید به اطلاعات حساب خود دسترسی داشته باشید، آن‌ها را اصلاح کنید یا درخواست حذف حساب دهید. برای این موارد از طریق صفحه تماس با ما اقدام کنید.',
    ],
  },
  {
    heading: '۸. تغییرات این سیاست',
    body: [
      'این سیاست ممکن است به‌روزرسانی شود. نسخه جاری همیشه در همین صفحه در دسترس است.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="text-right">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'خانه', path: '/' },
          { name: 'حریم خصوصی', path: '/privacy' },
        ])}
      />
      <Section tone="surface" spacing="lg" containerSize="narrow">
        <div className="space-y-3">
          <h1 className="text-3xl font-black leading-tight text-mk-strong dark:text-white sm:text-4xl">
            سیاست حریم خصوصی
          </h1>
          <p className="text-xs font-bold text-mk-muted">آخرین به‌روزرسانی: {LAST_UPDATED}</p>
        </div>
        <div className="mk-prose mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.heading} className="space-y-2">
              <h2 className="text-lg font-black text-mk-strong dark:text-white">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="text-[13px] font-medium leading-loose text-mk-muted">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </Section>
    </div>
  );
}
