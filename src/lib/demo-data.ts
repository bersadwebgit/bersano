export interface DemoCategory {
  name: string;
  slug: string;
}

export interface DemoProduct {
  title: string;
  type: 'physical' | 'digital';
  price: number;
  discount: number;
  stock: number;
  description: string;
  fullDescription: string;
  features: Record<string, string>;
  specs: Record<string, string>;
  imageUrl: string;
  galleryUrls: string[];
  variants?: {
    name: string;
    price: number;
    stock: number;
    colorCode?: string;
  }[];
  // Digital specific fields
  fileUrl?: string;
  fileFormat?: string;
  fileSize?: string;
  previewUrl?: string;
  techSpecs?: string;
  downloadFiles?: { name: string; url: string; size: string; format: string }[];
}

export interface DemoReview {
  rating: number;
  comment: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface DemoBlogPost {
  title: string;
  slug: string;
  summary: string;
  content: string;
  featuredImage: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  faqs: { question: string; answer: string }[];
}

export interface DemoSlide {
  imageUrl: string;
  title: string;
  subtitle: string;
  linkText: string;
  linkUrl: string;
}

export interface DemoStory {
  title: string;
  thumbnailUrl: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  text: string;
  linkText: string;
  linkUrl: string;
}

export interface DemoData {
  themeColor: string;
  physicalCategory: DemoCategory;
  digitalCategory: DemoCategory;
  physicalProduct?: DemoProduct;
  digitalProduct?: DemoProduct;
  physicalProducts?: DemoProduct[];
  digitalProducts?: DemoProduct[];
  physicalReviews: DemoReview[];
  digitalReviews: DemoReview[];
  blogCategory: DemoCategory;
  blogPost: DemoBlogPost;
  slides: DemoSlide[];
  stories: DemoStory[];
  footerAboutText?: string;
  footerCopyrightText?: string;
  aboutUsPage?: string;
  termsPage?: string;
  faqsConfig?: { question: string; answer: string }[];
}

export const demoDataMap: Record<string, DemoData> = {
  clothing: {
    themeColor: '#db2777', // pink-600
    physicalCategory: { name: 'پوشاک و مد', slug: 'clothing-and-fashion' },
    digitalCategory: { name: 'ژورنال و راهنمای استایل', slug: 'digital-style-guides' },
    physicalProduct: {
      title: 'کت و شلوار مجلسی مردانه مدل دیپلمات کلاسیک',
      type: 'physical',
      price: 5400000,
      discount: 600000,
      stock: 12,
      description: 'کت و شلوار مجلسی مردانه دوخته شده با پارچه عالی دیپلمات، مناسب برای مراسم رسمی، مجالس و جلسات کاری مهم.',
      fullDescription: 'این کت و شلوار مجلسی با استفاده از پارچه‌های باکیفیت و دوخت صنعتی درجه یک تولید شده است. طراحی تن‌خور (اسلیم فیت) آن ظاهر شما را بسیار شیک‌تر نشان می‌دهد. شامل کت دو دکمه با یقه بلیزر و شلوار راسته کلاسیک اتو خورده است. آستر داخلی کت از جنس ساتن درجه یک ضد تعریق می‌باشد.',
      features: {
        'نوع پارچه': 'دیپلمات ترک (۷۰٪ پشم، ۳۰٪ ویسکوز)',
        'برش و قواره': 'Slim Fit (تن‌خور جذب)',
        'اقلام همراه': 'کت مجلسی + شلوار راسته + کاور و آویز مخصوص'
      },
      specs: {
        'کشور سازنده': 'ایران (پارچه وارداتی)',
        'نیاز به اتوکشی': 'دارد (ترجیحاً خشکشویی)',
        'روش شستشو': 'فقط خشکشویی مجاز است'
      },
      imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800&auto=format&fit=crop&q=60',
        ''
      ],
      variants: [
        { name: 'رنگ سرمه‌ای - سایز ۵۰', price: 5400000, stock: 6, colorCode: '#1e3a8a' },
        { name: 'رنگ مشکی - سایز ۵۲', price: 5500000, stock: 6, colorCode: '#000000' }
      ]
    },
    digitalProduct: {
      title: 'کتاب الکترونیکی راهنمای جامع ست کردن رنگ‌های لباس پاییزی',
      type: 'digital',
      price: 180000,
      discount: 40000,
      stock: 99999,
      description: 'یک ایبوک (PDF) بسیار کاربردی برای ست کردن رنگ‌ها و استایل‌های پاییزی و زمستانی ویژه خانم‌ها و آقایان.',
      fullDescription: 'اگر همیشه در انتخاب رنگ لباس‌های خود دچار تردید هستید، این کتابچه راهنما برای شماست. در این راهنمای جامع، با چرخه رنگ‌ها، تضادها و هماهنگی‌های رنگی در پوشاک آشنا می‌شوید. همچنین بیش از ۵۰ پلت رنگی آماده برای استایل‌های خیابانی و رسمی پاییزی در این کتاب گردآوری شده است.',
      features: {
        'تعداد صفحات': '۸۵ صفحه مصور رنگی',
        'فرمت ارائه': 'فایل الکترونیکی PDF',
        'مخاطب': 'علاقه‌مندان به شیک‌پوشی و مد'
      },
      specs: {
        'زبان': 'فارسی روان',
        'حجم فایل': '۱۲.۵ مگابایت',
        'دسترسی پس از خرید': 'دانلود مستقیم و آنی'
      },
      imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=60'
      ],
      fileUrl: '/downloads/style-guide-autumn.pdf',
      fileFormat: 'PDF',
      fileSize: '12.5 MB',
      previewUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=60',
      techSpecs: 'قابل مطالعه در تمامی موبایل‌ها، تبلت‌ها و کامپیوترها با نرم‌افزار PDF Reader.',
      downloadFiles: [
        { name: 'فایل اصلی راهنمای ست رنگ پاییز', url: '/downloads/style-guide-autumn.pdf', size: '12.5 MB', format: 'PDF' }
      ]
    },
    physicalReviews: [
      { rating: 5, comment: 'کیفیت دوختش واقعاً عالیه. تن‌خورش خیلی شیک و مرتبه و پارچه‌اش پرز نمی‌گیره. کاملا ارزش خرید داره.', customerName: 'امیرحسین رضایی', customerEmail: 'amir@example.com', customerPhone: '09121111111' },
      { rating: 4, comment: 'رنگ سرمه‌ایش رو خریدم، دقیقاً مطابق عکس بود. فقط شلوارش کمی نیاز به کوتاه کردن داشت که اونم طبیعیه.', customerName: 'مریم حسینی', customerEmail: 'maryam@example.com', customerPhone: '09122222222' }
    ],
    digitalReviews: [
      { rating: 5, comment: 'من برای بوتیک خودم خریدم تا به مشتری‌هام ایده بدم. واقعا پلت‌های رنگی فوق‌العاده کاربردی توش طراحی شده.', customerName: 'سعید صابری', customerEmail: 'saeed@example.com', customerPhone: '09123333333' }
    ],
    blogCategory: { name: 'دانستنی‌های مد و پوشاک', slug: 'fashion-tips' },
    blogPost: {
      title: 'رازهای شیک‌پوشی: چگونه با حداقل لباس‌ها همیشه جذاب به نظر برسیم؟',
      slug: 'secrets-of-stylish-dressing',
      summary: 'در این مقاله به بررسی کمد کپسولی پرداخته‌ایم؛ روشی نوین در دنیا که به شما کمک می‌کند با تعداد کمی لباس، بیش از ۳۰ ست متفاوت و بسیار شیک برای موقعیت‌های مختلف بسازید.',
      content: `<h2>کمد کپسولی چیست و چرا به آن نیاز داریم؟</h2>
<p>شاید برای شما هم پیش آمده باشد که مقابل کمد لباسی پر از لباس بایستید و با خود بگویید: "من هیچ لباسی برای پوشیدن ندارم!". این مشکل بزرگ به دلیل خرید‌های بدون برنامه و انباشته شدن لباس‌هایی است که با هم هماهنگ نیستند. راه حل این مشکل، ساخت یک کمد کپسولی (Capsule Wardrobe) است.</p>

<blockquote>
  <strong>راهنمای تست:</strong> این مقاله نمونه‌ای از محتوای وبلاگ اختصاصی فروشگاه پوشاک شماست. با ثبت اولین محصول واقعی، تمام داده‌های تستی به طور خودکار پاک شده و این مقالات به حالت پیش‌نویس انتقال خواهند یافت تا از دید مشتری پنهان شوند.
</blockquote>

<h2>گام‌های ساخت کمد کپسولی شیک</h2>
<p>یک کمد کپسولی شامل حدود ۱۵ تا ۳۰ تکه لباس باکیفیت و کلاسیک است که به راحتی با هم هماهنگ می‌شوند. برای ساخت آن:</p>
<ol>
  <li><strong>رنگ‌های خنثی را انتخاب کنید:</strong> رنگ‌های سفید، مشکی، طوسی، کرم و سرمه‌ای پایه و اساس کمد شما هستند.</li>
  <li><strong>به کیفیت اهمیت دهید:</strong> چون قرار است این لباس‌ها را بارها بپوشید، جنس‌های مرغوب مانند نخ، پنبه و کتان انتخاب کنید.</li>
  <li><strong>لباس‌های کلاسیک تهیه کنید:</strong> یک کت تک خوش‌دوخت، شلوار جین تیره، شومیز یا پیراهن سفید دکمه‌دار و یک جفت کفش کتانی سفید ساده همواره شیک هستند.</li>
</ol>
<p>با ست کردن همین چند قلم کالا، می‌توانید ده‌ها استایل برای محیط کار، کافه، سفر یا قرارهای نیمه‌رسمی ایجاد کنید.</p>`,
      featuredImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=60',
      tags: ['پوشاک', 'مد و زیبایی', 'استایل', 'کمد کپسولی'],
      seoTitle: 'رازهای شیک‌پوشی و راهنمای ساخت کمد کپسولی لباس',
      seoDescription: 'آموزش ساخت کمد لباس کپسولی برای خانم‌ها و آقایان، ست کردن رنگ‌ها با حداقل لباس‌ها و داشتن استایلی شیک و ارزان.',
      faqs: [
        { question: 'کمد کپسولی شامل چند لباس است؟', answer: 'به طور استاندارد بین ۱۵ تا ۳۰ تکه لباس شامل کفش و کت که همگی با هم ست می‌شوند.' },
        { question: 'آیا رنگ‌های تند هم در کمد کپسولی جا دارند؟', answer: 'بله، اما حداکثر ۱۰ تا ۲۰ درصد کل کمد را باید شامل شوند و بقیه خنثی باشند.' }
      ]
    },
    slides: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&auto=format&fit=crop&q=80',
        title: 'جشنواره بزرگ پوشاک پاییزی',
        subtitle: 'تا ۴۰ درصد تخفیف روی جدیدترین مدل‌های کت، کاپشن و پالتوهای امسال',
        linkText: 'مشاهده مجموعه جدید',
        linkUrl: '/shop'
      }
    ],
    stories: [
      {
        title: 'استایل پاییزی',
        thumbnailUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=60',
        mediaUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=60',
        mediaType: 'image',
        text: 'مجموعه استایل‌های پاییزی شیک رسید! برای خرید ضربه بزنید.',
        linkText: 'خرید فوری',
        linkUrl: '/shop'
      }
    ]
  },
  electronics: {
    themeColor: '#0284c7', // sky-600
    physicalCategory: { name: 'لوازم جانبی دیجیتال', slug: 'digital-accessories' },
    digitalCategory: { name: 'کتابچه ترفندهای سیستم‌عامل', slug: 'os-tricks' },
    physicalProduct: {
      title: 'هدفون بی‌سیم بلوتوثی نویز کنسلینگ مدل پرو ANC',
      type: 'physical',
      price: 3800000,
      discount: 400000,
      stock: 8,
      description: 'هدفون دورگوشی مجهز به قابلیت حذف نویز فعال (ANC)، کیفیت صدای شفاف Hi-Res و باتری ۴۰ ساعته.',
      fullDescription: 'با این هدفون نویزکنسلینگ فوق‌العاده، صدای محیط را کاملاً حذف کنید و در عمق موسیقی غوطه‌ور شوید. درایورهای داینامیک ۴۰ میلی‌متری صدایی با جزئیات بالا و بیسی قدرتمند تولید می‌کنند. طراحی ارگونومیک با بالشتک‌های ابری نرم و قابلیت تا شدن، استفاده طولانی بدون خستگی و حمل آسان را فراهم می‌کند.',
      features: {
        'نسخه بلوتوث': 'بلوتوث ۵.۳ پایدار',
        'میزان شارژدهی': 'تا ۴۰ ساعت پخش مداوم موسیقی',
        'فناوری نویز کنسلینگ': 'ANC فعال با عمق کاهش نویز ۳۵ دسی‌بل'
      },
      specs: {
        'وزن': '۲۴۵ گرم',
        'درگاه شارژ': 'USB Type-C (شارژ سریع در ۱.۵ ساعت)',
        'پشتیبانی از کارت حافظه': 'بله (تا ۶۴ گیگابایت)'
      },
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=60'
      ],
      variants: [
        { name: 'رنگ مشکی مات', price: 3800000, stock: 5, colorCode: '#1a1a1a' },
        { name: 'رنگ سفید استخوانی', price: 3900000, stock: 3, colorCode: '#f5f5f0' }
      ]
    },
    digitalProduct: {
      title: 'راهنمای ترفندهای مخفی و میانبرهای ویندوز ۱۱ و مک',
      type: 'digital',
      price: 95000,
      discount: 25000,
      stock: 99999,
      description: 'یک فایل راهنمای جامع (PDF) برای افزایش سرعت کار، یادگیری کلیدهای میانبر و ابزارهای کاربردی سیستم‌عامل.',
      fullDescription: 'آیا می‌خواهید راندمان کاری خود را با کامپیوتر چند برابر کنید؟ در این ایبوک، تمام ابزارهای پنهان ویندوز ۱۱ و مک‌اواس را یاد می‌گیرید که کارها را برای شما ساده‌تر می‌کنند. این آموزش ویژه برنامه‌نویسان، طراحان و تمام افرادی است که کارهای روزمره‌شان با رایانه است.',
      features: {
        'تعداد ترفندها': 'بیش از ۱۰۰ ترفند تست شده',
        'فرمت فایل': 'PDF به همراه ویدیوهای دمو کوتاه',
        'حجم دانلود': '۱۸ مگابایت'
      },
      specs: {
        'زبان': 'فارسی به همراه تصاویر گام به گام',
        'سطح آموزش': 'مقدماتی تا حرفه‌ای',
        'آپدیت‌های رایگان': 'دارد (ارسال به ایمیل خریدار)'
      },
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'
      ],
      fileUrl: '/downloads/windows-mac-tricks.pdf',
      fileFormat: 'PDF',
      fileSize: '18 MB',
      previewUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60',
      techSpecs: 'سازگار با تمام سیستم‌عامل‌ها و پلیرها.',
      downloadFiles: [
        { name: 'ایبوک ترفندهای ویندوز و مک', url: '/downloads/windows-mac-tricks.pdf', size: '18 MB', format: 'PDF' }
      ]
    },
    physicalReviews: [
      { rating: 5, comment: 'تفکیک صداش واقعا عالیه و با روشن کردن ANC صدای خیابون کاملاً قطع میشه. تو این رنج قیمت بی‌رقیبه.', customerName: 'امیرحسین رضایی', customerEmail: 'amir@example.com', customerPhone: '09121111111' },
      { rating: 4, comment: 'بیس قوی داره ولی بدنه هدفون از پلاستیکه که البته جنسش مرغوبه. نگهداری باتریش حرف نداره.', customerName: 'مریم حسینی', customerEmail: 'maryam@example.com', customerPhone: '09122222222' }
    ],
    digitalReviews: [
      { rating: 5, comment: 'من چند تا میانبر یاد گرفتم که واقعاً کارم رو سریع‌تر کرد. خریدش رو به همه توصیه می‌کنم.', customerName: 'علی رضایی', customerEmail: 'ali@example.com', customerPhone: '09124444444' }
    ],
    blogCategory: { name: 'تکنولوژی و فناوری', slug: 'tech-news' },
    blogPost: {
      title: 'راهنمای خرید هدفون بی‌سیم: قبل از خرید به چه نکاتی توجه کنیم؟',
      slug: 'wireless-headphone-buying-guide',
      summary: 'دنیای هدفون‌ها بسیار بزرگ و سردرگم‌کننده است. در این مقاله به بررسی تفاوت نویز کنسلینگ فعال و غیرفعال، امپدانس، نسخه بلوتوث و ارگونومی می‌پردازیم.',
      content: `<h2>انتخاب هدفون مناسب بر اساس نیاز شما</h2>
<p>امروزه هدفون‌ها از یک ابزار ساده به یکی از وسایل ضروری زندگی تبدیل شده‌اند. برای انتخاب بهترین مدل باید معیارهای متفاوتی را مد نظر قرار دهید:</p>

<blockquote>
  <strong>راهنمای تست:</strong> این یک مقاله تستی در حوزه تکنولوژی برای فروشگاه شماست. هنگامی که اولین محصول واقعی خود را ثبت کنید، این اطلاعات آزمایشی حذف خواهند شد و این مقاله به صورت پیش‌نویس صرفاً در پنل شما قرار می‌گیرد.
</blockquote>

<h2>معیارهای کلیدی در انتخاب هدفون</h2>
<ul>
  <li><strong>حذف نویز فعال (ANC):</strong> این سیستم با ضبط فرکانس‌های بیرون و تولید فرکانس معکوس، صدای محیط مانند صدای هواپیما یا خودرو را حذف می‌کند.</li>
  <li><strong>طول عمر باتری:</strong> برای استفاده‌های روزانه، هدفون‌هایی با باتری بالای ۲۰ ساعت توصیه می‌شوند.</li>
  <li><strong>پایداری بلوتوث:</strong> سعی کنید هدفون‌هایی با بلوتوث نسخه ۵.۰ به بالا تهیه کنید تا قطع و وصلی صدا نداشته باشید.</li>
</ul>
<p>اگر هدفون را برای ورزش می‌خواهید، حتما به ضد آب بودن (استاندارد IPX) آن توجه کنید تا در مقابل تعریق آسیب نبیند.</p>`,
      featuredImage: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=60',
      tags: ['هدفون', 'راهنمای خرید', 'تکنولوژی', 'نویز کنسلینگ'],
      seoTitle: 'راهنمای خرید هدفون بی‌سیم و نکات کلیدی آن',
      seoDescription: 'تفاوت‌های هدفون نویز کنسلینگ فعال و غیرفعال، امپدانس صدا و معرفی بهترین هدفون‌های بی‌سیم بازار.',
      faqs: [
        { question: 'آیا نویزکنسلینگ فعال برای سلامتی مضر است؟', answer: 'خیر، این فناوری فقط فرکانس صوتی معکوس تولید می‌کند و هیچ ضرری برای گوش ندارد.' },
        { question: 'امپدانس بالاتر هدفون به چه معناست؟', answer: 'به زبان ساده یعنی هدفون برای تولید حجم صدای بالاتر نیاز به قدرت منبع (آمپلی‌فایر) بیشتری دارد.' }
      ]
    },
    slides: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop&q=80',
        title: 'جدیدترین ابزارهای دیجیتال روز دنیا',
        subtitle: 'فروش تخصصی انواع هدفون، ساعت هوشمند و لوازم جانبی با ضمانت اصالت کالا',
        linkText: 'مشاهده و خرید',
        linkUrl: '/shop'
      }
    ],
    stories: [
      {
        title: 'هدفون ANC پرو',
        thumbnailUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&auto=format&fit=crop&q=60',
        mediaUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=60',
        mediaType: 'image',
        text: 'موزیک را با عمق واقعی بشنوید. هدفون ANC پرو مکس شارژ شد!',
        linkText: 'جزئیات محصول',
        linkUrl: '/shop'
      }
    ]
  },
  cosmetics: {
    themeColor: '#ec4899', // pink-500
    physicalCategory: { name: 'مراقبت از پوست', slug: 'skin-care' },
    digitalCategory: { name: 'کتابچه روتین پوستی', slug: 'skin-routines' },
    physicalProduct: {
      title: 'سرم آبرسان عمقی پوست هیالورونیک اسید ۲٪',
      type: 'physical',
      price: 680000,
      discount: 90000,
      stock: 15,
      description: 'سرم آبرسان و جوانساز قوی حاوی هیالورونیک اسید ۲ درصد خالص و ویتامین B5 جهت رفع خشکی و چروک ریز.',
      fullDescription: 'پوست خود را با سرم هیالورونیک اسید غنی شاداب و جوان کنید. این سرم با فرمولاسیون پیشرفته، رطوبت را به لایه‌های عمقی پوست رسانده و از تبخیر سطحی آب جلوگیری می‌کند. ویتامین B5 موجود در آن روند بازسازی سد دفاعی پوست را سرعت می‌بخشد. فاقد چربی و پارابن بوده و برای انواع پوست‌ها ایده آل است.',
      features: {
        'حجم محصول': '۳۰ میلی‌لیتر',
        'ترکیب کلیدی': 'هیالورونیک اسید خالص ۲٪ + ویتامین B5',
        'فاقد ترکیبات مضر': 'بدون الکل، پارابن، سیلیکون و اسانس'
      },
      specs: {
        'مناسب برای': 'انواع پوست (به ویژه پوست‌های خشک و کم‌آب)',
        'کشور سازنده': 'ایران (فرمولاسیون سوئیس)',
        'تاییدیه بهداشتی': 'سیب سلامت و پروانه ساخت بهداشت'
      },
      imageUrl: 'https://images.unsplash.com/photo-1608248597481-496100c80836?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1608248597481-496100c80836?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&auto=format&fit=crop&q=60'
      ],
      variants: [
        { name: 'حجم ۳۰ میلی‌لیتر استاندارد', price: 680000, stock: 10 },
        { name: 'حجم ۵۰ میلی‌لیتر خانوادگی', price: 950000, stock: 5 }
      ]
    },
    digitalProduct: {
      title: 'برنامه روتین پوستی تخصصی درمان جوش و لک (PDF)',
      type: 'digital',
      price: 150000,
      discount: 50000,
      stock: 99999,
      description: 'یک راهنمای کامل (PDF) شامل برنامه روتین صبح و شب، تداخلات مواد و راه‌های اصولی درمان آکنه و لک.',
      fullDescription: 'دیگر نیازی به خرید کرم‌های گران‌قیمت بی‌فایده ندارید! در این برنامه آموزشی که توسط متخصصین پوست تنظیم شده است، یاد می‌گیرید چطور نوع پوست خود را بشناسید، مواد مختلف (مانند رتینول، ویتامین سی و اسیدها) را با هم ترکیب کنید و یک روتین متناسب با بودجه خود بسازید.',
      features: {
        'تعداد بخش‌ها': '۶ فصل جامع آموزشی',
        'فرمت': 'PDF مصور با لیست برندهای پیشنهادی',
        'حجم فایل': '۸.۴ مگابایت'
      },
      specs: {
        'زبان': 'فارسی روان',
        'هدف دوره': 'آموزش اصول مراقبت پوست و رفع جوش و لک',
        'دانلود': 'دسترسی همیشگی و دریافت مستقیم پس از خرید'
      },
      imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&auto=format&fit=crop&q=60'
      ],
      fileUrl: '/downloads/skboard-routine-guide.pdf',
      fileFormat: 'PDF',
      fileSize: '8.4 MB',
      previewUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&auto=format&fit=crop&q=60',
      techSpecs: 'خوانا در تمامی موبایل‌ها و سیستم‌عامل‌ها.',
      downloadFiles: [
        { name: 'دفترچه راهنمای روتین پوستی ضدلک و جوش', url: '/downloads/skboard-routine-guide.pdf', size: '8.4 MB', format: 'PDF' }
      ]
    },
    physicalReviews: [
      { rating: 5, comment: 'پوست من خیلی دهیدراته بود ولی با این سرم کاملا نرم و لطیف شده. اصلا احساس چسبندگی نداره و عالی جذب میشه.', customerName: 'مریم حسینی', customerEmail: 'maryam@example.com', customerPhone: '09122222222' },
      { rating: 5, comment: 'عالیه! بوی ملایمی داره و بعد از دو هفته استفاده حس می‌کنم پوستم شاداب‌تر شده. حتما دوباره می‌خرم.', customerName: 'سارا کریمی', customerEmail: 'sara@example.com', customerPhone: '09125555555' }
    ],
    digitalReviews: [
      { rating: 5, comment: 'کاش زودتر این کتاب رو می‌خوندم. کل اشتباهاتی که تو شستن صورتم انجام می‌دادم رو فهمیدم. خیلی مفید بود.', customerName: 'بهاره نوری', customerEmail: 'bahar@example.com', customerPhone: '09126666666' }
    ],
    blogCategory: { name: 'دانستنی‌های زیبایی و مراقبت', slug: 'beauty-tips' },
    blogPost: {
      title: '۵ اشتباه رایج در شستشوی صورت که پوست شما را پیر و تیره می‌کند!',
      slug: 'facial-wash-common-mistakes',
      summary: 'شستن صورت اولین قدم مراقبت از پوست است، اما اگر با اصول نادرست انجام شود، سد دفاعی پوست را تخریب کرده و باعث جوش و خشکی مفرط می‌شود.',
      content: `<h2>چرا روش شستشوی صورت اهمیت دارد؟</h2>
<p>بسیاری از افراد تصور می‌کنند شستن صورت کار ساده‌ای است که به آموزش نیاز ندارد. اما اشتباه در همین مرحله ابتدایی می‌تواند تمام هزینه‌های شما برای خرید کرم‌های گران‌قیمت را هدر دهد.</p>

<blockquote>
  <strong>راهنمای تست:</strong> این مقاله نمونه‌ای تخصصی برای وبلاگ آرایشی و زیبایی شماست. با ثبت اولین محصول واقعی توسط شما، تمام اطلاعات آزمایشی به صورت خودکار حذف شده و این مقالات در قالب پیش‌نویس آرشیو می‌شوند.
</blockquote>

<h2>اشتباهات بزرگ در شستشوی صورت</h2>
<ol>
  <li><strong>استفاده از آب داغ:</strong> آب داغ چربی‌های طبیعی و مفید پوست را از بین برده و پوست را به شدت خشک و کدر می‌کند. همواره از آب ولرم استفاده کنید.</li>
  <li><strong>استفاده از صابون‌های قالبی معمولی:</strong> صابون‌ها دارای pH بسیار قلیایی هستند که اسیدیته طبیعی پوست را بر هم زده و محیط را برای رشد باکتری‌های جوش‌زا مهیا می‌کنند. از ژل یا فوم شستشوی مخصوص پوست خود استفاده کنید.</li>
  <li><strong>خشک کردن صورت با حوله زبر و مالش شدید:</strong> کشیدن حوله روی پوست باعث ایجاد خطوط و شل شدن پوست می‌شود. حوله یا دستمال لطیف را به آرامی روی پوست بگذارید و بردارید (حرکت ضربه‌ای).</li>
</ol>
<p>شستشوی صورت نباید بیش از ۲ بار در روز (یک بار صبح و یک بار شب) انجام شود، مگر اینکه فعالیت بدنی شدیدی داشته باشید.</p>`,
      featuredImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=60',
      tags: ['مراقبت از پوست', 'شستشوی صورت', 'جوانسازی', 'پوست شاداب'],
      seoTitle: 'اشتباهات شستشوی صورت و راهنمای مراقبت از پوست',
      seoDescription: 'روش صحیح شستن صورت، دمای مناسب آب، انتخاب شوینده ایده آل پوست خشک و چرب و راه‌های جلوگیری از پیری پوست.',
      faqs: [
        { question: 'آیا برای پوست‌های خشک شستشو در صبح لازم است؟', answer: 'خیر، پوست‌های خیلی خشک می‌توانند صبح‌ها فقط صورت را با آب ولرم آبکشی کنند و شب‌ها شوینده بزنند.' },
        { question: 'تونر چیست و چه زمانی استفاده می‌شود؟', answer: 'تونر به تنظیم pH پوست کمک کرده و بلافاصله پس از شوینده و قبل از سرم‌ها استفاده می‌شود.' }
      ]
    },
    slides: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1608248597481-496100c80836?w=1200&auto=format&fit=crop&q=80',
        title: 'پوستی شاداب، درخشان و بی‌نقص',
        subtitle: 'فروش تخصصی برترین برندهای مراقبت پوست و مو با مشاوره رایگان زیبایی',
        linkText: 'مشاهده محصولات پوستی',
        linkUrl: '/shop'
      }
    ],
    stories: [
      {
        title: 'روتین آبرسانی',
        thumbnailUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&auto=format&fit=crop&q=60',
        mediaUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=60',
        mediaType: 'image',
        text: 'خشکی پوست را فراموش کنید! سرم آبرسان شارژ شد.',
        linkText: 'خرید با تخفیف',
        linkUrl: '/shop'
      }
    ]
  },
  food: {
    themeColor: '#f97316', // orange-500
    physicalCategory: { name: 'منوی غذاهای اصلی', slug: 'food-menu' },
    digitalCategory: { name: 'کتاب دستور پخت و سس', slug: 'recipes' },
    physicalProduct: {
      title: 'پیتزا مخصوص سرآشپز ایتالیایی (دو نفره)',
      type: 'physical',
      price: 340000,
      discount: 30000,
      stock: 50,
      description: 'پیتزا ایتالیایی با خمیر تازه دست‌ساز، سس مخصوص سرآشپز، پنیر موزارلای کش‌دار، فیله مرغ مرینت شده و پپرونی.',
      fullDescription: 'طعم واقعی پیتزای تنوری ایتالیایی با خمیری ترد و نازک که به صورت روزانه و دستی تهیه می‌شود. مواد مصرفی کاملاً تازه و با بالاترین کیفیت انتخاب شده‌اند تا تجربه‌ای فوق‌العاده از صرف غذا را برای شما رقم بزنند. ارسال در باکس‌های حرارتی مخصوص جهت داغ ماندن غذا تا مقصد.',
      features: {
        'نوع نان': 'نازک و برشته ایتالیایی',
        'ابعاد پیتزا': 'دو نفره (قطر ۳۲ سانتی‌متر)',
        'ترکیبات اصلی': 'فیله مرغ گریل شده، پپرونی درصد بالا، قارچ بلانچ شده، پنیر موزارلا درجه یک و زیتون اسلایس'
      },
      specs: {
        'زمان تحویل تقریبی': '۳۰ تا ۴۵ دقیقه پس از ثبت سفارش',
        'محدوده ارسال': 'سراسر شهر (هزینه بر اساس پیک)',
        'ادویه‌های ارسالی': 'آویشن فرانسوی، فلفل قرمز تند و سس‌های یک نفره کچاپ و خردل'
      },
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&auto=format&fit=crop&q=60'
      ],
      variants: [
        { name: 'پیتزا مخصوص با خمیر ساده', price: 340000, stock: 40 },
        { name: 'پیتزا مخصوص با نان سیر و کنجد', price: 365000, stock: 10 }
      ]
    },
    digitalProduct: {
      title: 'دفترچه اسرار تهیه ۱۵ سس جادویی و رستورانی (PDF)',
      type: 'digital',
      price: 120000,
      discount: 40000,
      stock: 99999,
      description: 'یک راهنمای فوق‌العاده (PDF) حاوی دستور تهیه دقیق و فوت و فن‌های سس‌های معروف رستورانی و فست‌فود.',
      fullDescription: 'چرا سس فست‌فودها همیشه خوشمزه‌تر از سس‌های خونگیه؟ در این کتابچه جادویی، فرمول مخفی تهیه معروف‌ترین سس‌های سالاد، پیتزا، سوخاری و برگر (مانند سس تارتار، سس سزار اصلی، سس خردل عسل و سس باربیکیو دودی) را با اندازه دقیق یاد می‌گیرید.',
      features: {
        'تعداد سس‌ها': '۱۵ دستور تهیه مکتوب ویدیو دار',
        'فرمت ارائه': 'فایل PDF قابل دانلود آنی',
        'حجم فایل': '۶.۲ مگابایت'
      },
      specs: {
        'زبان': 'فارسی ساده به همراه عکس محصول نهایی',
        'پیش‌نیاز': 'بدون نیاز به ابزار خاص (با وسایل ساده آشپزخانه)',
        'پشتیبانی': 'رفع اشکال در بخش تیکت‌های پشتیبانی'
      },
      imageUrl: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=800&auto=format&fit=crop&q=60'
      ],
      fileUrl: '/downloads/magical-sauces-secrets.pdf',
      fileFormat: 'PDF',
      fileSize: '6.2 MB',
      previewUrl: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=800&auto=format&fit=crop&q=60',
      techSpecs: 'خوانا در تمامی موبایل‌ها و سیستم‌عامل‌ها.',
      downloadFiles: [
        { name: 'ایبوک دستور پخت سس‌های جادویی رستورانی', url: '/downloads/magical-sauces-secrets.pdf', size: '6.2 MB', format: 'PDF' }
      ]
    },
    physicalReviews: [
      { rating: 5, comment: 'خمیرش فوق‌العاده ترد بود و موادش خیلی باکیفیت و تازه. گرم به دستم رسید و طعم سسش بی‌نظیر بود.', customerName: 'امیرحسین رضایی', customerEmail: 'amir@example.com', customerPhone: '09121111111' },
      { rating: 5, comment: 'یکی از بهترین پیتزاهایی بود که تو این منطقه خوردم. پنیرش خیلی عالی کش میومد و حجم موادش هم عالی بود.', customerName: 'مریم حسینی', customerEmail: 'maryam@example.com', customerPhone: '09122222222' }
    ],
    digitalReviews: [
      { rating: 5, comment: 'سس سزار رو طبق دستور درست کردم، دقیقاً مزه رستورانی میده. واقعا عالی بود.', customerName: 'رضا امینی', customerEmail: 'reza@example.com', customerPhone: '09127777777' }
    ],
    blogCategory: { name: 'فوت و فن‌های آشپزی', slug: 'cooking-secrets' },
    blogPost: {
      title: 'چگونه در خانه پیتزای ترد و پفکی با کیفیت رستورانی درست کنیم؟',
      slug: 'how-to-make-restaurant-quality-pizza',
      summary: 'بزرگترین چالش در پخت پیتزای خانگی، نان خیس یا سفت شدن خمیر است. در این مقاله رازهای خمیر پفکی و دمای مناسب فر را بررسی می‌کنیم.',
      content: `<h2>راز اول: خمیر تازه و استراحت کافی خمیر</h2>
<p>مهم‌ترین بخش یک پیتزا خمیر آن است. استفاده از بکینگ پودر به جای خمیرمایه یکی از رایج‌ترین اشتباهات است. برای داشتن یک خمیر عالی، آرد فانتزی گلوتن بالا تهیه کرده و حتما به خمیر اجازه دهید حداقل ۲ ساعت در محیط گرم استراحت کند تا حجم آن دو برابر شود.</p>

<blockquote>
  <strong>راهنمای تست:</strong> این مقاله نمونه‌ای تخصصی برای وبلاگ رستورانی و صنایع غذایی شماست. با ثبت اولین محصول واقعی توسط شما، تمام اطلاعات آزمایشی به صورت خودکار حذف شده و این مقالات در قالب پیش‌نویس آرشیو می‌شوند.
</blockquote>

<h2>راز دوم: داغ بودن فوق‌العاده فر</h2>
<p>فر‌های صنعتی رستوران‌ها دمایی حدود ۳۵۰ تا ۴۰۰ درجه سانتی‌گراد دارند. فر‌های خانگی معمولاً به این دما نمی‌رسند. راه حل چیست؟</p>
<ul>
  <li>فر را از ۱ ساعت قبل با بالاترین دمای ممکن (مثلا ۲۴۰ درجه) روشن کنید تا کاملاً داغ شود.</li>
  <li>از سنگ پیتزا (Pizza Stone) استفاده کنید؛ سنگ گرما را در خود ذخیره کرده و به سرعت به خمیر منتقل می‌کند تا ترد شود.</li>
  <li>پنیر پیتزا را در مراحل آخر پخت اضافه کنید تا نسوزد و کشسانی خود را حفظ کند.</li>
</ul>
<p>با رعایت همین نکات ساده، کیفیت پیتزای خانگی شما تفاوت محسوسی خواهد داشت.</p>`,
      featuredImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=60',
      tags: ['پیتزا خانگی', 'خمیر پیتزا', 'آشپزی آسان', 'فوت و فن پیتزا'],
      seoTitle: 'دستور پخت خمیر پیتزا و رازهای پیتزای رستورانی در خانه',
      seoDescription: 'طرز تهیه خمیر پیتزای جادویی، ترفندهای کش آمدن پنیر پیتزا و تنظیم دمای فر خانگی برای پخت بهتر پیتزا.',
      faqs: [
        { question: 'چرا خمیر پیتزای من سفت می‌شود؟', answer: 'به علت آرد بیش از حد یا پخت طولانی با دمای پایین فر که باعث تبخیر کامل رطوبت خمیر می‌شود.' },
        { question: 'کدام پنیر برای پیتزا مناسب‌تر است؟', answer: 'مخلوطی از پنیر موزارلا (برای کشسانی) و پنیر گودا یا چدار (برای طعم و عطر بی‌نظیر).' }
      ]
    },
    slides: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80',
        title: 'طعم اصیل غذاهای ایتالیایی و فرنگی',
        subtitle: 'تهیه شده از مواد اولیه ارگانیک و تازه، ارسال سریع و داغ به سراسر شهر',
        linkText: 'سفارش آنلاین غذا',
        linkUrl: '/shop'
      }
    ],
    stories: [
      {
        title: 'پیتزا تنوری',
        thumbnailUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&auto=format&fit=crop&q=60',
        mediaUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=60',
        mediaType: 'image',
        text: 'داغ و لذیذ! پیتزاهای تنوری مخصوص سرآشپز را همین حالا سفارش دهید.',
        linkText: 'سفارش فوری',
        linkUrl: '/shop'
      }
    ]
  },
  education: {
    themeColor: '#0f766e', // teal-700
    physicalCategory: { name: 'کتاب و لوازم تحریر پلنر', slug: 'books-and-planners' },
    digitalCategory: { name: 'دوره‌های آموزشی ویدئویی', slug: 'video-courses' },
    physicalProduct: {
      title: 'پک کتاب برنامه‌ریزی تحصیلی و کاری هدفمند',
      type: 'physical',
      price: 290000,
      discount: 40000,
      stock: 20,
      description: 'شامل یک جلد دفترچه برنامه‌ریزی روزانه (پلنر) سیمی فانتزی، یک عدد روان‌نویس ژله‌ای و برچسب‌های انگیزشی هدف‌گذاری.',
      fullDescription: 'این پک بی‌نظیر برای تمام کسانی که به دنبال افزایش بهره‌وری، یادداشت اهداف روزانه و مدیریت زمان هستند طراحی شده است. پلنر روزانه دارای بخش‌های ارزیابی روزانه، نوشتن اهداف ماهانه و چک‌لیست کارهای روزانه است که شما را منظم نگه می‌دارد. به همراه یک عدد روان‌نویس مشکی فشاری با کیفیت عالی.',
      features: {
        'تعداد صفحات پلنر': '۸۰ برگ (۱۶۰ صفحه دورو رنگی)',
        'قطع دفتر': 'رقعی (مناسب برای حمل روزانه)',
        'اقلام همراه': 'روان‌نویس ژله‌ای مشکی فشاری + ۲ برگ استیکر فانتزی'
      },
      specs: {
        'نوع کاغذ': 'کاغذ تحریر خارجی درجه یک ۷۰ گرمی بدون پخش جوهر',
        'طراحی جلد': 'جلد سخت با روکش سلفون مات ضد خش',
        'برند سازنده': 'پک اختصاصی آکادمی موفقیت'
      },
      imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&auto=format&fit=crop&q=60'
      ],
      variants: [
        { name: 'طرح جلد کهکشان به همراه روان‌نویس', price: 290000, stock: 15 },
        { name: 'طرح جلد گل‌گلی به همراه روان‌نویس', price: 290000, stock: 5 }
      ]
    },
    digitalProduct: {
      title: 'دوره ویدئویی آموزش فشرده مدیریت زمان و افزایش تمرکز',
      type: 'digital',
      price: 690000,
      discount: 190000,
      stock: 99999,
      description: 'دوره ویدیویی کاربردی (۴ ساعت) شامل آموزش تکنیک‌های پومودورو، اولویت‌بندی کارها و غلبه بر اهمال‌کاری.',
      fullDescription: 'چرا روزها به سرعت می‌گذرند و ما به کارهای مهم خود نمی‌رسیم؟ در این دوره جامع، با تکنیک‌های پیشرفته مدیریت زمان و ابزارهای تمرکز آشنا می‌شوید. یاد می‌گیرید چطور تنبلی را کنار بگذارید، برنامه‌ریزی روزانه منطقی بنویسید و تمرکز ذهنی خود را در حین کار افزایش دهید.',
      features: {
        'مدت زمان دوره': '۴ ساعت آموزش ویدیویی فشرده و کاربردی',
        'تعداد جلسات': '۱۲ جلسه کوتاه (کمتر از ۲۰ دقیقه برای یادگیری راحت)',
        'فایل‌های ضمیمه': 'دفترچه تمرین روزانه PDF به همراه چک‌لیست برنامه‌ریزی'
      },
      specs: {
        'فرمت ارائه': 'ویدئوهای MP4 با کیفیت عالی ۱۰۸۰p',
        'زبان': 'فارسی به زبان ساده و کاربردی',
        'نیاز به پیش‌نیاز': 'خیر (فقط تعهد به تمرینات دوره)'
      },
      imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=60'
      ],
      fileUrl: '/downloads/time-management-course.zip',
      fileFormat: 'ZIP',
      fileSize: '1.2 GB',
      previewUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=60',
      techSpecs: 'فایل فشرده حاوی ویدئوها و جزوه تمرین. سازگار با تمام دستگاه‌ها.',
      downloadFiles: [
        { name: 'بخش اول ویدیوهای دوره مدیریت زمان', url: '/downloads/time-management-part1.zip', size: '600 MB', format: 'ZIP' },
        { name: 'بخش دوم ویدیوها به همراه جزوه PDF', url: '/downloads/time-management-part2.zip', size: '620 MB', format: 'ZIP' }
      ]
    },
    physicalReviews: [
      { rating: 5, comment: 'خیلی پک عالی و با انگیزه کننده‌ای هست. جنس برگه‌های دفترچه خیلی ضخیمه و خودکار روش پخش نمیشه. دوستش دارم.', customerName: 'مریم حسینی', customerEmail: 'maryam@example.com', customerPhone: '09122222222' },
      { rating: 5, comment: 'برای هدیه دادن به دوست صمیمی‌ام خریدم، بسته‌بندی زیبایی داشت و خیلی کاربردیه. برچسب‌هاش خیلی بانمکن.', customerName: 'زهرا رضایی', customerEmail: 'zahra@example.com', customerPhone: '09128888888' }
    ],
    digitalReviews: [
      { rating: 5, comment: 'این دوره راندمان کاری من رو دگرگون کرد. مخصوصا تکنیک پومودورو رو خیلی عالی تشریح کردن. ممنونم.', customerName: 'امیرحسین رضایی', customerEmail: 'amir@example.com', customerPhone: '09121111111' }
    ],
    blogCategory: { name: 'رشد فردی و موفقیت', slug: 'personal-growth' },
    blogPost: {
      title: 'چگونه بر تنبلی و اهمال‌کاری غلبه کنیم؟ راهکارهای علمی و اثبات شده',
      slug: 'how-to-overcome-procrastination',
      summary: 'اهمال‌کاری تنبلی نیست، بلکه ناتوانی در مدیریت احساسات منفی نسبت به کارهاست. در این مقاله به بررسی علل علمی و تکنیک‌های رفع تنبلی می‌پردازیم.',
      content: `<h2>اهمال‌کاری چیست و چرا اتفاق می‌افتد؟</h2>
<p>بسیاری از ما کارهای مهم خود را به تعویق می‌اندازیم و به جای آن به سراغ کارهای ساده و کم‌اهمیت (مثل چرخیدن در شبکه‌های اجتماعی) می‌رویم. تحقیقات علمی نشان داده که اهمال‌کاری ربطی به تنبلی یا مدیریت ضعیف زمان ندارد، بلکه مغز ما تلاش می‌کند ما را از احساسات منفی (مانند استرس، اضطراب یا کلافگی) کار دور کند.</p>

<blockquote>
  <strong>راهنمای تست:</strong> این مقاله نمونه‌ای تخصصی برای وبلاگ آموزشی و مشاوره شماست. پس از ثبت اولین محصول واقعی توسط شما، تمام این اطلاعات تستی حذف شده و مقالات در قالب پیش‌نویس صرفاً در پنل شما برای الگوبرداری باقی خواهند ماند.
</blockquote>

<h2>روش‌های غلبه بر اهمال‌کاری</h2>
<ol>
  <li><strong>قانون ۵ ثانیه را اجرا کنید:</strong> هنگامی که کاری را به یاد می‌آورید، از ۵ تا ۱ بشمارید و بدون هیچ فکر دیگری کار را شروع کنید. شمارش معکوس به مغز اجازه بهانه‌تراشی نمی‌دهد.</li>
  <li><strong>کارها را به بخش‌های بسیار کوچک تقسیم کنید:</strong> به جای نوشتن "مطالعه کل کتاب"، بنویسید "مطالعه ۲ صفحه از فصل اول". شروع کارهای کوچک برای مغز بسیار ساده‌تر است.</li>
  <li><strong>تکنیک پومودورو را به کار بگیرید:</strong> ۲۵ دقیقه با تمرکز کامل کار کنید و سپس ۵ دقیقه استراحت کنید. بعد از ۴ پومودورو، یک استراحت طولانی‌تر (۲۰ دقیقه‌ای) داشته باشید.</li>
</ol>
<p>مهم‌ترین نکته این است که با خود مهربان باشید؛ خودسرزنش‌گری شدید باعث افزایش اضطراب و در نتیجه اهمال‌کاری بیشتر در دفعات بعدی می‌شود.</p>`,
      featuredImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=60',
      tags: ['غلبه بر تنبلی', 'مدیریت زمان', 'رشد فردی', 'موفقیت تحصیلی'],
      seoTitle: 'راهکارهای علمی غلبه بر اهمال‌کاری و تنبلی در کارها',
      seoDescription: 'تکنیک پومودورو، قانون ۵ ثانیه مل رابینز و چگونگی برنامه‌ریزی روزانه برای افزایش بهره‌وری و تمرکز بالا.',
      faqs: [
        { question: 'آیا تنبلی با اهمال‌کاری تفاوت دارد؟', answer: 'بله، تنبلی عدم تمایل کامل به کار است اما در اهمال‌کاری فرد کار را می‌خواهد انجام دهد اما آن را مدام به تعویق می‌اندازد.' },
        { question: 'چگونه تمرکز خود را در حین کار حفظ کنیم؟', answer: 'گوشی موبایل را دور از دسترس قرار دهید، اعلان‌ها را خاموش کرده و محیط کار را کاملاً خلوت کنید.' }
      ]
    },
    slides: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&auto=format&fit=crop&q=80',
        title: 'مهارت‌های خود را ارتقا دهید و پیشرفت کنید',
        subtitle: 'ارائه باکیفیت‌ترین دوره‌های آموزشی ویدئویی، کتاب‌های چاپی و پلنرهای تحصیلی',
        linkText: 'مشاهده دوره‌ها و محصولات',
        linkUrl: '/shop'
      }
    ],
    stories: [
      {
        title: 'مدیریت زمان',
        thumbnailUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=200&auto=format&fit=crop&q=60',
        mediaUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=60',
        mediaType: 'image',
        text: 'وقت گرانبهاست! دوره فشرده مدیریت زمان را با تخفیف ویژه تهیه کنید.',
        linkText: 'ورود به دوره',
        linkUrl: '/shop'
      }
    ]
  },
  general: {
    themeColor: '#2563eb', // blue-500
    physicalCategory: { name: 'محصولات فیزیکی برگزیده', slug: 'physical-products' },
    digitalCategory: { name: 'محصولات دانلودی و کاربردی', slug: 'digital-products' },
    physicalProduct: {
      title: 'فلاسک هوشمند دیجیتالی نمایشگر دار دماسنجی',
      type: 'physical',
      price: 420000,
      discount: 40000,
      stock: 30,
      description: 'فلاسک و دماسنج استیل دوجداره با صفحه نمایش لمسی LED روی درب جهت نمایش دقیق دمای نوشیدنی.',
      fullDescription: 'این فلاسک هوشمند فوق‌العاده کاربردی به شما اجازه می‌دهد در هر لحظه، تنها با یک لمس کوتاه روی درب فلاسک، دمای دقیق چای، قهوه یا آب داخل آن را مشاهده کنید. مجهز به سنسور دمای فوق حساس هوشمند و دیواره استیل دوجداره ۳۰۴ که دمای نوشیدنی‌های گرم را تا ۱۲ ساعت و نوشیدنی‌های سرد را تا ۲۴ ساعت به خوبی حفظ می‌کند. دارای صافی تفاله‌گیر استیل.',
      features: {
        'جنس بدنه': 'استیل ضد زنگ ۳۰۴ دوجداره باکیفیت بالا',
        'ظرفیت مخزن': '۵۰۰ میلی‌لیتر (نیم لیتر)',
        'صفحه نمایش': 'LED لمسی هوشمند بدون نیاز به شارژ (باتری داخلی ماندگار)'
      },
      specs: {
        'حفظ دمای گرم': 'تا ۱۲ ساعت (بالای ۶۰ درجه سانتی‌گراد)',
        'حفظ دمای سرد': 'تا ۲۴ ساعت (زیر ۱۰ درجه سانتی‌گراد)',
        'ابعاد فلاسک': '۲۲.۵ سانتی‌متر ارتفاع، ۶.۵ سانتی‌متر قطر'
      },
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1592080063619-063e747c4c22?w=800&auto=format&fit=crop&q=60'
      ],
      variants: [
        { name: 'رنگ مشکی مات کلاسیک', price: 420000, stock: 20, colorCode: '#000000' },
        { name: 'رنگ سرمه‌ای تیره', price: 420000, stock: 10, colorCode: '#1e293b' }
      ]
    },
    digitalProduct: {
      title: 'آموزش جامع راه‌اندازی و مدیریت کسب‌وکار اینترنتی (PDF)',
      type: 'digital',
      price: 190000,
      discount: 40000,
      stock: 99999,
      description: 'یک فایل راهنمای فوق‌العاده کاربردی (PDF) برای راه‌اندازی، سئو، تبلیغات و مدیریت فروشگاه آنلاین شما.',
      fullDescription: 'تبریک می‌گوییم! فروشگاه شما ساخته شده است. این کتابچه راهنما به شما یاد می‌دهد چطور پس از دریافت پنل مدیریت، محصولات خود را به سئو مجهز کنید، درگاه‌های پرداخت را وصل کنید، در شبکه‌های اجتماعی تبلیغات بروید و اولین سفارش خود را با موفقیت دریافت و ارسال کنید.',
      features: {
        'تعداد فصل‌ها': '۵ فصل کاربردی از ایده تا فروش اول',
        'فرمت ارائه': 'فایل الکترونیکی PDF به همراه چک‌لیست مدیریت فروشگاه',
        'حجم دانلود': '۹.۵ مگابایت'
      },
      specs: {
        'زبان': 'فارسی روان به همراه مثال‌های بومی',
        'مخاطب': 'مدیران فروشگاه‌های نوپا و علاقه‌مندان به کسب‌وکار آنلاین',
        'پشتیبانی': 'پشتیبانی ۶ ماهه و پاسخگویی به سوالات شما'
      },
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60',
      galleryUrls: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60'
      ],
      fileUrl: '/downloads/ecommerce-setup-guide.pdf',
      fileFormat: 'PDF',
      fileSize: '9.5 MB',
      previewUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60',
      techSpecs: 'خوانا در تمامی موبایل‌ها و سیستم‌عامل‌ها.',
      downloadFiles: [
        { name: 'ایبوک راهنمای جامع مدیریت فروشگاه اینترنتی', url: '/downloads/ecommerce-setup-guide.pdf', size: '9.5 MB', format: 'PDF' }
      ]
    },
    physicalReviews: [
      { rating: 5, comment: 'صفحه نمایش دمای دربش خیلی حساس و دقیقه. دما رو خیلی خوب نگه می‌داره و ظاهرش هم شیک و مینیماله.', customerName: 'امیرحسین رضایی', customerEmail: 'amir@example.com', customerPhone: '09121111111' },
      { rating: 4, comment: 'فلاسک خوبیه، فقط کاش داخل جعبه‌اش کاور حمل هم می‌ذاشتن. ولی خودش بدون نشت و عالیه.', customerName: 'مریم حسینی', customerEmail: 'maryam@example.com', customerPhone: '09122222222' }
    ],
    digitalReviews: [
      { rating: 5, comment: 'خیلی راهنمای خوب و جامعی بود. از سیر تا پیاز تنظیمات فروشگاه رو خیلی قشنگ و روان توضیح دادن.', customerName: 'علی رضایی', customerEmail: 'ali@example.com', customerPhone: '09124444444' }
    ],
    blogCategory: { name: 'تجارت الکترونیک و فروش', slug: 'ecommerce' },
    blogPost: {
      title: 'راهنمای جامع مدیریت و پیکربندی فروشگاه اینترنتی نوپای شما',
      slug: 'shop-management-guide',
      summary: 'در این راهنمای جامع، با تمامی بخش‌های پنل مدیریت فروشگاه‌ساز خود آشنا می‌شوید و یاد می‌گیرید چگونه محصولات خود را ثبت کنید، سفارش‌ها را پردازش کنید و فروش خود را آغاز کنید.',
      content: `<h2>به دنیای شیرین تجارت الکترونیک خوش آمدید!</h2>
<p>تبریک می‌گوییم! فروشگاه اینترنتی شما با موفقیت راه‌اندازی شد. این سیستم یک پلتفرم فروشگاهی پیشرفته، سریع و کاملاً بهینه‌سازی شده برای موبایل است که به شما امکان می‌دهد محصولات خود را به ساده‌ترین شکل ممکن به فروش برسانید. در این راهنمای جامع، قدم به قدم با نحوه مدیریت و پیکربندی بخش‌های مختلف فروشگاه خود آشنا خواهید شد.</p>

<blockquote>
  <strong>راهنمای تست:</strong> این مقاله یک نمونه کامل از مطالب وبلاگ و همچنین راهنمای کاربری شماست. پس از اینکه اولین محصول واقعی خود را در پنل مدیریت ثبت و منتشر کنید، این مقاله به طور خودکار از دید عموم خارج شده و تنها برای شما به صورت پیش‌نویس قابل مشاهده خواهد بود.
</blockquote>

<h2>بخش اول: نحوه ثبت و مدیریت محصولات</h2>
<p>محصولات قلب تپنده فروشگاه شما هستند. در این پلتفرم می‌توانید دو نوع محصول تعریف کنید:</p>
<ol>
  <li><strong>محصولات فیزیکی (مانند پوشاک، لوازم دیجیتال و...):</strong> با وارد کردن قیمت، موجودی انبار، آپلود عکس‌ها و ویژگی‌ها (مانند رنگ و سایز) ثبت می‌شوند.</li>
  <li><strong>محصولات دانلودی و دیجیتال (مانند فایل‌های آموزشی، کتب الکترونیکی و...):</strong> با آپلود فایل یا قرار دادن لینک دانلود نهایی ثبت شده و بلافاصله پس از پرداخت وجه به صورت خودکار برای خریدار ایمیل و فعال می‌شوند.</li>
</ol>

<h2>بخش دوم: اتصال درگاه پرداخت و روش‌های ارسال</h2>
<p>به بخش <strong>تنظیمات &gt; درگاه‌های پرداخت</strong> بروید. در این بخش می‌توانید درگاه مستقیم زرین‌پال یا زیبال را فعال کنید یا با وارد کردن شماره کارت خود، سیستم <strong>کارت به کارت</strong> را فعال کنید تا مشتریان رسید واریز را آپلود کرده و شما تایید کنید. همچنین اتصال به سیستم هوشمند تیپاکس محاسبه هزینه حمل را خودکار می‌کند.</p>`,
      featuredImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60',
      tags: ['مدیریت فروشگاه', 'راهنما', 'تنظیمات اولیه', 'تجارت آنلاین'],
      seoTitle: 'راهنمای جامع کاربری و پیکربندی فروشگاه اینترنتی',
      seoDescription: 'آموزش کامل کار با بخش‌های مختلف فروشگاه‌ساز، ثبت محصول، اتصال درگاه پرداخت، مدیریت سفارش‌ها و سئو فروشگاه.',
      faqs: [
        { question: 'چگونه درگاه پرداخت فعال کنم؟', answer: 'به منوی تنظیمات > درگاه‌های پرداخت رفته و مرچنت کد خود را وارد کنید.' },
        { question: 'آیا امکان اتصال دامنه اختصاصی وجود دارد؟', answer: 'بله، در بخش تنظیمات عمومی می‌توانید دامنه اختصاصی خود را متصل کنید.' }
      ]
    },
    slides: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
        title: 'فروشگاه اینترنتی خود را متحول کنید',
        subtitle: 'کامل‌ترین ابزارها برای فروش محصولات فیزیکی و دانلودی با سرعت خیره‌کننده',
        linkText: 'ورود به بخش فروشگاه',
        linkUrl: '/shop'
      }
    ],
    stories: [
      {
        title: 'به دنیای ما بپیوندید',
        thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&auto=format&fit=crop&q=60',
        mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60',
        mediaType: 'image',
        text: 'فروشگاه اینترنتی شما آماده جذب مشتری است! اولین محصول را اضافه کنید.',
        linkText: 'همین حالا خرید کنید',
        linkUrl: '/shop'
      }
    ]
  }
};

