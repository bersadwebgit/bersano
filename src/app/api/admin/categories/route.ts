import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import { verifyAuth } from '@/lib/auth';
import { Invalidate } from '@/lib/invalidate';

const iconKeywords = [
  {
    keywords: ['موبایل', 'گوشی', 'تلفن', 'تبلت', 'smartphone', 'mobile', 'phone', 'tablet', 'سیم کارت'],
    icon: 'Smartphone'
  },
  {
    keywords: ['لپ تاپ', 'لپ‌تاپ', 'کامپیوتر', 'رایانه', 'مانیتور', 'نمایشگر', 'سخت افزار', 'سخت‌افزار', 'cpu', 'ram', 'پرینتر', 'چاپگر', 'کیبورد', 'ماوس', 'laptop', 'computer'],
    icon: 'Laptop'
  },
  {
    keywords: ['دیجیتال', 'الکترونیک', 'پاوربانک', 'شارژر', 'کابل', 'فلش', 'هارد', 'حافظه', 'مودم', 'شبکه', 'تجهیزات شبکه'],
    icon: 'Cpu'
  },
  {
    keywords: ['لباس', 'پوشاک', 'پیراهن', 'تیشرت', 'شلوار', 'کت', 'کاپشن', 'مانتو', 'روسری', 'شال', 'جوراب', 'پالتو', 'جین', 'shirt', 'clothing', 'apparel'],
    icon: 'Shirt'
  },
  {
    keywords: ['کفش', 'کتانی', 'صندل', 'دمپایی', 'بوت', 'نیم بوت', 'shoes', 'sneakers'],
    icon: 'Footprints'
  },
  {
    keywords: ['ساعت', 'مچ بند', 'امگا', 'رولکس', 'watch', 'clock'],
    icon: 'Watch'
  },
  {
    keywords: ['عینک', 'آفتابی', 'طبی', 'glasses', 'sunglasses'],
    icon: 'Glasses'
  },
  {
    keywords: ['طلا', 'جواهر', 'نقره', 'بدلیجات', 'اکسسوری', 'زیورآلات', 'گردنبند', 'دستبند', 'انگشتر', 'گوشواره', 'jewelry', 'accessory'],
    icon: 'Crown'
  },
  {
    keywords: ['آرایشی', 'بهداشتی', 'زیبایی', 'پوست', 'مو', 'عطر', 'ادکلن', 'اسپری', 'میکاپ', 'ماتیک', 'رژ', 'کرم', 'شامپو', 'صابون', 'cosmetic', 'beauty', 'perfume'],
    icon: 'Sparkles'
  },
  {
    keywords: ['خانه', 'آشپزخانه', 'لوازم خانگی', 'یخچال', 'تلویزیون', 'tv', 'ماشین لباسشویی', 'ماشین ظرفشویی', 'جاروبرقی', 'مایکروویو', 'فر', 'home', 'kitchen', 'appliances'],
    icon: 'Home'
  },
  {
    keywords: ['مبل', 'مبلمان', 'میز', 'صندلی', 'کمد', 'تخت', 'دکوراسیون', 'دکوری', 'تزئینی', 'لوستر', 'چراغ', 'روشنایی', 'فرش', 'پرده', 'furniture', 'decor'],
    icon: 'Sofa'
  },
  {
    keywords: ['ابزار', 'آچار', 'پیچ', 'دریل', 'سنگ فرز', 'انبردست', 'پیچ گوشتی', 'جعبه ابزار', 'صنعتی', 'یراق', 'تجهیزات صنعتی', 'wrench', 'tools'],
    icon: 'Wrench'
  },
  {
    keywords: ['خودرو', 'ماشین', 'موتور', 'موتورسیکلت', 'یدکی', 'قطعات خودرو', 'لاستیک', 'تایر', 'روغن موتور', 'car', 'automotive'],
    icon: 'Car'
  },
  {
    keywords: ['کتاب', 'رمان', 'دفتر', 'لوازم تحریر', 'لوازم‌التحریر', 'تحریر', 'مداد', 'خودکار', 'روان نویس', 'آموزشی', 'کنکور', 'مدرسه', 'دانشگاه', 'book', 'stationery'],
    icon: 'BookOpen'
  },
  {
    keywords: ['بازی', 'گیم', 'کنسول', 'پلی استیشن', 'ایکس باکس', 'سونی', 'ps5', 'xbox', 'نینتندو', 'اسباب بازی', 'عروسک', 'سرگرمی', 'game', 'toy'],
    icon: 'Gamepad2'
  },
  {
    keywords: ['ورزش', 'ورزشی', 'باشگاه', 'دمبل', 'تردمیل', 'فوتبال', 'کوهنوردی', 'کمپینگ', 'سفر', 'چمدان', 'کوله پشتی', 'sport', 'fitness'],
    icon: 'Trophy'
  },
  {
    keywords: ['سوپرمارکت', 'غذا', 'خوراکی', 'نوشیدنی', 'شکلات', 'بیسکویت', 'روغن', 'برنج', 'چای', 'قهوه', 'کافی', 'تنقلات', 'لبنیات', 'grocery', 'food'],
    icon: 'ShoppingBag'
  },
  {
    keywords: ['کافه', 'رستوران', 'کیک', 'شیرینی', 'پیتزا', 'فست فود', 'آبمیوه', 'coffee', 'cafe'],
    icon: 'Coffee'
  },
  {
    keywords: ['سلامت', 'پزشکی', 'دارو', 'قرص', 'ویتامین', 'مکمل', 'درمانی', 'ماسک', 'ضدعفونی', 'کرونا', 'health', 'medical'],
    icon: 'HeartPulse'
  },
  {
    keywords: ['کودک', 'نوزاد', 'بچه', 'سیسمونی', 'پوشک', 'شیرخشک', 'baby'],
    icon: 'Baby'
  },
  {
    keywords: ['دوربین', 'عکاسی', 'فیلمبرداری', 'لنز', 'آتلیه', 'camera', 'photography'],
    icon: 'Camera'
  },
  {
    keywords: ['موسیقی', 'موزیک', 'ساز', 'گیتار', 'پیانو', 'ویولن', 'اسپیکر', 'باند', 'هدفون', 'هندزفری', 'هدست', 'music', 'audio'],
    icon: 'Headphones'
  },
  {
    keywords: ['پت', 'حیوانات', 'سگ', 'گربه', 'غذای سگ', 'غذای گربه', 'آکواریوم', 'ماهی', 'pet', 'animal'],
    icon: 'Heart'
  },
  {
    keywords: ['گل', 'گیاه', 'گلدان', 'باغبان', 'باغبانی', 'کود', 'خاک', 'flower', 'plant'],
    icon: 'Flower'
  },
  {
    keywords: ['بیمه', 'خدمات', 'مشاوره', 'حقوقی', 'پشتیبانی', 'آموزش', 'دوره', 'کلاس', 'workshop', 'course'],
    icon: 'Briefcase'
  },
  {
    keywords: ['تخفیف', 'ویژه', 'آفر', 'حراج', 'شگفت انگیز', 'sale', 'discount', 'percent'],
    icon: 'Percent'
  }
];

