export interface ContactUsDepartment {
  id: string;
  name: string; // e.g. "پشتیبانی فروش", "همکاری و عمده‌فروشی", "شکایات و انتقادات"
  phone?: string;
  email?: string;
  responsiblePerson?: string; // Optional name of the manager/responsible person
}

export interface ContactUsOpeningHour {
  id: string;
  dayRange: string; // e.g. "شنبه تا چهارشنبه", "پنج‌شنبه"
  hours: string; // e.g. "۰۹:۰۰ الی ۱۸:۰۰", "۰۹:۰۰ الی ۱۳:۰۰"
}

export interface ContactUsSocialLink {
  id: string;
  platform: string; // "instagram" | "telegram" | "whatsapp" | "bale" | "eitaa" | "phone" | "website"
  username: string; // e.g. "my_shop_id" or "+989123456789"
  url: string; // Full link
}

export interface ContactUsFormConfig {
  enabled: boolean;
  title?: string; // e.g. "ارسال پیام مستقیم برای مدیریت"
  description?: string; // e.g. "می‌توانید نظرات، انتقادات و پیشنهادات خود را از طریق فرم زیر با ما در میان بگذارید."
  successMessage?: string; // e.g. "پیام شما با موفقیت ارسال شد. در سریع‌ترین زمان پاسخگو خواهیم بود."
}

export interface ContactUsMapConfig {
  enabled: boolean;
  provider: 'embed' | 'coordinates'; // 'embed' is google/neshan embed iframe, 'coordinates' is dynamic rendering
  embedUrl?: string; // Full iframe src url or embed link
  latitude?: string;
  longitude?: string;
  zoom?: number;
  addressDescription?: string; // e.g. "ورودی پارکینگ از خیابان بابایی..."
}

export interface ContactUsConfig {
  isStructured: boolean; // Flag to check if it's structured or fallback HTML
  hero: {
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
  };
  departments: {
    title?: string;
    list: ContactUsDepartment[];
  };
  openingHours: {
    title?: string;
    list: ContactUsOpeningHour[];
  };
  socialLinks: {
    title?: string;
    list: ContactUsSocialLink[];
  };
  contactForm: ContactUsFormConfig;
  map: ContactUsMapConfig;
  faqs: {
    title?: string;
    list: Array<{ id: string; question: string; answer: string }>;
  };
}

export const DEFAULT_CONTACT_US_CONFIG: ContactUsConfig = {
  isStructured: true,
  hero: {
    title: 'ارتباط با ما',
    subtitle: 'همواره در کنار شما هستیم؛ پاسخگویی و پشتیبانی سریع',
    description: 'تیم پشتیبانی و فروشگاه ما در تمامی روزهای کاری آماده شنیدن نظرات، پاسخگویی به سوالات و راهنمایی شما عزیزان می‌باشد. از راه‌های ارتباطی زیر می‌توانید با ما در تماس باشید.',
    imageUrl: '',
  },
  departments: {
    title: 'دپارتمان‌های پاسخگویی و بخش‌های تخصصی',
    list: [
      { id: 'dep1', name: 'پشتیبانی سفارشات و پیگیری', phone: '۰۲۱-۴۴۵۵۶۶۷۷ داخلی ۱', email: 'support@example.com' },
      { id: 'dep2', name: 'همکاری تجاری و خرید عمده B2B', phone: '۰۲۱-۴۴۵۵۶۶۷۷ داخلی ۲', email: 'wholesale@example.com' },
      { id: 'dep3', name: 'مدیریت و روابط عمومی', phone: '۰۲۱-۴۴۵۵۶۶۷۷ داخلی ۹', email: 'info@example.com' }
    ],
  },
  openingHours: {
    title: 'ساعات کاری و پاسخگویی حضوری و تلفنی',
    list: [
      { id: 'oh1', dayRange: 'شنبه تا چهارشنبه', hours: '۰۹:۰۰ الی ۱۸:۰۰' },
      { id: 'oh2', dayRange: 'پنج‌شنبه‌ها', hours: '۰۹:۰۰ الی ۱۳:۳۰' },
      { id: 'oh3', dayRange: 'جمعه و روزهای تعطیل رسمی', hours: 'تعطیل (پشتیبانی تیکتی فعال)' }
    ],
  },
  socialLinks: {
    title: 'شبکه‌های اجتماعی و پیام‌رسان‌ها',
    list: [
      { id: 'soc1', platform: 'instagram', username: 'myshop', url: 'https://instagram.com/myshop' },
      { id: 'soc2', platform: 'telegram', username: 'myshop_support', url: 'https://t.me/myshop_support' },
      { id: 'soc3', platform: 'bale', username: 'myshop', url: 'https://ble.ir/myshop' }
    ],
  },
  contactForm: {
    enabled: true,
    title: 'ارسال پیام مستقیم',
    description: 'اگر سوال، پیشنهاد یا انتقادی دارید، خوشحال می‌شویم از طریق فرم زیر آن را برای ما ارسال کنید تا در اسرع وقت پاسخگوی شما باشیم.',
    successMessage: 'پیام شما با موفقیت به بخش پشتیبانی ارسال شد. متشکریم از ارتباط شما.',
  },
  map: {
    enabled: false,
    provider: 'embed',
    embedUrl: '',
    latitude: '35.6997', // Tehran Lat
    longitude: '51.3380', // Tehran Lng
    zoom: 14,
    addressDescription: 'دفتر مرکزی: تهران، خیابان ولیعصر، برج سپهر، طبقه ۵',
  },
  faqs: {
    title: 'سوالات متداول مشتریان درباره پشتیبانی',
    list: [
      { id: 'faq1', question: 'چقدر طول می‌کشد تا به پیام‌های فرم تماس پاسخ داده شود؟', answer: 'تمامی پیام‌های ارسال شده از طریق فرم تماس حداکثر ظرف مدت ۴ ساعت کاری توسط دپارتمان مربوطه بررسی و پاسخ داده خواهند شد.' },
      { id: 'faq2', question: 'آیا امکان مراجعه حضوری به دفتر مرکزی وجود دارد؟', answer: 'جهت انجام امور تجاری و اداری، هماهنگی قبلی تلفنی الزامی است. خدمات فروش حضوری کالا در دفتر مرکزی انجام نمی‌شود.' }
    ],
  },
};

