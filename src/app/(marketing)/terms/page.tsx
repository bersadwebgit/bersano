import type { Metadata } from 'next';
import Section from '@/components/marketing/ui/Section';
import StructuredData from '@/components/marketing/StructuredData';
import { buildMarketingMetadata } from '@/lib/marketing-seo';
import { breadcrumbSchema } from '@/lib/marketing-schema';

export async function generateMetadata(): Promise<Metadata> {
  return buildMarketingMetadata({
    title: 'قوانین و شرایط استفاده',
    description:
      'قوانین و شرایط استفاده از پلتفرم فروشگاه‌ساز برسانا؛ حساب کاربری، تعهدات کاربر، محتوا، پرداخت، مسئولیت‌ها و خاتمه سرویس.',
    path: '/terms',
  });
}

const LAST_UPDATED = 'تیر ۱۴۰۵';

const SECTIONS: Array<{ heading: string; body: string[] }> = [
  {
    heading: '۱. پذیرش قوانین',
    body: [
      'با ثبت‌نام یا استفاده از پلتفرم برسانا، شما می‌پذیرید که این قوانین و شرایط را خوانده و با آن موافقت کرده‌اید. در صورت عدم پذیرش، لطفاً از سرویس استفاده نکنید.',
    ],
  },
  {
    heading: '۲. حساب کاربری',
    body: [
      'شما مسئول حفظ محرمانگی اطلاعات حساب کاربری و همه فعالیت‌هایی هستید که از طریق حساب شما انجام می‌شود.',
      'ارائه اطلاعات صحیح و به‌روز هنگام ثبت‌نام الزامی است. استفاده از هویت جعلی یا اطلاعات دیگران مجاز نیست.',
    ],
  },
  {
    heading: '۳. تعهدات کاربر و محتوای فروشگاه',
    body: [
      'مسئولیت محصولات، توضیحات، قیمت‌ها و محتوایی که در فروشگاه خود منتشر می‌کنید بر عهده شماست.',
      'انتشار کالا یا محتوای غیرقانونی، مغایر با قوانین جمهوری اسلامی ایران، ناقض حقوق دیگران یا مخل نظم عمومی ممنوع است و می‌تواند منجر به تعلیق فروشگاه شود.',
    ],
  },
  {
    heading: '۴. استفاده از دستیار هوش مصنوعی',
    body: [
      'دستیار هوشمند برسانا ابزاری کمکی است و پیش از اعمال تغییرات، پیش‌نمایش ارائه می‌دهد؛ تایید نهایی و صحت محتوای منتشرشده بر عهده کاربر است.',
      'استفاده از قابلیت‌های هوش مصنوعی برای تولید محتوای گمراه‌کننده یا نقض حقوق دیگران مجاز نیست.',
    ],
  },
  {
    heading: '۵. تعرفه‌ها و پرداخت',
    body: [
      'شرایط هر پلن و امکانات آن در صفحه تعرفه‌ها اعلام می‌شود. ارتقا یا تغییر پلن در هر زمان ممکن است.',
      'در صورت هرگونه تغییر در تعرفه‌ها، موضوع پیش از اعمال به کاربران اطلاع‌رسانی خواهد شد.',
    ],
  },
  {
    heading: '۶. مالکیت معنوی',
    body: [
      'کدها، طراحی و برند پلتفرم برسانا متعلق به برسانا است. محتوای فروشگاه شما (محصولات، تصاویر و متن‌های شما) متعلق به خودتان باقی می‌ماند.',
    ],
  },
  {
    heading: '۷. محدودیت مسئولیت',
    body: [
      'سرویس «همان‌گونه که هست» ارائه می‌شود. برسانا تلاش می‌کند سرویس پایدار و امن باشد، اما مسئولیت خسارات ناشی از قطعی‌های خارج از کنترل، سوءاستفاده کاربر یا خدمات اشخاص ثالث را نمی‌پذیرد.',
    ],
  },
  {
    heading: '۸. تعلیق و خاتمه سرویس',
    body: [
      'در صورت نقض این قوانین، برسانا می‌تواند دسترسی حساب را محدود یا تعلیق کند. کاربر نیز می‌تواند در هر زمان حساب خود را غیرفعال کند.',
    ],
  },
  {
    heading: '۹. تغییرات قوانین',
    body: [
      'این قوانین ممکن است به‌روزرسانی شود. نسخه جاری همواره در همین صفحه در دسترس است و ادامه استفاده از سرویس به معنای پذیرش نسخه به‌روزشده است.',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="text-right">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'خانه', path: '/' },
          { name: 'قوانین و شرایط', path: '/terms' },
        ])}
      />
      <Section tone="surface" spacing="lg" containerSize="narrow">
        <div className="space-y-3">
          <h1 className="text-3xl font-black leading-tight text-mk-strong dark:text-white sm:text-4xl">
            قوانین و شرایط استفاده
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