function getIconFromKeywords(name: string, description?: string): string | null {
  const textToSearch = `${name} ${description || ''}`.toLowerCase();
  for (const item of iconKeywords) {
    for (const keyword of item.keywords) {
      if (textToSearch.includes(keyword.toLowerCase())) {
        return item.icon;
      }
    }
  }
  return null;
}

async function getIconFromAi(name: string, description?: string): Promise<string | null> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['ai_enabled', 'openrouter_api_key', 'openrouter_model', 'openrouter_control_model']
        }
      }
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    if (settingsMap.get('ai_enabled') === 'false') {
      return null;
    }

    const apiKey = settingsMap.get('openrouter_api_key') || '';
    const openrouterModel = settingsMap.get('openrouter_control_model') || settingsMap.get('openrouter_model') || 'google/gemini-2.5-flash';

    if (!apiKey) {
      return null;
    }

    const prompt = `تو یک دستیار هوشمند طراحی رابط کاربری (UI/UX) هستی.
وظیفه تو این است که بر اساس نام و توضیحات یک دسته‌بندی فروشگاهی، مناسب‌ترین نام آیکون از کتابخانه معروف Lucide Icons را پیشنهاد دهی.

نام دسته‌بندی: "${name}"
توضیحات دسته‌بندی: "${description || 'بدون توضیحات'}"

قوانین انتخاب آیکون:
۱. حتماً باید یک نام معتبر از آیکون‌های Lucide باشد (مانند: Smartphone, Laptop, Shirt, Footprints, Watch, Glasses, Crown, Sparkles, Home, Sofa, Wrench, Car, BookOpen, Gamepad2, Trophy, ShoppingBag, Coffee, HeartPulse, Baby, Camera, Headphones, Heart, Flower, Briefcase, Percent, Tag, Box, Gift, Package, Layers, Grid, List, Star, Settings).
۲. نام آیکون باید دقیقاً با حروف بزرگ شروع شود (PascalCase) مانند "Smartphone" یا "ShoppingBag".
۳. اگر هیچ آیکون خاصی کاملاً منطبق نیست، یک آیکون عمومی بسیار مناسب مثل "Tag" یا "Box" یا "Package" یا "Layers" یا "Grid" برگردان.

خروجی تو باید فقط و فقط نام آیکون به انگلیسی باشد و هیچ متن، توضیح، تگ یا کاراکتر اضافی دیگری قبل یا بعد آن بازنگردانی.
مثال خروجی:
Smartphone`;

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SaaS Shop Builder - Category Icon Auto Generator',
      },
      body: JSON.stringify({
        model: openrouterModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 30,
      }),
    });

    if (openRouterResponse.ok) {
      const responseData = await openRouterResponse.json();
      const aiText = responseData.choices?.[0]?.message?.content?.trim();
      if (aiText && aiText.length < 50) {
        const cleanedIcon = aiText.replace(/[^a-zA-Z0-9]/g, '');
        return cleanedIcon;
      }
    }
  } catch (e) {
    console.error('Error getting category icon from AI:', e);
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const categories = await prisma.category.findMany({
      where: { shopId: shop.shopId },
      include: {
        _count: {
          select: { products: true }
        },
        parent: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const body = await request.json();
    let { name, slug, description, seoTitle, seoDescription, icon, imageUrl, isActive, parentId } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'نام و نامک الزامی است' }, { status: 400 });
    }

    // Check if slug already exists for this shop
    const existing = await prisma.category.findFirst({
      where: {
        shopId: shop.shopId,
        slug
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'این نامک قبلاً استفاده شده است' }, { status: 400 });
    }

    // Automatically generate a matching category icon if none is provided
    if (!icon && !imageUrl) {
      const keywordIcon = getIconFromKeywords(name, description);
      if (keywordIcon) {
        icon = keywordIcon;
      } else {
        const aiIcon = await getIconFromAi(name, description);
        icon = aiIcon || 'Folder';
      }
    }

    const category = await prisma.category.create({
      data: {
        shopId: shop.shopId,
        name,
        slug,
        description,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        icon: icon || null,
        imageUrl: imageUrl || null,
        parentId: parentId || null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    await Invalidate.categories(shop.shopId);

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