export function parseContactUsConfig(raw: string | null | undefined): ContactUsConfig {
  if (!raw) return DEFAULT_CONTACT_US_CONFIG;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.isStructured) {
      return {
        isStructured: true,
        hero: {
          title: parsed.hero?.title || DEFAULT_CONTACT_US_CONFIG.hero.title,
          subtitle: parsed.hero?.subtitle !== undefined ? parsed.hero.subtitle : DEFAULT_CONTACT_US_CONFIG.hero.subtitle,
          description: parsed.hero?.description !== undefined ? parsed.hero.description : DEFAULT_CONTACT_US_CONFIG.hero.description,
          imageUrl: parsed.hero?.imageUrl !== undefined ? parsed.hero.imageUrl : DEFAULT_CONTACT_US_CONFIG.hero.imageUrl,
        },
        departments: {
          title: parsed.departments?.title || DEFAULT_CONTACT_US_CONFIG.departments.title,
          list: Array.isArray(parsed.departments?.list) ? parsed.departments.list : DEFAULT_CONTACT_US_CONFIG.departments.list,
        },
        openingHours: {
          title: parsed.openingHours?.title || DEFAULT_CONTACT_US_CONFIG.openingHours.title,
          list: Array.isArray(parsed.openingHours?.list) ? parsed.openingHours.list : DEFAULT_CONTACT_US_CONFIG.openingHours.list,
        },
        socialLinks: {
          title: parsed.socialLinks?.title || DEFAULT_CONTACT_US_CONFIG.socialLinks.title,
          list: Array.isArray(parsed.socialLinks?.list) ? parsed.socialLinks.list : DEFAULT_CONTACT_US_CONFIG.socialLinks.list,
        },
        contactForm: {
          enabled: parsed.contactForm?.enabled !== undefined ? !!parsed.contactForm.enabled : DEFAULT_CONTACT_US_CONFIG.contactForm.enabled,
          title: parsed.contactForm?.title || DEFAULT_CONTACT_US_CONFIG.contactForm.title,
          description: parsed.contactForm?.description !== undefined ? parsed.contactForm.description : DEFAULT_CONTACT_US_CONFIG.contactForm.description,
          successMessage: parsed.contactForm?.successMessage !== undefined ? parsed.contactForm.successMessage : DEFAULT_CONTACT_US_CONFIG.contactForm.successMessage,
        },
        map: {
          enabled: parsed.map?.enabled !== undefined ? !!parsed.map.enabled : DEFAULT_CONTACT_US_CONFIG.map.enabled,
          provider: parsed.map?.provider || DEFAULT_CONTACT_US_CONFIG.map.provider,
          embedUrl: parsed.map?.embedUrl !== undefined ? parsed.map.embedUrl : DEFAULT_CONTACT_US_CONFIG.map.embedUrl,
          latitude: parsed.map?.latitude !== undefined ? parsed.map.latitude : DEFAULT_CONTACT_US_CONFIG.map.latitude,
          longitude: parsed.map?.longitude !== undefined ? parsed.map.longitude : DEFAULT_CONTACT_US_CONFIG.map.longitude,
          zoom: parsed.map?.zoom !== undefined ? Number(parsed.map.zoom) : DEFAULT_CONTACT_US_CONFIG.map.zoom,
          addressDescription: parsed.map?.addressDescription !== undefined ? parsed.map.addressDescription : DEFAULT_CONTACT_US_CONFIG.map.addressDescription,
        },
        faqs: {
          title: parsed.faqs?.title || DEFAULT_CONTACT_US_CONFIG.faqs.title,
          list: Array.isArray(parsed.faqs?.list) ? parsed.faqs.list : DEFAULT_CONTACT_US_CONFIG.faqs.list,
        },
      };
    }
  } catch {
    // Non-JSON standard HTML
  }

  // Not structured JSON or error parsing -> return fallback indicator with raw html in hero.description
  return {
    isStructured: false,
    hero: {
      title: 'تماس با ما',
      description: raw,
    },
    departments: { list: [] },
    openingHours: { list: [] },
    socialLinks: { list: [] },
    contactForm: { enabled: false },
    map: { enabled: false, provider: 'embed' },
    faqs: { list: [] },
  };
}