export function generateLocalDemoData(customBusinessField: string, shopName: string): DemoData {
  let field = customBusinessField.trim();
  if (field === 'general' || !field) {
    field = shopName;
  }
  
  // Keyword analysis
  const isCoffee = /قهوه|کافه|شکلات|کیک|نان|شیرینی/i.test(field);
  const isWood = /چوب|مبل|دکور|میز|صندلی|کابینت|نجاری/i.test(field);
  const isPet = /پت|حیوان|سگ|گربه|پرنده|ماهی/i.test(field);
  const isToy = /اسباب|بازی|کودک|بچه|عروسک|نوزاد/i.test(field);
  const isBook = /کتاب|دفتر|تحریر|آموزش|مدرسه|دانشگاه|درس|علم|هنر/i.test(field);
  const isPlant = /گل|گیاه|گلدان|باغ|کشاورزی|درخت/i.test(field);
  const isProtein = /پروتئین|قصابی|گوشت|مرغ|ماهی|سوسیس|کالباس|ژامبون|همبرگر|استیک|فیله|دلی|پروتئینی/i.test(field);
  const isCosmetics = /آرایش|بهداشت|زیبایی|پوست|مو|عطر|ادکلن|رژ|ریمل|لاک|کرم|شامپو/i.test(field);
  const isClothing = /پوشاک|لباس|مد|مزون|شلوار|پیراهن|تیشرت|کفش|کیف|شال|روسری|کت/i.test(field);

  let themeColor = '#6366f1'; // Default Indigo
  let physicalCategoryName = `محصولات ${field}`;
  let physicalCategorySlug = 'physical-products';
  let digitalCategoryName = `آموزش و راهنمای ${field}`;
  let digitalCategorySlug = 'digital-guides';

  let pTitle = `محصول ویژه ${field} مدل پرو`;
  let pPrice = 850000;
  let pDiscount = 100000;
  let pDescription = `یک محصول فوق‌العاده باکیفیت و کاربردی در زمینه ${field} با طراحی مدرن و دوام بی‌نظیر.`;
  let pFullDescription = `این محصول با استفاده از بهترین مواد اولیه و استانداردهای روز دنیا تولید شده است تا بهترین تجربه کاربری را در زمینه ${field} برای شما به ارمغان آورد. طراحی منحصربه‌فرد، دوام بالا و کارایی فوق‌العاده از ویژگی‌های بارز این محصول می‌باشد. مناسب برای استفاده شخصی و هدیه دادن به عزیزان.`;
  let pFeatures: Record<string, string> = {
    'کیفیت ساخت': 'درجه یک و صادراتی',
    'کاربرد': `تخصصی در حوزه ${field}`,
    'طراحی': 'مدرن و ارگونومیک'
  };
  let pSpecs: Record<string, string> = {
    'کشور سازنده': 'ایران',
    'ضمانت': '۱۲ ماه گارانتی اصالت و سلامت فیزیکی'
  };
  let pImageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60';
  let pGalleryUrls = [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60'
  ];
  let pVariants = [
    { name: 'مدل استاندارد', price: 850000, stock: 15 },
    { name: 'مدل پیشرفته (پرو)', price: 1100000, stock: 10 }
  ];

  let dTitle = `کتابچه راهنمای جامع و کاربردی ${field} (PDF)`;
  let dPrice = 95000;
  let dDiscount = 15000;
  let dDescription = `یک فایل آموزشی ارزشمند (PDF) حاوی نکات کلیدی، ترفندها و راهنمای گام‌به‌گام برای موفقیت در زمینه ${field}.`;
  let dFullDescription = `این کتابچه الکترونیکی ارزشمند توسط متخصصین مجرب ما در حوزه ${field} تالیف شده است. در این راهنما، تمامی اصول اساسی، تکنیک‌های پیشرفته و ترفندهای کاربردی که برای موفقیت و ارتقای دانش خود در زمینه ${field} نیاز دارید، به زبان ساده و روان توضیح داده شده است. بلافاصله پس از پرداخت، لینک دانلود فایل برای شما فعال خواهد شد.`;
  let dFeatures: Record<string, string> = {
    'فرمت فایل': 'PDF باکیفیت بالا',
    'تعداد صفحات': '۴۵ صفحه محتوای کاربردی',
    'حجم فایل': '۴.۸ مگابایت'
  };
  let dSpecs: Record<string, string> = {
    'مخاطب': `علاقه‌مندان و فعالان حوزه ${field}`,
    'پشتیبانی': 'پاسخگویی به سوالات و آپدیت‌های رایگان'
  };
  let dImageUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60';

  let blogCategoryName = `آموزش و مقالات ${field}`;
  let blogCategorySlug = 'blog-articles';
  let blogPostTitle = `راهنمای جامع و ترفندهای طلایی در حوزه ${field}`;
  let blogPostSummary = `در این مقاله به بررسی مهم‌ترین نکات، چالش‌ها و راهکارهای کاربردی برای علاقه‌مندان و فعالان زمینه ${field} می‌پردازیم.`;
  let blogPostContent = `<h2>مقدمه‌ای بر دنیای ${field}</h2>
<p>حوزه ${field} یکی از جذاب‌ترین و پرطرفدارترین زمینه‌های فعالیت است که پتانسیل بالایی برای رشد و خلاقیت دارد. در این مقاله قصد داریم به بررسی عمیق‌تر این حوزه بپردازیم و نکات ارزشمندی را که می‌تواند به شما در انتخاب بهترین محصولات و کسب بهترین نتایج کمک کند، مطرح کنیم.</p>

<h2>نکات کلیدی که باید درباره ${field} بدانید</h2>
<p>برای شروع فعالیت یا استفاده بهینه از خدمات و محصولات در حوزه ${field}، توجه به چند نکته اساسی ضروری است:</p>
<ul>
  <li><strong>کیفیت و اصالت:</strong> همواره سعی کنید محصولاتی را تهیه کنید که از کیفیت ساخت بالایی برخوردار بوده و دارای ضمانت معتبر باشند.</li>
  <li><strong>دانش کافی:</strong> مطالعه راهنماها و آموزش‌های مرتبط با ${field} به شما کمک می‌کند تا تصمیم‌گیری‌های هوشمندانه‌تری داشته باشید.</li>
  <li><strong>به‌روز بودن:</strong> این حوزه همواره در حال تغییر و نوآوری است، بنابراین پیگیری ترندها و محصولات جدید بسیار مفید خواهد بود.</li>
</ul>

<h2>چگونه بهترین تجربه را کسب کنیم؟</h2>
<p>ما در فروشگاه خود تلاش کرده‌ایم تا با حذف واسطه‌ها و ارائه مستقیم برترین محصولات حوزه ${field}، تجربه‌ای بی‌نظیر، سریع و مطمئن را برای شما فراهم آوریم. شما می‌توانید با بررسی دقیق مشخصات و ویژگی‌های هر محصول در <a href="/shop" class="text-violet-600 hover:underline font-black">فروشگاه ${shopName}</a>، بهترین گزینه را متناسب با نیاز خود انتخاب کنید.</p>
<p>منبع: تیم محتوای تخصصی <a href="/" class="text-violet-600 hover:underline font-black">${shopName}</a></p>`;
  let blogPostFeaturedImage = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60';

  let slideTitle = `دنیای شگفت‌انگیز ${field}`;
  let slideSubtitle = `بهترین محصولات و خدمات تخصصی در حوزه ${field} با کیفیت تضمین شده و ارسال سریع`;
  let slideImageUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80';

  let storyTitle = `داستان ${field}`;
  let storyText = `با محصولات جدید ما در حوزه ${field} آشنا شوید و تجربه خود را ارتقا دهید.`;
  let storyThumbnailUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&auto=format&fit=crop&q=60';
  let storyMediaUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60';

  // Apply keyword-based customizations
  if (isCoffee) {
    themeColor = '#78350f'; // amber-900
    physicalCategoryName = 'قهوه و تجهیزات کافه';
    physicalCategorySlug = 'coffee-and-cafe';
    digitalCategoryName = 'دستورالعمل‌ها و رسپی‌ها';
    digitalCategorySlug = 'coffee-recipes';
    pTitle = 'دانه قهوه اسپرسو عربیکا ۱۰۰٪ جامائیکا (بسته ۲۵۰ گرمی)';
    pPrice = 480000;
    pDiscount = 50000;
    pDescription = 'دانه قهوه تک‌خاستگاه عربیکا با رست مدیوم، عطر فوق‌العاده و اسیدیته ملایم، مناسب برای انواع روش‌های دم‌آوری.';
    pFullDescription = 'این قهوه بی‌نظیر از مزارع مرتفع جامائیکا به صورت دست‌چین برداشت شده و با متدهای پیشرفته رست شده است. دارای نت‌های طعمی شکلاتی، آجیلی و مرکباتی ملایم است که طعمی ماندگار و عطر شگفت‌انگیزی را در فنجان شما ایجاد می‌کند. بسته‌بندی سوپاپ‌دار جهت حفظ تازگی عطر قهوه.';
    pFeatures = {
      'نوع دانه': '۱۰۰٪ عربیکا تک‌خاستگاه',
      'میزان رست': 'Medium (متوسط)',
      'اسیدیته': 'ملایم و متعادل'
    };
    pSpecs = {
      'وزن بسته': '۲۵۰ گرم',
      'نوع بسته‌بندی': 'پاکت سه لایه سوپاپ‌دار سوپر لوکس'
    };
    pImageUrl = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=60';
    pGalleryUrls = [
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&auto=format&fit=crop&q=60'
    ];
    pVariants = [
      { name: 'دانه کامل (آسیاب نشده)', price: 480000, stock: 30 },
      { name: 'آسیاب شده مخصوص اسپرسو ساز', price: 480000, stock: 20 },
      { name: 'آسیاب شده مخصوص فرنچ پرس', price: 480000, stock: 15 }
    ];

    dTitle = 'کتابچه الکترونیکی هنر دم‌آوری قهوه در خانه (PDF)';
    dPrice = 98000;
    dDiscount = 18000;
    dDescription = 'راهنمای تصویری و گام‌به‌گام برای دم‌آوری حرفه‌ای قهوه با وی‌شصت، کمکس، فرنچ‌پرس و موکاپات در خانه.';
    dFullDescription = 'دوست دارید در خانه مثل یک باریستای حرفه‌ای قهوه دم کنید؟ این کتابچه راهنما به شما یاد می‌دهد چطور با ابزارهای ساده خانگی، بهترین عصاره‌گیری را داشته باشید. شامل فرمول‌های دقیق نسبت آب به قهوه، دمای مناسب آب، درجه آسیاب و ترفندهای لته‌آرت خانگی.';
    dFeatures = {
      'فرمت': 'PDF تعاملی',
      'تعداد صفحات': '۶۰ صفحه مصور رنگی',
      'حجم فایل': '۱۲ مگابایت'
    };
    dSpecs = {
      'نویسنده': 'تیم باریستاهای مجرب آکادمی قهوه',
      'زبان': 'فارسی به همراه ویدیوهای کمکی'
    };
    dImageUrl = 'https://images.unsplash.com/photo-1517256064527-09c53b2d0ec6?w=800&auto=format&fit=crop&q=60';

    blogCategoryName = 'فرهنگ قهوه و آموزش';
    blogCategorySlug = 'coffee-culture';
    blogPostTitle = 'رازهای دم‌آوری یک فنجان قهوه بی‌نظیر به روش باریستاهای حرفه‌ای';
    blogPostSummary = 'آیا می‌دانستید دمای آب، درجه آسیاب و نسبت قهوه به آب می‌توانند طعم فنجان شما را کاملاً دگرگون کنند؟ در این مقاله رازهای طلایی دم‌آوری را فاش می‌کنیم.';
    blogPostFeaturedImage = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=60';

    slideTitle = 'عطر و طعم واقعی قهوه اصیل';
    slideSubtitle = 'خرید مستقیم دانه قهوه‌های تک‌خاستگاه و تجهیزات دم‌آوری تخصصی با تخفیف ویژه افتتاحیه';
    slideImageUrl = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&auto=format&fit=crop&q=80';

    storyTitle = 'رست تازه دانه قهوه';
    storyText = 'تمام دانه‌های قهوه ما به صورت هفتگی رست می‌شوند تا عطر و طعم بی‌نظیر آن‌ها کاملاً حفظ شود.';
    storyThumbnailUrl = 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200&auto=format&fit=crop&q=60';
    storyMediaUrl = 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&auto=format&fit=crop&q=60';
  } else if (isWood) {
    themeColor = '#854d0e'; // yellow-800
    physicalCategoryName = 'مبلمان و سازه‌های چوبی';
    physicalCategorySlug = 'wooden-furniture';
    digitalCategoryName = 'نقشه‌ها و طرح‌های ساخت';
    digitalCategorySlug = 'woodworking-plans';
    pTitle = 'صندلی ناهارخوری چوبی مدرن طرح اسکاندیناوی';
    pPrice = 1850000;
    pDiscount = 250000;
    pDescription = 'صندلی تمام چوب راش گرجستان با طراحی ارگونومیک، نشیمن بسیار راحت و اتصالات مستحکم دوبل.';
    pFullDescription = 'این صندلی زیبا با الهام از سبک مینیمال اسکاندیناوی و از چوب راش درجه یک گرجستان ساخته شده است. بدنه صندلی با روغن‌های گیاهی ارگانیک مونوکوت پوشش داده شده که علاوه بر آب‌گریز کردن چوب، بافت و رگه‌های طبیعی آن را به زیبایی نمایان می‌سازد. مناسب برای دکوراسیون‌های مدرن و کلاسیک.';
    pFeatures = {
      'جنس بدنه': 'چوب راش درجه یک گرجستان (خشک‌کن رفته)',
      'نوع پوشش': 'روغن گیاهی مونوکوت بلژیک (ضد آب و ضد حساسیت)',
      'تحمل وزن': 'تا ۱۵۰ کیلوگرم'
    };
    pSpecs = {
      'ابعاد صندلی': 'ارتفاع ۸۵، عرض ۴۵، عمق ۴۸ سانتی‌متر',
      'مدت زمان ساخت': 'ارسال فوری (موجود در انبار)'
    };
    pImageUrl = 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=60';
    pGalleryUrls = [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&auto=format&fit=crop&q=60'
    ];
    pVariants = [
      { name: 'رنگ چوب خودرنگ طبیعی', price: 1850000, stock: 8 },
      { name: 'رنگ قهوه‌ای فندقی تیره', price: 1850000, stock: 5 },
      { name: 'رنگ مشکی مات مدرن', price: 1950000, stock: 4 }
    ];

    dTitle = 'نقشه ساخت و دفترچه راهنمای گام‌به‌گام میز تحریر چوبی (PDF)';
    dPrice = 120000;
    dDiscount = 20000;
    dDescription = 'نقشه فنی دقیق، ابعاد برش قطعات و راهنمای ساخت تصویری میز تحریر مدرن برای نجاران و علاقه‌مندان به نجاری.';
    dFullDescription = 'این فایل شامل نقشه‌های اتوکد، لیست دقیق برش چوب، اتصالات مورد نیاز و راهنمای تصویری سه‌بعدی برای ساخت یک میز تحریر چوبی مینیمال و کاربردی است. مناسب برای کارگاه‌های نجاری و افرادی که می‌خواهند خودشان در خانه سازه‌های چوبی بسازند.';
    dFeatures = {
      'فرمت فایل': 'PDF به همراه نقشه‌های CAD (DWG)',
      'سطح مهارت': 'متوسط (مناسب برای نجاران خانگی و حرفه‌ای)',
      'ابعاد سازه نهایی': '۱۲۰ در ۶۰ با ارتفاع ۷۵ سانتی‌متر'
    };
    dSpecs = {
      'طراح': 'مهندس طراح صنعتی سازه‌های چوبی',
      'پشتیبانی': 'امکان پرسش و پاسخ رفع اشکال با طراح'
    };
    dImageUrl = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=60';

    blogCategoryName = 'دکوراسیون و نجاری';
    blogCategorySlug = 'woodworking-and-decor';
    blogPostTitle = 'چگونه از سازه‌ها و مبلمان چوبی در خانه نگهداری کنیم تا عمر طولانی داشته باشند؟';
    blogPostSummary = 'چوب طبیعی یک ماده زنده است! در این مقاله روش‌های اصولی نگهداری، تمیزکاری و واکس زدن مبلمان چوبی را آموزش می‌دهیم.';
    blogPostFeaturedImage = 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&auto=format&fit=crop&q=60';

    slideTitle = 'شکوه و اصالت چوب طبیعی در خانه شما';
    slideSubtitle = 'مجموعه‌ای بی‌نظیر از مبلمان، اکسسوری‌ها و دکوراسیون چوبی دست‌ساز با چوب‌های راش، گردو و بلوط';
    slideImageUrl = 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200&auto=format&fit=crop&q=80';

    storyTitle = 'هنر دست نجاران ما';
    storyText = 'تمام محصولات ما با عشق، دقت فراوان و با استفاده از هنرهای اصیل نجاری سنتی و صنعتی ساخته می‌شوند.';
    storyThumbnailUrl = 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=200&auto=format&fit=crop&q=60';
    storyMediaUrl = 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&auto=format&fit=crop&q=60';
  } else if (isPet) {
    themeColor = '#d97706'; // amber-600
    physicalCategoryName = 'ملزومات حیوانات خانگی';
    physicalCategorySlug = 'pet-supplies';
    digitalCategoryName = 'کتابچه‌های تربیت و نگهداری';
    digitalCategorySlug = 'pet-guides';
    pTitle = 'غذای خشک سگ رویال کنین مدل Maxi Adult (وزن ۴ کیلوگرم)';
    pPrice = 1450000;
    pDiscount = 150000;
    pDescription = 'غذای خشک باکیفیت و تخصصی برای سگ‌های بالغ نژاد بزرگ، حاوی پروتئین‌های زودهضم و تقویت‌کننده مفاصل.';
    pFullDescription = 'غذای خشک رویال کنین مدل مکسی ادالت مخصوص سگ‌های بالغ نژاد بزرگ (وزن بین ۲۶ تا ۴۴ کیلوگرم) فرموله شده است. این غذا حاوی اسیدهای چرب امگا ۳ (EPA و DHA) برای حفظ سلامت پوست و درخشندگی موهاست. همچنین فرمولاسیون خاص آن به حفظ سلامت استخوان‌ها و مفاصل تحت فشار در نژادهای بزرگ کمک شایانی می‌کند.';
    pFeatures = {
      'برند': 'Royal Canin (فرانسه)',
      'مناسب سن': '۱۵ ماهگی تا ۵ سالگی (بالغ)',
      'نژاد هدف': 'نژادهای بزرگ (Maxi)'
    };
    pSpecs = {
      'وزن': '۴ کیلوگرم',
      'تاریخ انقضا': 'بیش از ۱۲ ماه گارانتی انقضا'
    };
    pImageUrl = 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=60';
    pGalleryUrls = [
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=60'
    ];
    pVariants = [
      { name: 'بسته ۴ کیلوگرمی استاندارد', price: 1450000, stock: 12 },
      { name: 'بسته ۱۵ کیلوگرمی اقتصادی', price: 4200000, stock: 5 }
    ];

    dTitle = 'کتابچه راهنمای جامع تربیت و آموزش سگ در خانه (PDF)';
    dPrice = 85000;
    dDiscount = 15000;
    dDescription = 'آموزش گام‌به‌گام و تصویری تربیت سگ، آموزش جای دستشویی، همقدم شدن و فرامین اصلی در خانه بدون نیاز به مربی.';
    dFullDescription = 'این کتابچه الکترونیکی شامل روش‌های علمی و تایید شده برای تربیت سگ‌های آپارتمانی است. با مطالعه این راهنما یاد می‌گیرید چگونه رفتارهای ناهنجار مانند پارس کردن بی‌مورد، گاز گرفتن و لجبازی را برطرف کنید و فرامین مهمی چون بشین، بیا، بمون و دستشویی در محل مشخص را به سرعت آموزش دهید.';
    dFeatures = {
      'فرمت': 'PDF قابل مطالعه در موبایل',
      'تعداد صفحات': '۵۵ صفحه کاربردی',
      'روش آموزش': 'مثبت‌گرایانه (تشویقی تشویقی)'
    };
    dSpecs = {
      'نویسنده': 'مربی بین‌المللی و رفتارشناس سگ‌ها',
      'پشتیبانی': 'عضویت در گروه پرسش و پاسخ تلگرامی'
    };
    dImageUrl = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=60';

    blogCategoryName = 'سلامت و رفتارشناسی پت';
    blogCategorySlug = 'pet-health';
    blogPostTitle = 'راهنمای جامع تغذیه حیوانات خانگی: چه غذاهایی برای سگ و گربه ما سمی هستند؟';
    blogPostSummary = 'برخی از غذاهای روزمره ما می‌توانند برای حیوانات خانگی بسیار خطرناک و حتی کشنده باشند. در این مقاله لیست کامل غذاهای ممنوعه را بررسی می‌کنیم.';
    blogPostFeaturedImage = 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&auto=format&fit=crop&q=60';

    slideTitle = 'عشق و سلامتی برای دوست وفادار شما';
    slideSubtitle = 'بهترین برندهای غذای خشک، کنسرو، اسباب‌بازی و ملزومات بهداشتی سگ و گربه با تضمین اصالت کالا';
    slideImageUrl = 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=1200&auto=format&fit=crop&q=80';

    storyTitle = 'پت شاپ آنلاین ما';
    storyText = 'ما بهترین و باکیفیت‌ترین محصولات را برای سلامت و شادی حیوانات خانگی شما فراهم کرده‌ایم.';
    storyThumbnailUrl = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&auto=format&fit=crop&q=60';
    storyMediaUrl = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=60';
  } else if (isToy) {
    themeColor = '#ea580c'; // orange-600
    physicalCategoryName = 'اسباب‌بازی و سرگرمی کودک';
    physicalCategorySlug = 'toys-and-games';
    digitalCategoryName = 'بازی‌های فکری و کاربرگ‌ها';
    digitalCategorySlug = 'educational-worksheets';
    pTitle = 'لگو کلاسیک مدل جعبه خلاقیت بزرگ (۷۹۰ قطعه)';
    pPrice = 2100000;
    pDiscount = 300000;
    pDescription = 'مجموعه لگو کلاسیک با ۷۹۰ قطعه رنگارنگ در ۳۳ رنگ مختلف، مناسب برای تقویت خلاقیت و هوش فضایی کودکان بالای ۴ سال.';
    pFullDescription = 'این بسته بی‌نظیر لگو کلاسیک شامل انواع آجرهای ساختنی، چرخ‌ها، پنجره‌ها، درها و چشم‌هاست که به کودک اجازه می‌دهد هر آنچه در ذهن دارد را بسازد. همراه با یک جعبه پلاستیکی محکم برای نگهداری قطعات و یک دفترچه ایده برای شروع ساخت‌وسازهای هیجان‌انگیز.';
    pFeatures = {
      'تعداد قطعات': '۷۹۰ قطعه رنگارنگ باکیفیت',
      'رده سنی': 'مناسب برای کودکان بالای ۴ سال تا ۹۹ سال!',
      'جنس قطعات': 'پلاستیک ABS فشرده و نشکن (کاملاً بهداشتی)'
    };
    pSpecs = {
      'ابعاد جعبه': '۳۷ در ۲۶ در ۱۸ سانتی‌متر',
      'کشور سازنده': 'برند اصلی LEGO (دانمارک)'
    };
    pImageUrl = 'https://images.unsplash.com/photo-1515488042361-404e9250afef?w=800&auto=format&fit=crop&q=60';
    pGalleryUrls = [
      'https://images.unsplash.com/photo-1515488042361-404e9250afef?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800&auto=format&fit=crop&q=60'
    ];
    pVariants = [
      { name: 'بسته ۷۹۰ قطعه اورجینال', price: 2100000, stock: 6 },
      { name: 'بسته ۴۸۴ قطعه متوسط', price: 1450000, stock: 10 }
    ];

    dTitle = 'مجموعه کاربرگ‌های هوش و خلاقیت کودکان پیش‌دبستانی (PDF)';
    dPrice = 45000;
    dDiscount = 10000;
    dDescription = 'مجموعه ۱۰۰ صفحه کاربرگ رنگی و تعاملی برای تقویت هوش، ریاضی، یادگیری حروف و هماهنگی چشم و دست کودکان ۳ تا ۶ سال.';
    dFullDescription = 'این فایل دیجیتال شامل ۱۰۰ صفحه تمرین، پازل، ماز، رنگ‌آمیزی و بازی‌های فکری هدفمند است که توسط روانشناسان کودک طراحی شده است. شما می‌توانید فایل را دانلود کرده و در خانه پرینت بگیرید تا کودک دلبندتان ساعت‌ها سرگرم یادگیری خلاقانه شود.';
    dFeatures = {
      'فرمت': 'PDF باکیفیت بالا جهت چاپ آسان',
      'تعداد صفحات': '۱۰۰ صفحه تمام رنگی',
      'رده سنی': '۳ تا ۶ سال (پیش‌دبستانی)'
    };
    dSpecs = {
      'طراح': 'تیم روانشناسی و مربیان پیش‌دبستانی',
      'قابلیت چاپ': 'نامحدود (مناسب برای مهدکودک‌ها و خانه‌ها)'
    };
    dImageUrl = 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=60';

    blogCategoryName = 'روانشناسی و بازی کودک';
    blogCategorySlug = 'child-development';
    blogPostTitle = 'نقش بازی‌های فکری و ساختنی در افزایش ضریب هوشی و خلاقیت کودکان';
    blogPostSummary = 'چگونه اسباب‌بازی‌های ساده می‌توانند مهارت‌های حل مسئله، تمرکز و خلاقیت را در کودکان تقویت کنند؟ در این مقاله علمی به بررسی این موضوع می‌پردازیم.';
    blogPostFeaturedImage = 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=800&auto=format&fit=crop&q=60';

    slideTitle = 'شادی، سرگرمی و خلاقیت برای فرزند دلبند شما';
    slideSubtitle = 'مجموعه‌ای از برترین اسباب‌بازی‌های فکری, آموزشی، لگو و عروسک‌های پولیشی باکیفیت و بهداشتی';
    slideImageUrl = 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=1200&auto=format&fit=crop&q=80';

    storyTitle = 'دنیای بازی کودکان';
    storyText = 'اسباب‌بازی‌های ما علاوه بر سرگرمی، به رشد ذهنی و حرکتی کودکان کمک شایانی می‌کنند.';
    storyThumbnailUrl = 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200&auto=format&fit=crop&q=60';
    storyMediaUrl = 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800&auto=format&fit=crop&q=60';
  } else if (isBook) {
    themeColor = '#0d9488'; // teal-600
    physicalCategoryName = 'کتاب و لوازم تحریر';
    physicalCategorySlug = 'books-and-stationery';
    digitalCategoryName = 'خلاصه‌ها و کتاب‌های صوتی';
    digitalCategorySlug = 'audiobooks-and-summaries';
    pTitle = 'کتاب اثر مرکب نوشته دارن هاردی (جلد سخت)';
    pPrice = 120000;
    pDiscount = 20000;
    pDescription = 'کتاب اثر مرکب، راهنمایی فوق‌العاده برای ایجاد تحول در زندگی، درآمد و موفقیت شخصی از طریق تصمیمات کوچک روزانه.';
    pFullDescription = 'اثر مرکب نوشته دارن هاردی، یکی از پرفروش‌ترین کتاب‌های موفقیت شخصی در سراسر جهان است. این کتاب به شما نشان می‌دهد که چگونه تصمیمات کوچک، روزمره و به ظاهر بی‌اهمیت، در طول زمان با هم ترکیب شده و نتایج شگفت‌انگیز و بزرگی را در کار، زندگی و روابط شما ایجاد می‌کنند. ترجمه روان و عالی به همراه جلد سخت نفیس.';
    pFeatures = {
      'نویسنده': 'دارن هاردی (Darren Hardy)',
      'نوع جلد': 'سخت (گالینگور)',
      'تعداد صفحات': '۲۴۰ صفحه کاغذ بالکی سبک'
    };
    pSpecs = {
      'موضوع': 'موفقیت شخصی و کسب‌وکار',
      'ناشر': 'نشر نوین (چاپ جدید)'
    };
    pImageUrl = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60';
    pGalleryUrls = [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=60'
    ];
    pVariants = [
      { name: 'جلد سخت نفیس', price: 120000, stock: 15 },
      { name: 'جلد شومیز (نرم)', price: 95000, stock: 20 }
    ];

    dTitle = 'پادکست صوتی و خلاصه جامع کتاب اثر مرکب (فایل صوتی MP3)';
    dPrice = 49000;
    dDiscount = 10000;
    dDescription = 'خلاصه صوتی ۶۰ دقیقه‌ای کتاب اثر مرکب به همراه فایل متنی PDF نکات کلیدی و چک‌لیست‌های عملیاتی.';
    dFullDescription = 'وقت کافی برای خواندن کل کتاب را ندارید؟ در این پادکست ۶۰ دقیقه‌ای باکیفیت، تمامی مفاهیم، فرمول‌ها و داستان‌های کلیدی کتاب اثر مرکب را به صورت فشرده و کاربردی بشنوید. به همراه فایل PDF خلاصه نکات جهت مرور سریع و چک‌لیست‌های روزانه برای پیاده‌سازی اثر مرکب در زندگی شما.';
    dFeatures = {
      'فرمت فایل صوتی': 'MP3 باکیفیت عالی ۱۲۸kbps',
      'مدت زمان': '۶۰ دقیقه آموزش صوتی روان',
      'فایل ضمیمه': 'PDF خلاصه نکات کلیدی (۱۵ صفحه)'
    };
    dSpecs = {
      'گوینده': 'گوینده حرفه‌ای رادیو با صدای گرم و دلنشین',
      'حجم دانلود': '۵۸ مگابایت (فایل زیپ)'
    };
    dImageUrl = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=60';

    blogCategoryName = 'توسعه فردی و کتابخوانی';
    blogCategorySlug = 'personal-growth';
    blogPostTitle = 'چگونه عادت‌های کوچک روزانه می‌توانند آینده مالی و شخصی ما را دگرگون کنند؟';
    blogPostSummary = 'قدرت عادت‌های اتمی و اثر مرکب را دست‌کم نگیرید! در این مقاله علمی یاد می‌گیریم چطور با روزی ۱۵ دقیقه مطالعه یا ورزش، زندگی جدیدی بسازیم.';
    blogPostFeaturedImage = 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=800&auto=format&fit=crop&q=60';

    slideTitle = 'کتاب‌ها، پنجره‌ای به دنیای آگاهی و موفقیت';
    slideSubtitle = 'خرید جدیدترین کتاب‌های روانشناسی، توسعه فردی، رمان و لوازم تحریر فانتزی با تخفیف ویژه و ارسال پستی';
    slideImageUrl = 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=1200&auto=format&fit=crop&q=80';

    storyTitle = 'لذت کتابخوانی';
    storyText = 'با مطالعه روزانه چند صفحه کتاب، مسیر رشد شخصی و شغلی خود را هموارتر کنید.';
    storyThumbnailUrl = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200&auto=format&fit=crop&q=60';
    storyMediaUrl = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=60';
  } else if (isPlant) {
    themeColor = '#16a34a'; // green-600
    physicalCategoryName = 'گل و گیاهان آپارتمانی';
    physicalCategorySlug = 'houseplants';
    digitalCategoryName = 'راهنماهای نگهداری و تکثیر';
    digitalCategorySlug = 'plant-care-guides';
    pTitle = 'گیاه آپارتمانی سانسوریا ابلق با گلدان سرامیکی لوکس';
    pPrice = 350000;
    pDiscount = 50000;
    pDescription = 'گیاه سانسوریا ابلق قد بلند و شاداب، تصفیه‌کننده قوی هوای خانه و بسیار مقاوم به کم‌آبی و نور کم.';
    pFullDescription = 'سانسوریا ابلق یکی از زیباترین، مقاوم‌ترین و محبوب‌ترین گیاهان آپارتمانی است که نقش بسزایی در تصفیه هوای محیط و حذف سموم دارد. این گیاه نیاز به مراقبت بسیار کمی دارد و برای افراد مبتدی یا محیط‌های اداری با نور متوسط و کم فوق‌العاده مناسب است. همراه با گلدان سرامیکی درجه یک زهکشی شده.';
    pFeatures = {
      'نوع گیاه': 'سانسوریا ابلق شمشیری (Sansevieria)',
      'ارتفاع گیاه': 'حدود ۵۰ تا ۶۰ سانتی‌متر با گلدان',
      'نیاز نوری': 'مقاوم به نور کم، ایده‌آل برای نور متوسط غیرمستقیم'
    };
    pSpecs = {
      'نیاز به آبیاری': 'هر ۱۰ تا ۱۴ روز یکبار (پس از خشک شدن کامل خاک)',
      'جنس گلدان': 'سرامیکی درجه یک با زیرگلدانی مناسب'
    };
    pImageUrl = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop&q=60';
    pGalleryUrls = [
      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&auto=format&fit=crop&q=60'
    ];
    pVariants = [
      { name: 'سانسوریا با گلدان سرامیکی سفید', price: 350000, stock: 10 },
      { name: 'سانسوریا با گلدان سرامیکی طوسی مات', price: 350000, stock: 8 }
    ];

    dTitle = 'کتابچه راهنمای جامع نگهداری، درمان و تکثیر سانسوریا (PDF)';
    dPrice = 55000;
    dDiscount = 15000;
    dDescription = 'راهنمای گام‌به‌گام برای جلوگیری از پوسیدگی ریشه، زرد شدن برگ‌ها، فرمول خاک مناسب و تکثیر سانسوریا در خانه.';
    dFullDescription = 'چرا برگ‌های سانسوریا شل می‌شوند؟ چطور می‌توان آن را از طریق برگ تکثیر کرد؟ این کتابچه راهنمای جامع به تمام سوالات شما درباره نگهداری و پرورش سانسوریا پاسخ می‌دهد. شامل تصاویر واضح از مراحل قلمه زدن و فرمول‌های طلایی خاک برای رشد سریع‌تر گیاه.';
    dFeatures = {
      'فرمت': 'PDF مصور رنگی',
      'تعداد صفحات': '۳۰ صفحه تخصصی',
      'حجم فایل': '۵.۵ مگابایت'
    };
    dSpecs = {
      'نویسنده': 'کارشناس ارشد گیاه‌پزشکی و مهندسی کشاورزی',
      'پشتیبانی': 'امکان ارسال عکس گیاه بیمار و مشاوره با نویسنده'
    };
    dImageUrl = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&auto=format&fit=crop&q=60';

    blogCategoryName = 'آموزش و نگهداری گیاهان';
    blogCategorySlug = 'plant-care';
    blogPostTitle = 'چرا گیاهان آپارتمانی ما خشک می‌شوند؟ ۵ اشتباه رایج در نگهداری گل‌ها در خانه';
    blogPostSummary = 'آبیاری بیش از حد، نور نامناسب و خاک نامرغوب از دلایل اصلی از بین رفتن گیاهان هستند. در این مقاله روش‌های پیشگیری از زرد شدن برگ‌ها را یاد می‌گیریم.';
    blogPostFeaturedImage = 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=800&auto=format&fit=crop&q=60';

    slideTitle = 'طراوت و شادابی طبیعت در دکوراسیون خانه شما';
    slideSubtitle = 'خرید زیباترین گیاهان آپارتمانی مقاوم، گلدان‌های لوکس سفالی و سرامیکی و خاک‌های ارگانیک با ارسال ایمن درب منزل';
    slideImageUrl = 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=1200&auto=format&fit=crop&q=80';

    storyTitle = 'حس خوب زندگی با گیاهان';
    storyText = 'حضور گیاهان در خانه علاوه بر زیبایی، استرس را کاهش داده و کیفیت هوای تنفسی شما را بهبود می‌بخشد.';
    storyThumbnailUrl = 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=200&auto=format&fit=crop&q=60';
    storyMediaUrl = 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&auto=format&fit=crop&q=60';
  } else if (isProtein) {
    themeColor = '#b91c1c'; // red-700
    physicalCategoryName = 'محصولات پروتئینی تازه';
    physicalCategorySlug = 'fresh-protein';
    digitalCategoryName = 'راهنما و دستورهای پخت';
    digitalCategorySlug = 'cooking-guides';
    pTitle = 'فیله گوساله نر جوان تازه (بسته ۱ کیلوگرمی)';
    pPrice = 780000;
    pDiscount = 40000;
    pDescription = 'فیله گوساله نر جوان کاملاً پاک‌شده، بدون چربی اضافی و رگ، برش خورده و آماده طبخ انواع استیک و کباب.';
    pFullDescription = 'فیله گوساله لطیف‌ترین، لذیذترین و کم‌چرب‌ترین بخش گوشت گوساله است که برای پخت انواع استیک‌های آبدار، کباب برگ مجلسی و غذاهای لوکس فرنگی استفاده می‌شود. این محصول از گوساله‌های جوان و سالم تحت نظارت کامل دامپزشکی تهیه شده و به صورت روزانه، کاملاً پاک‌شده و بدون چربی اضافی، رگ و پوست در بسته‌بندی‌های بهداشتی تحت اتمسفر اصلاح‌شده (MAP) عرضه می‌گردد تا تازگی و کیفیت آن تا زمان مصرف کاملاً حفظ شود.';
    pFeatures = {
      'نوع گوشت': 'گوشت گوساله نر جوان تازه',
      'وضعیت پاک‌سازی': '۱۰۰٪ پاک‌شده، بدون چربی و رگ اضافی',
      'نوع بسته‌بندی': 'ظروف بهداشتی سیل‌شده تحت اتمسفر اصلاح‌شده (MAP)'
    };
    pSpecs = {
      'شرایط نگهداری': 'در دمای ۰ تا ۴ درجه سانتی‌گراد یخچال (حداکثر ۷۲ ساعت) یا فریزر',
      'وزن بسته‌بندی': '۱۰۰۰ گرم (۱ کیلوگرم) با تلورانس ۵٪',
      'تاییدیه بهداشتی': 'دارای مهر و تاییدیه رسمی سازمان دامپزشکی کشور'
    };
    pImageUrl = 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800&auto=format&fit=crop&q=60';
    pGalleryUrls = [
      'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=60'
    ];
    pVariants = [
      { name: 'بسته‌بندی ۱ کیلوگرمی استاندارد', price: 780000, stock: 15 },
      { name: 'بسته‌بندی ۲ کیلوگرمی اقتصادی', price: 1520000, stock: 10 }
    ];

    dTitle = 'دفترچه راهنمای جامع و ترفندهای طلایی طبخ و نگهداری گوشت و مرغ (PDF)';
    dPrice = 85000;
    dDiscount = 20000;
    dDescription = 'یک راهنمای فوق‌العاده کاربردی (PDF) شامل ترفندهای بیژن‌زدایی، مرینت کردن حرفه‌ای انواع گوشت و مرغ، و اصول نگهداری در فریزر.';
    dFullDescription = 'چگونه بوی زهم مرغ و گوشت را کاملاً از بین برم؟ چطور یک استیک آبدار و نرم مثل رستوران‌ها بپزیم؟ در این کتابچه الکترونیکی ارزشمند، تمامی اسرار و ترفندهای طلایی سرآشپزها برای مرینت کردن (طعم‌دار کردن) انواع گوشت قرمز، مرغ و ماهی گردآوری شده است. همچنین اصول علمی نگهداری مواد پروتئینی در یخچال و فریزر برای حفظ حداکثری ارزش غذایی و طعم آن‌ها آموزش داده شده است.';
    dFeatures = {
      'فرمت فایل': 'PDF باکیفیت بالا',
      'تعداد صفحات': '۴۰ صفحه محتوای کاربردی و تصویری',
      'حجم فایل': '۵.۲ مگابایت'
    };
    dSpecs = {
      'مخاطب': 'علاقه‌مندان به آشپزی حرفه‌ای و خانه‌داری هوشمند',
      'پشتیبانی': 'رفع اشکال و پاسخ به سوالات آشپزی از طریق تیکت'
    };
    dImageUrl = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=60';

    blogCategoryName = 'دانستنی‌های آشپزی و تغذیه';
    blogCategorySlug = 'cooking-and-nutrition';
    blogPostTitle = '۵ ترفند طلایی سرآشپزها برای نرم کردن و طعم‌دار کردن (مرینت) گوشت قرمز';
    blogPostSummary = 'چگونه گوشت گوساله یا گوسفند را طعم‌دار کنیم تا در حین پخت کاملاً نرم، آبدار و لذیذ شود؟ در این مقاله رازهای مرینت کردن حرفه‌ای را می‌آموزید.';
    blogPostFeaturedImage = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=60';
    blogPostContent = `<h2>چرا مرینت کردن گوشت اهمیت دارد؟</h2>
<p>مرینت کردن یا طعم‌دار کردن گوشت قرمز، نه تنها عطر و طعم فوق‌العاده‌ای به آن می‌بخشد، بلکه با شکستن بافت‌های فیبری گوشت، باعث می‌شود در حین پخت کاملاً نرم، آبدار و زودهضم شود. بسیاری از افراد با روش‌های نادرست باعث سفت شدن گوشت می‌شوند.</p>

<blockquote>
  <strong>راهنمای تست:</strong> این مقاله نمونه‌ای از محتوای وبلاگ اختصاصی فروشگاه پروتئینی شماست. با ثبت اولین محصول واقعی توسط شما، تمام داده‌های تستی به طور خودکار پاک شده و این مقالات به حالت پیش‌نویس انتقال خواهند یافت تا از دید مشتری پنهان شوند.
</blockquote>

<h2>۵ راز طلایی برای داشتن گوشت نرم و لذیذ</h2>
<ol>
  <li><strong>استفاده از اسیدهای ملایم:</strong> اسیدهایی مانند آبلیمو، سرکه، کیوی یا ماست بافت‌های پروتئینی را نرم می‌کنند. توجه داشته باشید که استفاده بیش از حد از اسید قوی مثل کیوی می‌تواند گوشت را له و متلاشی کند (حداکثر ۳۰ دقیقه قبل از پخت اضافه شود).</li>
  <li><strong>روغن مایع، محافظ رطوبت:</strong> همیشه در مرینت خود از روغن زیتون یا روغن مایع استفاده کنید. روغن مانند یک لایه محافظ دور گوشت قرار می‌گیرد و مانع از تبخیر آب و خشک شدن آن در حین کباب کردن یا سرخ کردن می‌شود.</li>
  <li><strong>نمک را در زمان مناسب اضافه کنید:</strong> اضافه کردن نمک از ابتدا به مرینت گوشت قرمز، آب آن را می‌کشد و گوشت را سفت می‌کند. نمک را ترجیحاً در اواخر زمان مرینت یا در حین پخت اضافه کنید.</li>
  <li><strong>استفاده از پیاز رنده‌شده به جای خلال پیاز:</strong> آب پیاز قوی‌ترین نرم‌کننده طبیعی گوشت است. پیاز را رنده کرده، آب آن را بگیرید و گوشت را در آب پیاز بخوابانید. تفاله‌های پیاز روی گوشت می‌سوزند و ظاهر کباب را خراب می‌کنند.</li>
  <li><strong>زمان استراحت کافی:</strong> برای نفوذ کامل طعم‌ها به عمق گوشت، اجازه دهید حداقل ۴ تا ۱۲ ساعت در یخچال استراحت کند.</li>
</ol>
<p>با رعایت این اصول ساده، استیک‌ها و کباب‌های خانگی شما کیفیتی در حد بهترین رستوران‌ها خواهند داشت. شما می‌توانید تازه‌ترین و باکیفیت‌ترین گوشت و محصولات پروتئینی را مستقیماً از <a href="/shop" class="text-violet-600 hover:underline font-black">فروشگاه ${shopName}</a> تهیه کنید.</p>
<p>منبع: تحریریه تخصصی <a href="/" class="text-violet-600 hover:underline font-black">${shopName}</a></p>`;

    slideTitle = 'تازگی و کیفیت بی‌نظیر محصولات پروتئینی';
    slideSubtitle = 'عرضه روزانه گوشت گرم گوساله و گوسفند، مرغ تازه و انواع فرآورده‌های دست‌ساز با تاییدیه بهداشتی';
    slideImageUrl = 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=1200&auto=format&fit=crop&q=80';

    storyTitle = 'گوشت گرم روزانه';
    storyText = 'تهیه شده از بهترین دام‌های جوان تحت نظارت دامپزشکی، کاملاً پاک‌شده و آماده طبخ. تحویل سریع درب منزل.';
    storyThumbnailUrl = 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=200&auto=format&fit=crop&q=60';
    storyMediaUrl = 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800&auto=format&fit=crop&q=60';
  } else if (isCosmetics) {
    themeColor = '#be185d'; // pink-700
    physicalCategoryName = 'عطر، ادکلن و لوازم آرایشی';
    physicalCategorySlug = 'perfumes-and-cosmetics';
    digitalCategoryName = 'راهنماها و دوره‌های زیبایی';
    digitalCategorySlug = 'beauty-guides';
    
    pTitle = `عطر مردانه سلطنتی ${shopName} مدل Royal Oud`;
    pPrice = 1450000;
    pDiscount = 150000;
    pDescription = 'عطر مردانه گرم و تلخ با رایحه چوب عود، چرم و ادویه‌های شرقی، ماندگاری فوق‌العاده بالا و پخش بوی بی‌نظیر.';
    pFullDescription = `این عطر سلطنتی و لوکس از برند ${shopName}، با ترکیبی هنرمندانه از رایحه‌های گرم و عمیق، امضای شخصیت شما خواهد بود. نت‌های آغازین شامل ترنج و فلفل صورتی، نت‌های میانی عود و چرم، و نت پایه شامل چوب صندل و عنبر است. مناسب برای فصول سرد سال و مجالس رسمی.`;
    pFeatures = {
      'نوع رایحه': 'گرم، تلخ و چوبی',
      'حجم': '۱۰۰ میلی‌لیتر',
      'غلظت': 'ادو پرفیوم (Eau de Parfum)'
    };
    pSpecs = {
      'مانندگاری': 'بیش از ۲۴ ساعت',
      'پخش بو': 'بسیار عالی با خط بوی قوی',
      'ضمانت': 'تضمین ۱۰۰٪ اصالت رایحه'
    };
    pImageUrl = 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop&q=60';
    pGalleryUrls = [
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop&q=60'
    ];
    pVariants = [
      { name: 'حجم ۱۰۰ میلی‌لیتر (ادو پرفیوم)', price: 1450000, stock: 12 },
      { name: 'حجم ۵۰ میلی‌لیتر (ادو پرفیوم)', price: 890000, stock: 15 }
    ];

    dTitle = `کتابچه راهنمای جامع شناخت رایحه‌ها و انتخاب عطر مناسب (PDF)`;
    dPrice = 75000;
    dDiscount = 15000;
    dDescription = 'یک راهنمای کاملاً علمی و کاربردی برای شناخت نت‌های بویایی، تشخیص عطرهای اورجینال و انتخاب عطر امضا.';
    dFullDescription = `این کتابچه الکترونیکی ارزشمند توسط کارشناسان عطر ${shopName} تالیف شده است. در این کتابچه با چرخه رایحه‌ها، تفاوت غلظت‌های مختلف عطر، نحوه صحیح اسپری کردن برای ماندگاری بیشتر و روش‌های تشخیص عطر تقلبی آشنا می‌شوید.`;
    dFeatures = {
      'فرمت': 'PDF باکیفیت بالا',
      'تعداد صفحات': '۳۵ صفحه محتوای تخصصی',
      'حجم فایل': '۳.۵ مگابایت'
    };
    dSpecs = {
      'مخاطب': 'علاقه‌مندان به دنیای عطر و ادکلن',
      'پشتیبانی': 'پاسخ به سوالات بویایی توسط کارشناسان ما'
    };
    dImageUrl = 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=60';

    blogCategoryName = 'دانستنی‌های عطر و زیبایی';
    blogCategorySlug = 'perfume-knowledge';
    blogPostTitle = 'چگونه عطر مناسب خود را انتخاب کنیم؟ راهنمای نت‌های بویایی و ماندگاری عطر';
    blogPostSummary = 'انتخاب عطر مانند انتخاب لباس، نشان‌دهنده شخصیت شماست. در این مقاله اصول بویایی و ترفندهای ماندگاری عطر را بررسی می‌کنیم.';
    blogPostFeaturedImage = 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop&q=60';
    blogPostContent = `<h2>مقدمه: جادوی عطر و رایحه</h2>
<p>عطرها قدرت شگفت‌انگیزی در زنده کردن خاطرات و تاثیرگذاری بر اطرافیان دارند. یک عطر مناسب می‌تواند اعتماد به نفس شما را افزایش داده و تصویری ماندگار از شما در ذهن دیگران بسازد. در تحریریه ${shopName}، ما معتقدیم که هر فرد باید عطر امضای خود را داشته باشد.</p>

<h2>نت‌های بویایی چیستند؟</h2>
<p>هر عطر از سه لایه بویایی مختلف تشکیل شده است که به مرور زمان خود را نشان می‌دهند:</p>
<ul>
  <li><strong>نت آغازین (Top Note):</strong> رایحه‌ای که بلافاصله پس از اسپری کردن عطر احساس می‌کنید و معمولاً سبک و فرار است (مانند مرکبات).</li>
  <li><strong>نت میانی (Heart Note):</strong> قلب عطر که پس از تبخیر نت آغازین به مشام می‌رسد و بدنه اصلی عطر را تشکیل می‌دهد (مانند گل‌ها و ادویه‌ها).</li>
  <li><strong>نت پایانی (Base Note):</strong> رایحه عمیق و ماندگاری که ساعت‌ها روی پوست باقی می‌ماند (مانند چوب، عود، مشک و عنبر).</li>
</ul>

<h2>ترفندهای طلایی برای افزایش ماندگاری عطر</h2>
<p>برای اینکه عطر شما ماندگاری و پخش بوی بیشتری داشته باشد، این نکات را رعایت کنید:</p>
<ol>
  <li>عطر را روی نقاط نبض‌دار بدن (مچ دست، گردن، پشت گوش و داخل آرنج) اسپری کنید.</li>
  <li>قبل از اسپری کردن عطر، پوست خود را با یک لوسیون بدون بو مرطوب کنید؛ پوست مرطوب عطر را بهتر نگه می‌دارد.</li>
  <li>هرگز پس از اسپری کردن عطر روی مچ دست، آن‌ها را به هم نمالید؛ این کار ساختار مولکولی عطر را می‌شکند و ماندگاری آن را کاهش می‌دهد.</li>
</ol>
<p>شما می‌توانید مجموعه‌ای از اصیل‌ترین و خوش‌بوترین عطرهای دنیا را با ضمانت اصالت کالا در <a href="/shop" class="text-violet-600 hover:underline font-black">گالری عطر ${shopName}</a> مشاهده و تهیه فرمایید.</p>
<p>منبع: تیم محتوای تخصصی <a href="/" class="text-violet-600 hover:underline font-black">${shopName}</a></p>`;

    slideTitle = `رایحه اصیل و ماندگار، امضای شخصیت شما ✨`;
    slideSubtitle = `جدیدترین و لوکس‌ترین عطرهای اورجینال مردانه و زنانه با ضمانت ۱۰۰٪ اصالت و ارسال سریع از فروشگاه ${shopName}`;
    slideImageUrl = 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&auto=format&fit=crop&q=80';

    storyTitle = 'مشاوره انتخاب عطر';
    storyText = 'رایحه امضای خود را متناسب با فصل، استایل و روحیات خود پیدا کنید. برای مشاوره رایگان به ما پیام دهید.';
    storyThumbnailUrl = 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&auto=format&fit=crop&q=60';
    storyMediaUrl = 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop&q=60';

  } else if (isClothing) {
    themeColor = '#db2777'; // pink-600
    physicalCategoryName = 'پوشاک و مد روز';
    physicalCategorySlug = 'clothing-and-fashion';
    digitalCategoryName = 'راهنماها و ژورنال‌های استایل';
    digitalCategorySlug = 'fashion-guides';
    
    pTitle = `شلوار جین مردانه کلاسیک ${shopName} مدل Denim Pro`;
    pPrice = 690000;
    pDiscount = 80000;
    pDescription = 'شلوار جین مردانه با دوخت صنعتی مستحکم، پارچه کتان کش درجه یک سنگ‌شور شده و تن‌خور بسیار عالی.';
    pFullDescription = `این شلوار جین شیک و بادوام از کلکسیون اختصاصی ${shopName}، با استفاده از بهترین پارچه‌های جین ترک و دوخت تمام صنعتی تولید شده است. رنگ ثابت، عدم آبرفت در شستشو و راحتی بی‌نظیر به دلیل استفاده از الیاف کشی از ویژگی‌های بارز این محصول است.`;
    pFeatures = {
      'جنس پارچه': 'کتان کش سنگ‌شور شده درجه یک',
      'تن‌خور (فیت)': 'راسته کلاسیک (Regular Fit)',
      'نوع فاق': 'متوسط'
    };
    pSpecs = {
      'سایزبندی': 'از سایز ۳۰ تا ۴۰ (استاندارد ایرانی)',
      'نحوه شستشو': 'با آب سرد و به صورت پشت و رو',
      'تولیدکننده': `کارگاه تخصصی پوشاک ${shopName}`
    };
    pImageUrl = 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=60';
    pGalleryUrls = [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=60'
    ];
    pVariants = [
      { name: 'سایز ۳۲ / سرمه‌ای تیره', price: 690000, stock: 10 },
      { name: 'سایز ۳۴ / سرمه‌ای تیره', price: 690000, stock: 15 },
      { name: 'سایز ۳۶ / آبی روشن سنگ‌شور', price: 720000, stock: 8 }
    ];

    dTitle = `کتابچه راهنمای جامع استایلینگ و هماهنگی رنگ‌ها در پوشاک (PDF)`;
    dPrice = 85000;
    dDiscount = 15000;
    dDescription = 'اصول ست کردن رنگ‌ها، انتخاب لباس متناسب با فرم بدن و ساخت یک کمد لباس کپسولی شیک و کاربردی.';
    dFullDescription = `این ژورنال و راهنمای استایلینگ توسط طراحان مد ${shopName} تهیه شده است تا به شما کمک کند با کمترین هزینه، شیک‌ترین استایل‌ها را برای خود بسازید. شامل پالت‌های رنگی هماهنگ برای فصول مختلف و راهنمای خرید هوشمندانه لباس.`;
    dFeatures = {
      'فرمت': 'PDF رنگی و مصور',
      'تعداد صفحات': '۴۸ صفحه راهنمای کاربردی',
      'حجم فایل': '۶.۲ مگابایت'
    };
    dSpecs = {
      'مخاطب': 'علاقه‌مندان به مد، استایل و شیک‌پوشی',
      'آپدیت': 'دارای آپدیت‌های فصلی رایگان'
    };
    dImageUrl = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=60';

    blogCategoryName = 'مجله مد و استایل';
    blogCategorySlug = 'fashion-magazine';
    blogPostTitle = 'راهنمای جامع انتخاب شلوار جین مناسب و اصول نگهداری از لباس‌های جین';
    blogPostSummary = 'شلوار جین جزء جدایی‌ناپذیر کمد لباس هر فردی است. در این مقاله به شما می‌گوییم چطور جین مناسب خود را پیدا کنید و از آن نگهداری کنید.';
    blogPostFeaturedImage = 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=60';
    blogPostContent = `<h2>مقدمه: جین، پادشاه بی‌رقیب استایل اسپرت</h2>
<p>بیش از یک قرن است که پارچه جین به عنوان یکی از محبوب‌ترین و کاربردی‌ترین پارچه‌ها در دنیای مد شناخته می‌شود. لباس‌های جین به دلیل دوام بالا و استایل جذابی که ایجاد می‌کنند، هرگز از مد نمی‌افتند. ما در تیم طراحی ${shopName}، همواره تلاش می‌کنیم تا بهترین کیفیت جین را به شما تقدیم کنیم.</p>

<h2>چگونه فیت مناسب شلوار جین را انتخاب کنیم؟</h2>
<p>انتخاب فیت مناسب شلوار جین، کلید اصلی یک استایل بی‌نقص است:</p>
<ul>
  <li><strong>راسته کلاسیک (Regular Fit):</strong> مناسب برای تمامی فرم‌های بدنی، بسیار راحت و مناسب برای استایل‌های روزمره و نیمه‌رسمی.</li>
  <li><strong>جذب (Slim Fit):</strong> فیت مدرن‌تر که در ناحیه ران و ساق پا کمی تنگ‌تر می‌شود و استایلی شیک و جوان‌پسند می‌سازد.</li>
  <li><strong>آزاد (Loose/Baggy Fit):</strong> بسیار راحت و گشاد، مناسب برای استایل‌های خیابانی (Streetwear) و کژوال.</li>
</ul>

<h2>اصول طلایی نگهداری و شستشوی لباس‌های جین</h2>
<p>برای اینکه شلوار یا کت جین شما سال‌ها مانند روز اول نو و خوش‌رنگ باقی بماند، این نکات را جدی بگیرید:</p>
<ol>
  <li><strong>کمتر بشویید:</strong> جین نیاز به شستشوی مداوم ندارد. شستشوی زیاد باعث از بین رفتن رنگ و بافت پارچه می‌شود.</li>
  <li><strong>همیشه پشت و رو کنید:</strong> قبل از انداختن جین به ماشین لباسشویی، حتماً آن را پشت و رو کنید تا رنگ رویه پارچه حفظ شود.</li>
  <li><strong>آب سرد و مایع ملایم:</strong> جین را فقط با آب سرد (حداکثر ۳۰ درجه) و مایع لباسشویی ملایم بشویید. پودرهای لباسشویی حاوی آنزیم‌های قوی رنگ جین را از بین می‌برند.</li>
</ol>
<p>شما می‌توانید جدیدترین و باکیفیت‌ترین شلوارهای جین و پوشاک مد روز را در <a href="/shop" class="text-violet-600 hover:underline font-black">فروشگاه پوشاک ${shopName}</a> مشاهده و تهیه کنید.</p>
<p>منبع: تحریریه مد و پوشاک <a href="/" class="text-violet-600 hover:underline font-black">${shopName}</a></p>`;

    slideTitle = `استایل خود را با ترندهای روز مد دگرگون کنید 🌟`;
    slideSubtitle = `جدیدترین کلکسیون پوشاک بهاره و تابستانه با طراحی مدرن، دوخت بی‌نظیر و پارچه‌های باکیفیت در فروشگاه ${shopName}`;
    slideImageUrl = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&auto=format&fit=crop&q=80';

    storyTitle = 'کلکسیون جدید جین';
    storyText = 'طراحی مدرن، دوخت مستحکم و پارچه جین درجه یک. همین حالا کلکسیون جدید ما را ببینید.';
    storyThumbnailUrl = 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200&auto=format&fit=crop&q=60';
    storyMediaUrl = 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=60';
  }

  return {
    themeColor,
    physicalCategory: { name: physicalCategoryName, slug: physicalCategorySlug },
    digitalCategory: { name: digitalCategoryName, slug: digitalCategorySlug },
    physicalProducts: [
      {
        title: pTitle,
        type: 'physical',
        price: pPrice,
        discount: pDiscount,
        stock: 25,
        description: pDescription,
        fullDescription: pFullDescription,
        features: pFeatures,
        specs: pSpecs,
        imageUrl: pImageUrl,
        galleryUrls: pGalleryUrls,
        variants: pVariants
      },
      {
        title: `محصول ثانویه ${field} مدل کلاسیک`,
        type: 'physical',
        price: pPrice - 150000,
        discount: 50000,
        stock: 25,
        description: `یک محصول باکیفیت و کلاسیک در زمینه ${field} برای استفاده روزمره.`,
        fullDescription: `این محصول کلاسیک با طراحی مینیمال و قیمت مناسب، گزینه‌ای عالی برای علاقه‌مندان به حوزه ${field} است.`,
        features: pFeatures,
        specs: pSpecs,
        imageUrl: pImageUrl,
        galleryUrls: pGalleryUrls
      }
    ],
    digitalProducts: [
      {
        title: dTitle,
        type: 'digital',
        price: dPrice,
        discount: dDiscount,
        stock: 99999,
        description: dDescription,
        fullDescription: dFullDescription,
        features: dFeatures,
        specs: dSpecs,
        imageUrl: dImageUrl,
        galleryUrls: [dImageUrl],
        fileUrl: '/downloads/demo-digital-file.pdf',
        fileFormat: 'PDF',
        fileSize: '4.8 MB',
        previewUrl: dImageUrl,
        techSpecs: 'قابل اجرا در تمامی موبایل‌ها، تبلت‌ها و کامپیوترها.',
        downloadFiles: [
          { name: dTitle, url: '/downloads/demo-digital-file.pdf', size: '4.8 MB', format: 'PDF' }
        ]
      },
      {
        title: `پکیج ویدیویی آموزش تخصصی ${field}`,
        type: 'digital',
        price: dPrice * 3,
        discount: dDiscount * 2,
        stock: 99999,
        description: `مجموعه ویدیوهای آموزشی گام‌به‌گام برای یادگیری حرفه‌ای حوزه ${field}.`,
        fullDescription: `دوره ویدیویی جامع شامل ساعت‌ها آموزش تخصصی توسط اساتید مجرب در زمینه ${field}.`,
        features: { 'فرمت': 'MP4 باکیفیت Full HD', 'مدت زمان': '۵ ساعت آموزش تخصصی' },
        specs: { 'سطح دوره': 'از مقدماتی تا پیشرفته' },
        imageUrl: dImageUrl,
        galleryUrls: [dImageUrl],
        fileUrl: '/downloads/demo-video-course.zip',
        fileFormat: 'ZIP',
        fileSize: '1.2 GB',
        previewUrl: dImageUrl,
        techSpecs: 'لینک دانلود بلافاصله پس از پرداخت فعال می‌شود.',
        downloadFiles: [
          { name: 'پکیج ویدیویی آموزش تخصصی', url: '/downloads/demo-video-course.zip', size: '1.2 GB', format: 'ZIP' }
        ]
      }
    ],
    physicalReviews: [
      { rating: 5, comment: 'فوق‌العاده باکیفیت و دقیقاً مطابق عکس و توضیحات بود. بسته‌بندی عالی و ارسال سریع داشتند. ممنون از فروشگاه خوبتون.', customerName: 'امیرحسین رضایی', customerEmail: 'amir@example.com', customerPhone: '09121111111' },
      { rating: 4, comment: 'کیفیت ساختش واقعاً عالیه و ارزش خرید بالایی داره. فقط کاش تنوع رنگی بیشتری موجود می‌کردید.', customerName: 'مریم حسینی', customerEmail: 'maryam@example.com', customerPhone: '09122222222' }
    ],
    digitalReviews: [
      { rating: 5, comment: 'خیلی کاربردی و عالی بود. مطالب بسیار روان توضیح داده شده و بلافاصله بعد از پرداخت لینک دانلود برام فعال شد.', customerName: 'علی رضایی', customerEmail: 'ali@example.com', customerPhone: '09124444444' }
    ],
    blogCategory: { name: blogCategoryName, slug: blogCategorySlug },
    blogPost: {
      title: blogPostTitle,
      slug: 'demo-blog-article',
      summary: blogPostSummary,
      content: blogPostContent,
      featuredImage: blogPostFeaturedImage,
      tags: [field, 'آموزش', 'راهنمای کاربردی'],
      seoTitle: blogPostTitle,
      seoDescription: blogPostSummary,
      faqs: [
        { question: `چگونه می‌توانم بهترین استفاده را از محصولات حوزه ${field} ببرم؟`, answer: 'با مطالعه راهنماهای تخصصی ما و رعایت نکات نگهداری و اصولی ذکر شده در مقالات وبلاگ.' },
        { question: 'آیا محصولات فیزیکی دارای ضمانت هستند؟', answer: 'بله، تمامی محصولات فیزیکی ما با ضمانت اصالت و سلامت فیزیکی کالا ارائه می‌شوند.' }
      ]
    },
    slides: [
      {
        imageUrl: slideImageUrl,
        title: slideTitle,
        subtitle: slideSubtitle,
        linkText: 'مشاهده محصولات',
        linkUrl: '/shop'
      }
    ],
    stories: [
      {
        title: storyTitle,
        thumbnailUrl: storyThumbnailUrl,
        mediaUrl: storyMediaUrl,
        mediaType: 'image',
        text: storyText,
        linkText: 'ورود به فروشگاه',
        linkUrl: '/shop'
      }
    ],
    footerAboutText: `ما در ${shopName} همواره تلاش می‌کنیم تا بهترین و باکیفیت‌ترین محصولات را در زمینه ${field} با مناسب‌ترین قیمت به دست شما برسانیم. رضایت شما بزرگترین سرمایه ماست.`,
    footerCopyrightText: `تمامی حقوق مادی و معنوی این سایت متعلق به ${shopName} می‌باشد.`,
    aboutUsPage: `<h2>درباره فروشگاه ${shopName}</h2><p>به فروشگاه ${shopName} خوش آمدید. ما با تمرکز بر ارائه بهترین و باکیفیت‌ترین محصولات در حوزه ${field}، تلاش می‌کنیم تا تجربه‌ای بی‌نظیر و لذت‌بخش از خرید آنلاین را برای شما فراهم سازیم.</p><p>ارزش‌های ما شامل تضمین اصالت کالا، پشتیبانی سریع و ارسال به موقع است. رضایت شما بزرگترین هدف و انگیزه ما در این مسیر می‌باشد.</p>`,
    termsPage: `<h2>قوانین و مقررات فروشگاه ${shopName}</h2><p>ورود کاربران به وب‌سایت ${shopName} و استفاده از خدمات ارائه شده در این پلتفرم به معنای آگاه بودن و پذیرفتن شرایط و قوانین ذیل می‌باشد:</p><ul><li>تمامی فعالیت‌های این فروشگاه مطابق با قوانین جمهوری اسلامی ایران و قانون تجارت الکترونیک است.</li><li>مشتری مسئول ارائه اطلاعات صحیح در هنگام ثبت سفارش می‌باشد.</li><li>در صورت بروز هرگونه مشکل در فرآیند ارسال یا کیفیت کالا، پشتیبانی ${shopName} در سریع‌ترین زمان ممکن پاسخگوی شما خواهد بود.</li></ul>`,
    faqsConfig: [
      { question: `آیا محصولات فروشگاه ${shopName} دارای ضمانت هستند؟`, answer: `بله، تمامی محصولات ما در حوزه ${field} دارای ضمانت اصالت و سلامت فیزیکی کالا می‌باشند.` },
      { question: 'چگونه می‌توانم سفارش خود را پیگیری کنم؟', answer: 'پس از ثبت سفارش، کد پیگیری برای شما پیامک خواهد شد و همچنین می‌توانید از بخش پنل کاربری وضعیت سفارش خود را مشاهده کنید.' },
      { question: 'روش‌های پرداخت در فروشگاه به چه صورت است؟', answer: 'شما می‌توانید از طریق درگاه‌های پرداخت امن بانکی یا روش کارت به کارت هزینه سفارش خود را پرداخت نمایید.' }
    ]
  };
}

