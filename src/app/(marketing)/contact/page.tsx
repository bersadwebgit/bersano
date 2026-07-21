import type { Metadata } from 'next';
import { Mail, Clock, MessageCircle, Send, Camera, Briefcase } from 'lucide-react';
import Section from '@/components/marketing/ui/Section';
import SectionHeading from '@/components/marketing/ui/SectionHeading';
import Badge from '@/components/marketing/ui/Badge';
import Card from '@/components/marketing/ui/Card';
import ContactForm from '@/components/marketing/contact/ContactForm';
import StructuredData from '@/components/marketing/StructuredData';
import { getMarketingGlobals } from '@/lib/marketing-globals';
import { buildMarketingMetadata } from '@/lib/marketing-seo';
import { contactPageSchema, breadcrumbSchema } from '@/lib/marketing-schema';

export async function generateMetadata(): Promise<Metadata> {
  return buildMarketingMetadata({
    title: 'تماس با برسانا',
    description:
      'برای پرسش‌های پیش از خرید، پشتیبانی و همکاری با تیم برسانا در تماس باشید. کانال‌های ارتباطی و فرم تماس مستقیم.',
    path: '/contact',
  });
}

export default async function ContactPage() {
  const { contact, social } = await getMarketingGlobals();
  const email = contact.email || 'support@bersana.ir';

  const channels = [
    { icon: Mail, label: 'ایمیل', value: email, href: `mailto:${email}`, ltr: true },
    contact.phone
      ? { icon: MessageCircle, label: 'تلفن', value: contact.phone, href: `tel:${contact.phone}`, ltr: true }
      : null,
    { icon: Clock, label: 'ساعات پاسخ‌گویی', value: contact.hours, href: undefined, ltr: false },
  ].filter(Boolean) as Array<{ icon: typeof Mail; label: string; value: string; href?: string; ltr: boolean }>;

  const socials = [
    social.instagram ? { icon: Camera, label: 'اینستاگرام', href: social.instagram } : null,
    social.telegram ? { icon: Send, label: 'تلگرام', href: social.telegram } : null,
    social.linkedin ? { icon: Briefcase, label: 'لینکدین', href: social.linkedin } : null,
  ].filter(Boolean) as Array<{ icon: typeof Mail; label: string; href: string }>;

  return (
    <div className="text-right">
      <StructuredData
        data={[
          breadcrumbSchema([
            { name: 'خانه', path: '/' },
            { name: 'تماس با ما', path: '/contact' },
          ]),
          contactPageSchema({ email, phone: contact.phone || undefined }),
        ]}
      />

      <Section tone="surface" spacing="lg">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <Badge tone="primary">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> کنار شما هستیم
          </Badge>
          <h1 className="text-3xl font-black leading-tight text-mk-strong dark:text-white sm:text-4xl">
            تماس با برسانا
          </h1>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-mk-muted">
            سوالی پیش از ساخت فروشگاه دارید یا به پشتیبانی نیاز دارید؟ از راه‌های زیر یا فرم تماس با ما در ارتباط
            باشید. {contact.responseSla}
          </p>
        </div>
      </Section>

      <Section tone="muted" spacing="md">
        <div className="grid items-start gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <SectionHeading title="راه‌های ارتباطی" align="start" as="h2" />
            <div className="space-y-3">
              {channels.map((ch) => {
                const Inner = (
                  <Card className="flex items-center gap-4" padding="md">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600">
                      <ch.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-black text-mk-muted">{ch.label}</span>
                      <span
                        className={`block truncate text-xs font-black text-mk-strong dark:text-white ${ch.ltr ? 'text-left' : ''}`}
                        dir={ch.ltr ? 'ltr' : undefined}
                      >
                        {ch.value}
                      </span>
                    </span>
                  </Card>
                );
                return ch.href ? (
                  <a key={ch.label} href={ch.href} className="block transition-transform hover:-translate-y-0.5">
                    {Inner}
                  </a>
                ) : (
                  <div key={ch.label}>{Inner}</div>
                );
              })}
            </div>

            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-mk-line bg-mk-surface text-mk-muted transition-colors hover:border-primary-500 hover:text-primary-600"
                  >
                    <s.icon className="h-5 w-5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <Card padding="lg">
              <SectionHeading title="ارسال پیام" align="start" as="h2" className="mb-6" />
              <ContactForm email={email} />
            </Card>
          </div>
        </div>
      </Section>
    </div>
  );
}
