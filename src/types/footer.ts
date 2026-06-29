export interface FooterLink {
  id: string;
  label: string;
  url: string;
  target: '_self' | '_blank';
}

export interface FooterColumn {
  id: string;
  title: string;
  links: FooterLink[];
}

export interface FooterSocial {
  platform: 'instagram' | 'telegram' | 'whatsapp' | 'twitter' | 'linkedin' | 'youtube' | 'aparat' | 'phone' | 'email';
  url: string;
  enabled: boolean;
}

export interface FooterBadge {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  enabled: boolean;
}

export interface FooterConfig {
  enabled: boolean;
  theme: 'light' | 'dark' | 'custom';
  bgColor: string;
  textColor: string;
  linkColor: string;
  linkHoverColor: string;
  borderColor: string;
  logoUrl?: string | null;
  aboutText: string;
  copyrightText: string;
  showSocials: boolean;
  socials: FooterSocial[];
  showContactInfo: boolean;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  columns: FooterColumn[];
  customHtml?: string;
  badges: FooterBadge[];
}

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  enabled: true,
  theme: 'dark',
  bgColor: '#063c1b',
  textColor: '#F0FDF4',
  linkColor: '#F0FDF4',
  linkHoverColor: '#86EFAC',
  borderColor: '#22C55E',
  logoUrl: '/uploads/1781188662359-947019977.webp',
  aboutText: 'ما در فروشگاه خود همواره تلاش می‌کنیم تا بهترین و باکیفیت‌ترین محصولات را با مناسب‌ترین قیمت به دست شما برسانیم. رضایت شما بزرگترین سرمایه ماست.',
  copyrightText: 'تمامی حقوق مادی و معنوی این سایت متعلق به این فروشگاه می‌باشد.',
  showSocials: true,
  socials: [
    { platform: 'instagram', url: 'https://instagram.com', enabled: true },
    { platform: 'telegram', url: 'https://t.me', enabled: true },
    { platform: 'whatsapp', url: 'https://wa.me', enabled: true },
  ],
  showContactInfo: true,
  contactEmail: 'isyar1398@gmail.com',
  contactPhone: '05143344490',
  contactAddress: 'نیشابور چهارراه آفتاب پانزده خرداد 26 کافی نت خرداد',
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

export function parseFooterConfig(raw: string | null | undefined): FooterConfig {
  if (!raw) return DEFAULT_FOOTER_CONFIG;

  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_FOOTER_CONFIG,
      ...parsed,
      socials: parsed.socials ? parsed.socials : DEFAULT_FOOTER_CONFIG.socials,
      columns: parsed.columns ? parsed.columns : DEFAULT_FOOTER_CONFIG.columns,
      badges: parsed.badges ? parsed.badges : DEFAULT_FOOTER_CONFIG.badges,
    };
  } catch {
    return DEFAULT_FOOTER_CONFIG;
  }
}