export async function generateDemoDataWithAI(
  businessField: string,
  shopName: string,
  productType: string,
  options?: {
    shortDescription?: string;
    targetAudience?: string;
    brandTone?: string;
    activityLocation?: string;
  }
): Promise<DemoData> {
  const shortDesc = options?.shortDescription || '';
  const audience = options?.targetAudience || '';
  const tone = options?.brandTone || '';
  const location = options?.activityLocation || '';

  const prompt = `You are an expert e-commerce content generator. Generate a JSON object in Persian containing demo data for a shop named "${shopName}" in the field of: "${businessField}".
The shop sells products of type: "${productType}" (which can be "physical", "digital", or "both").

Additional brand identity parameters to guide generation:
- Brand Slogan & Mission: "${shortDesc}"
- Target Audience: "${audience}"
- Brand Tone/Vibe: "${tone}"
- Location of Activity: "${location}"

The JSON must strictly match this TypeScript interface:

interface DemoCategory {
  name: string;
  slug: string;
}

interface DemoProduct {
  title: string;
  type: 'physical' | 'digital';
  price: number;
  discount: number;
  stock: number;
  description: string;
  fullDescription: string;
  features: Record<string, string>;
  specs: Record<string, string>;
  imageUrl: string;
  galleryUrls: string[];
  variants?: {
    name: string;
    price: number;
    stock: number;
    colorCode?: string;
  }[];
  fileUrl?: string;
  fileFormat?: string;
  fileSize?: string;
  previewUrl?: string;
  techSpecs?: string;
  downloadFiles?: { name: string; url: string; size: string; format: string }[];
}

interface DemoReview {
  rating: number;
  comment: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

interface DemoBlogPost {
  title: string;
  slug: string;
  summary: string;
  content: string;
  featuredImage: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  faqs: { question: string; answer: string }[];
}

interface DemoSlide {
  imageUrl: string;
  title: string;
  subtitle: string;
  linkText: string;
  linkUrl: string;
}

interface DemoStory {
  title: string;
  thumbnailUrl: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  text: string;
  linkText: string;
  linkUrl: string;
}

interface DemoData {
  themeColor: string; // hex code matching the business field (e.g. #854d0e for wood, #15803d for plants, etc.)
  physicalCategory: DemoCategory;
  digitalCategory: DemoCategory;
  physicalProducts: DemoProduct[]; // Array of exactly 2 highly creative, realistic, and fully customized physical products
  digitalProducts: DemoProduct[]; // Array of exactly 2 highly creative, realistic, and fully customized digital products
  physicalReviews: DemoReview[]; // Array of 2 realistic reviews in Persian
  digitalReviews: DemoReview[]; // Array of 2 realistic reviews in Persian
  blogCategory: DemoCategory;
  blogPost: DemoBlogPost; // A beautiful blog post about this business field
  slides: DemoSlide[]; // Array of 1 slide
  stories: DemoStory[]; // Array of 1 story
  footerAboutText: string; // A highly personalized about text for the footer based on the brand and business field
  footerCopyrightText: string; // A highly personalized copyright text for the footer based on the brand
  aboutUsPage: string; // A beautiful, highly personalized "About Us" page in HTML format (using h2, p, ul, li) based on brand name, mission, and target audience
  termsPage: string; // A professional "Terms and Conditions" page in HTML format customized to this business field
  faqsConfig: { question: string; answer: string }[]; // Array of 3-4 highly realistic FAQs related to the products and services of this shop
}

Requirements:
1. Choose a beautiful themeColor hex code matching "${businessField}" and the brand tone "${tone}".
2. For images (imageUrl, galleryUrls, featuredImage, thumbnailUrl, mediaUrl), use high-quality, realistic Unsplash URLs relevant to "${businessField}".
3. Write all titles, descriptions, features, specifications, blog posts, stories, slides, and reviews in natural, persuasive, and professional Persian (فارسی).
4. CRITICAL - EXCLUSIVE ARTICLE GENERATION ("blogPost"):
   - Must be a completely new, unique, and highly professional article in the field of "${businessField}" (NOT a template).
   - Length: Must be at least 800 to 1500 words long.
   - Structure: Must have specialized headings (h2, h3) and subheadings, and be highly SEO-friendly.
   - Branding: Naturally weave the brand name "${shopName}" into the text multiple times, creating a strong sense of branding without sounding like artificial advertising. It must also contain a branding watermark naturally woven into the text (e.g., "(تهیه شده در تحریریه ${shopName})" or "[تولید شده توسط تیم محتوای ${shopName}]" or "منبع: ${shopName}").
   - Links: You MUST include at least 1 or 2 natural HTML links inside the article content pointing to "/shop" with the anchor text containing the brand name, e.g., <a href="/shop" class="text-violet-600 hover:underline font-black">فروشگاه ${shopName}</a> or similar, so that the reader can easily navigate to the shop page from the article.
5. CRITICAL - SAMPLE PRODUCTS ("physicalProduct" and "digitalProduct"):
   - Must be exactly 2 products for each type (exactly 2 physical products and exactly 2 digital products).
   - Must be highly creative, realistic, and fully customized to "${businessField}" and "${shopName}".
   - Product names must be exclusive and incorporate the brand name (e.g., "شلوار جین مردانه کلاسیک ${shopName}").
   - Descriptions must be realistic, and pricing must be logical in Iranian Toman (IRT).
6. CRITICAL - SITE PAGES ("aboutUsPage" and "termsPage"):
   - "aboutUsPage" must be a beautiful, highly personalized "About Us" page in HTML format (using h2, p, ul, li) based on brand name "${shopName}", business field, brand values, and target audience "${audience}".
   - "termsPage" must be a professional "Terms and Conditions" page in HTML format customized to the business field "${businessField}".
   - "faqsConfig" must contain 3-4 highly realistic FAQs related to the products and services of "${shopName}".
7. CRITICAL - FOOTER CONTENT ("footerAboutText" and "footerCopyrightText"):
   - Provide "footerAboutText" and "footerCopyrightText" that are highly personalized to the brand "${shopName}", including a short introduction, competitive advantage, and exclusive brand message (e.g., "${shopName} با تمرکز بر ارائه پوشاک جین باکیفیت و طراحی مدرن تلاش می‌کند تجربه‌ای متفاوت از خرید لباس را برای مشتریان خود فراهم کند.").
8. Do NOT include any markdown formatting, do NOT wrap in \`\`\`json, do NOT include any explanation. Return ONLY the raw JSON object.`;

  const models = ['openai', 'mistral', 'meta-llama'];
  let lastError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const model = models[attempt] || 'openai';
    try {
      console.log(`[AI Demo Data] Attempt ${attempt + 1} using model: ${model}`);
      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: prompt }
          ],
          model: model,
          json: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} from model ${model}`);
      }

      const text = await response.text();
      let jsonText = text.trim();
      
      // Robust JSON extraction
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      let data: any;
      try {
        data = JSON.parse(jsonText);
      } catch (parseErr) {
        console.warn(`[AI Demo Data] JSON parse failed, trying to clean up text...`);
        // If JSON parsing fails due to unescaped newlines or control characters, try basic cleanup
        const cleanedJsonText = jsonText
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // remove control characters
          .replace(/\\n/g, "\\n")
          .replace(/\n/g, " ");
        data = JSON.parse(cleanedJsonText);
      }
      
      // Normalize single product to array if needed (extremely robust)
      if (data.physicalProduct && !data.physicalProducts) {
        data.physicalProducts = [data.physicalProduct];
      }
      if (data.digitalProduct && !data.digitalProducts) {
        data.digitalProducts = [data.digitalProduct];
      }
      if (!data.physicalProducts) {
        data.physicalProducts = [];
      }
      if (!data.digitalProducts) {
        data.digitalProducts = [];
      }

      // Validate structure
      if (data.themeColor && (data.physicalProducts.length > 0 || data.digitalProducts.length > 0)) {
        console.log(`[AI Demo Data] Successfully generated on attempt ${attempt + 1} with model ${model}`);
        return data as DemoData;
      }
      throw new Error('Invalid JSON structure returned from AI');
    } catch (err) {
      console.warn(`[AI Demo Data] Attempt ${attempt + 1} failed:`, err);
      lastError = err;
      // Wait a bit before retrying (1 second)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.error('All AI generation attempts failed, falling back to local generator. Last error:', lastError);
  return generateLocalDemoData(businessField, shopName);
}

export async function getDemoSeedingData(
  businessField: string,
  shopName: string,
  productType: string,
  options?: {
    shortDescription?: string;
    targetAudience?: string;
    brandTone?: string;
    activityLocation?: string;
  }
): Promise<DemoData> {
  // Map predefined business fields to Persian names for better AI context
  const getIndustryPersianName = (id: string) => {
    switch (id) {
      case 'clothing': return 'پوشاک و مد';
      case 'electronics': return 'لوازم دیجیتال و جانبی';
      case 'cosmetics': return 'آرایشی و بهداشتی';
      case 'food': return 'سوپرمارکت و مواد غذایی';
      case 'education': return 'کتاب، تحریر و آموزش';
      default: return id;
    }
  };

  let industryName = getIndustryPersianName(businessField);
  if (industryName === 'general' || !industryName) {
    industryName = shopName;
  }
  return await generateDemoDataWithAI(industryName, shopName, productType, options);
}
