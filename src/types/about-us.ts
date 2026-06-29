export interface AboutUsBrandStory {
  title?: string;
  storyText: string;
  foundingYear?: string;
  visionText?: string;
  missionText?: string;
  imageUrl?: string;
}

export interface AboutUsCoreValue {
  id: string;
  title: string;
  description: string;
  serviceId?: string; // linked to specific service, "general" or empty means general value
}

export interface AboutUsSubService {
  id: string;
  title: string;
  description: string;
}

export interface AboutUsTeamMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
}

export interface AboutUsService {
  id: string;
  title: string;
  description: string;
  subServices: AboutUsSubService[];
  details: string; // Shown as Tab/Accordion content
  team: AboutUsTeamMember[];
  contact: {
    phone?: string;
    email?: string;
    address?: string;
  };
  faqs: Array<{ id: string; question: string; answer: string }>;
}

export interface AboutUsTestimonial {
  id: string;
  author: string;
  role?: string;
  avatarUrl?: string;
  comment: string;
  serviceId?: string; // associated service ID, or "general"
  rating?: number;
}

export interface AboutUsConfig {
  isStructured: boolean; // Flag to check if it's the structured version or fallback
  brandStory: AboutUsBrandStory;
  coreValues: {
    title?: string;
    list: AboutUsCoreValue[];
  };
  services: {
    title?: string;
    list: AboutUsService[];
  };
  team: {
    title?: string;
    platformTeam: AboutUsTeamMember[];
  };
  testimonials: {
    title?: string;
    list: AboutUsTestimonial[];
  };
  contact: {
    title?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  faqs: {
    title?: string;
    generalFaqs: Array<{ id: string; question: string; answer: string }>;
  };
}

export const DEFAULT_ABOUT_US_CONFIG: AboutUsConfig = {
  isStructured: true,
  brandStory: {
    title: 'داستان برند ما',
    storyText: 'ما از سال‌ها پیش فعالیت خود را با هدف تحول در حوزه دیجیتال و ارائه خدمات بی‌واسطه آغاز کردیم. تلاش مداوم تیم ما همواره برآورده کردن نیازهای کاربران با بالاترین کیفیت بوده است.',
    foundingYear: '۱۳۹۸',
    visionText: 'پیشتاز بودن در ارائه راهکارهای نوین و ایجاد ارزش پایدار برای تک‌تک مخاطبانمان در سراسر کشور.',
    missionText: 'تسهیل فرآیندها، پشتیبانی همه‌جانبه و ارتقای مداوم کیفیت خدمات در جهت جلب رضایت حداکثری مشتریان.',
    imageUrl: '',
  },
  coreValues: {
    title: 'ارزش‌های اصلی ما',
    list: [
      { id: 'v1', title: 'تمرکز بر مشتری', description: 'همواره حق با مشتری است و رضایت مخاطبان اولویت اول و آخر ماست.', serviceId: 'general' },
      { id: 'v2', title: 'نوآوری مداوم', description: 'ما هیچ‌گاه به وضعیت موجود راضی نمی‌شویم و همواره به دنبال راه‌های بهتری هستیم.', serviceId: 'general' },
      { id: 'v3', title: 'شفافیت و صداقت', description: 'پایه و اساس تمامی تعاملات ما با کاربران، همکاران و شرکا شفافیت کامل است.', serviceId: 'general' },
    ],
  },
  services: {
    title: 'ساختار خدمات ما',
    list: [
      {
        id: 'digital',
        title: 'سرویس دیجیتال',
        description: 'راهکارهای نوین توسعه نرم‌افزار، طراحی وب و مدیریت پلتفرم‌های ابری.',
        subServices: [
          { id: 'ds1', title: 'توسعه وب و اپلیکیشن', description: 'طراحی تخصصی فرانت‌اند و بک‌اند با آخرین تکنولوژی‌ها.' },
          { id: 'ds2', title: 'خدمات ابری', description: 'میزبانی ابری ایمن و بهینه با مقیاس‌پذیری بالا.' }
        ],
        details: 'در بخش خدمات دیجیتال ما، تمرکز اصلی بر طراحی و پیاده‌سازی زیرساخت‌های پایدار برای فروشگاه‌های مدرن است. ما با به‌کارگیری فریم‌ورک‌های روزآمد و رعایت استانداردهای جهانی، به شما در افزایش سرعت و بهبود تجربه خریداران کمک می‌کنیم.',
        team: [
          { id: 't1', name: 'آرش علوی', role: 'مدیر فنی سرویس دیجیتال', avatarUrl: '' }
        ],
        contact: {
          phone: '۰۲۱-۱۲۳۴۵۶۷۸',
          email: 'digital@example.com',
          address: 'تهران، پارک فناوری، ساختمان شماره ۲'
        },
        faqs: [
          { id: 'sf1', question: 'مدت زمان راه‌اندازی سرویس دیجیتال چقدر است؟', answer: 'بسته به ابعاد پروژه بین ۲ الی ۴ هفته کاری زمان می‌برد.' }
        ]
      },
      {
        id: 'logistics',
        title: 'سرویس لجستیک و ارسال',
        description: 'مدیریت هوشمند زنجیره تأمین، بسته‌بندی ایمن و ارسال سریع کالاها.',
        subServices: [
          { id: 'ls1', title: 'انبارداری هوشمند', description: 'رهگیری مکانیزه کالاها از لحظه ورود تا خروج.' },
          { id: 'ls2', title: 'ارسال اکسپرس', description: 'تحویل سریع درون‌شهری و بین‌شهری با همکاری شرکت‌های برتر.' }
        ],
        details: 'سرویس لجستیک ما با استفاده از الگوریتم‌های هوشمند مسیریابی و همکاری با توزیع‌کنندگان معتبر، هزینه‌های ارسال شما را به حداقل رسانده و امنیت و سلامت مرسولات شما را تا رسیدن به دست خریدار تضمین می‌کند.',
        team: [
          { id: 't2', name: 'حسین رضایی', role: 'مدیر لجستیک و انبارها', avatarUrl: '' }
        ],
        contact: {
          phone: '۰۲۱-۸۷۶۵۴۳۲۱',
          email: 'logistics@example.com',
          address: 'تهران، منطقه صنعتی، انبار مرکزی لجستیک'
        },
        faqs: [
          { id: 'sf2', question: 'ارسال‌ها به چه روش‌هایی انجام می‌شود؟', answer: 'ارسال‌ها از طریق پست پیشتاز، تیپاکس و پیک اختصاصی با قابلیت رهگیری لحظه‌ای صورت می‌گیرد.' }
        ]
      }
    ],
  },
  team: {
    title: 'تیم مدیریتی و اجرایی',
    platformTeam: [
      { id: 'tm1', name: 'علیرضا راد', role: 'مدیرعامل پلتفرم', avatarUrl: '', bio: 'بیش از ۱۰ سال سابقه مدیریت پروژه‌های تجارت الکترونیک در ابعاد ملی.' },
      { id: 'tm2', name: 'مریم حسینی', role: 'رئیس هیئت مدیره', avatarUrl: '', bio: 'کارشناس ارشد کسب‌وکار با سابقه هدایت استارتاپ‌های موفق.' }
    ],
  },
  testimonials: {
    title: 'نظرات همکاران و خریداران ما',
    list: [
      { id: 'test1', author: 'کامران امیری', role: 'مدیر فروشگاه پوشاک شیک', comment: 'با استفاده از سرویس‌های لجستیک این پلتفرم، سرعت تحویل سفارشات ما بیش از ۴۰ درصد افزایش یافته است.', serviceId: 'logistics', rating: 5 },
      { id: 'test2', author: 'سارا کریمی', role: 'صاحب برند زیورآلات گلسار', comment: 'پشتیبانی فنی و ابزارهای توسعه دیجیتال فوق‌العاده باکیفیت و با سرعت بالا هستند.', serviceId: 'digital', rating: 5 },
    ],
  },
  contact: {
    title: 'راه‌های ارتباط با ما',
    phone: '۰۲۱-۴۴۵۵۶۶۷۷',
    email: 'info@example.com',
    address: 'تهران، خیابان ولیعصر، برج سپهر، طبقه ۵',
  },
  faqs: {
    title: 'پرسش‌های متداول عمومی',
    generalFaqs: [
      { id: 'gf1', question: 'این پلتفرم چه خدماتی ارائه می‌دهد؟', answer: 'ما یک پلتفرم جامع تجارت الکترونیک برای راه‌اندازی، مدیریت، پشتیبانی و لجستیک فروشگاه‌های آنلاین هستیم.' },
      { id: 'gf2', question: 'چگونه می‌توانیم با خدمات اختصاصی شما همکاری کنیم؟', answer: 'کافی است از طریق فرم تماس یا شماره تلفن‌های درج‌شده با کارشناسان ما تماس بگیرید تا در سریع‌ترین زمان ممکن مشاوره دریافت کنید.' },
    ],
  },
};

export function parseAboutUsConfig(raw: string | null | undefined): AboutUsConfig {
  if (!raw) return DEFAULT_ABOUT_US_CONFIG;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.isStructured) {
      return {
        isStructured: true,
        brandStory: {
          ...DEFAULT_ABOUT_US_CONFIG.brandStory,
          ...parsed.brandStory,
        },
        coreValues: {
          title: parsed.coreValues?.title || DEFAULT_ABOUT_US_CONFIG.coreValues.title,
          list: Array.isArray(parsed.coreValues?.list) ? parsed.coreValues.list : DEFAULT_ABOUT_US_CONFIG.coreValues.list,
        },
        services: {
          title: parsed.services?.title || DEFAULT_ABOUT_US_CONFIG.services.title,
          list: Array.isArray(parsed.services?.list) ? parsed.services.list : DEFAULT_ABOUT_US_CONFIG.services.list,
        },
        team: {
          title: parsed.team?.title || DEFAULT_ABOUT_US_CONFIG.team.title,
          platformTeam: Array.isArray(parsed.team?.platformTeam) ? parsed.team.platformTeam : DEFAULT_ABOUT_US_CONFIG.team.platformTeam,
        },
        testimonials: {
          title: parsed.testimonials?.title || DEFAULT_ABOUT_US_CONFIG.testimonials.title,
          list: Array.isArray(parsed.testimonials?.list) ? parsed.testimonials.list : DEFAULT_ABOUT_US_CONFIG.testimonials.list,
        },
        contact: {
          ...DEFAULT_ABOUT_US_CONFIG.contact,
          ...parsed.contact,
        },
        faqs: {
          title: parsed.faqs?.title || DEFAULT_ABOUT_US_CONFIG.faqs.title,
          generalFaqs: Array.isArray(parsed.faqs?.generalFaqs) ? parsed.faqs.generalFaqs : DEFAULT_ABOUT_US_CONFIG.faqs.generalFaqs,
        },
      };
    }
  } catch {
    // Non-JSON standard HTML
  }

  // Not structured JSON or error parsing -> return fallback indicator with raw html in storyText
  return {
    isStructured: false,
    brandStory: {
      storyText: raw,
    },
    coreValues: { list: [] },
    services: { list: [] },
    team: { platformTeam: [] },
    testimonials: { list: [] },
    contact: {},
    faqs: { generalFaqs: [] },
  };
}
