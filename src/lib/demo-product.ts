import { prisma } from '@/lib/prisma';

/**
 * Ensures that a professional demo product exists if the shop has no products.
 * If the shop has at least one real product, any existing demo product is automatically removed.
 */
export async function ensureDemoProduct(shopId: string) {
  try {
    // 0. Check if the shop has demo data enabled in settings. If hasDemoData is false, we should NOT create any demo product.
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId },
      select: { hasDemoData: true }
    });

    if (!shopSettings || !shopSettings.hasDemoData) {
      // If the shop has disabled demo data, ensure any existing demo product is deleted.
      await prisma.product.deleteMany({
        where: {
          shopId,
          id: `demo-product-${shopId}`
        }
      });
      return;
    }

    // 1. Count the number of real products (products that are not the demo product)
    const realProductsCount = await prisma.product.count({
      where: {
        shopId,
        NOT: {
          id: `demo-product-${shopId}`
        }
      }
    });

    if (realProductsCount > 0) {
      // The shop has at least one real product. Ensure the demo product is deleted.
      await prisma.product.deleteMany({
        where: {
          shopId,
          id: `demo-product-${shopId}`
        }
      });
      return;
    }

    // 2. The shop has no real products. Check if the demo product already exists.
    const demoProductExists = await prisma.product.findFirst({
      where: {
        id: `demo-product-${shopId}`,
        shopId
      }
    });

    if (demoProductExists) {
      // Demo product already exists, nothing more to do.
      return;
    }

    // 3. Demo product does not exist, let's create a beautiful demo category first
    let category = await prisma.category.findFirst({
      where: { shopId, slug: 'digital-gadgets' }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          shopId,
          name: 'گجت‌های هوشمند',
          slug: 'digital-gadgets',
          description: 'جدیدترین و پیشرفته‌ترین گجت‌های هوشمند و کالای دیجیتال',
          isActive: true,
          isDemo: true,
        }
      });
    }

    // 4. Create the professional demo product with all fields fully filled
    await prisma.product.create({
      data: {
        id: `demo-product-${shopId}`,
        shopId,
        title: 'ساعت هوشمند پرو مکس مدل Ultra 2 (نسخه نمایشی)',
        type: 'physical',
        categoryId: category.id,
        brand: 'اپل (Apple)',
        price: 4500000,
        discount: 675000, // 15% discount (675,000 Tomans)
        stock: 12,
        imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80',
        description: 'تجربه‌ای متفاوت از فناوری، سلامت و زیبایی بر روی دستان شما با ساعت هوشمند جدید سری اولترا ۲',
        fullDescription: 'ساعت هوشمند پرو مکس مدل Ultra 2 یکی از جدیدترین و پیشرفته‌ترین گجت‌های پوشیدنی است که با طراحی بی‌نظیر و کیفیت ساخت فوق‌العاده بالا به بازار عرضه شده است. این محصول با بدنه مقاوم از جنس تیتانیوم و بند سیلیکونی ضد حساسیت، راحتی بی‌نظیری را برای استفاده روزمره، رسمی و ورزشی فراهم می‌کند. نمایشگر لمسی Super AMOLED با رزولوشن فوق‌العاده بالا و روشنایی عالی در زیر نور آفتاب، تجربه کاربری بسیار روان و لذت‌بخشی را به ارمغان می‌آورد.\n\nاین ساعت مجهز به حسگرهای پیشرفته سلامت از جمله سنجش ضربان قلب، اکسیژن خون (SpO2)، گام‌شمار دقیق و پایش خواب هوشمند بوده و از بیش از ۱۰۰ حالت مختلف ورزشی پشتیبانی می‌کند. همچنین با داشتن میکروفون و بلندگوی باکیفیت، امکان مکالمه مستقیم و پاسخ به تماس‌ها را به راحتی فراهم می‌سازد.',
        features: JSON.stringify([
          'صفحه نمایش ۲.۲ اینچی Super AMOLED همیشه روشن (Always-On Display)',
          'بدنه فوق‌العاده مقاوم تیتانیومی با گواهی ضد آب و گرد و غبار IP68',
          'شارژدهی باتری تا ۷ روز در استفاده معمولی و ۲۴ روز در حالت آماده‌باش',
          'پشتیبانی ۱۰۰٪ کامل از زبان فارسی در تمامی بخش‌های منو و اعلان‌ها',
          'حسگرهای هوشمند ضربان قلب، اکسیژن خون، فشارسنج و دماسنج بدن',
          'میکروفون و اسپیکر داخلی برای مکالمه مستقیم با کیفیت HD'
        ]),
        specs: JSON.stringify({
          'ابعاد صفحه': '۴۹ در ۴۴ در ۱۴.۴ میلی‌متر',
          'وزن بدون بند': '۶۱.۳ گرم',
          'جنس بدنه': 'تیتانیوم گرید هوانوردی',
          'نوع صفحه نمایش': 'Super AMOLED با تراکم ۳۳۸ پیکسل بر اینچ',
          'میزان روشنایی نمایشگر': 'تا ۲۰۰۰ نیت',
          'نسخه بلوتوث': 'بلوتوث نسخه ۵.۳ با مصرف انرژی کم',
          'سازگاری با سیستم‌عامل‌ها': 'اندروید ۶.۰ به بالا و iOS 11.0 به بالا',
          'ظرفیت باتری': '۴۹۰ میلی‌آمپر ساعت با شارژر مغناطیسی وایرلس',
          'زبان‌های پشتیبانی شده': 'فارسی، انگلیسی، عربی، ترکی و ...'
        }),
        galleryUrls: JSON.stringify([
          'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80',
          'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&q=80',
          'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80'
        ]),
        isSpecial: true,
        isActive: true,
        isDemo: true,
        variants: {
          create: [
            {
              shopId,
              name: 'رنگ تیتانیومی با بند نارنجی',
              colorCode: '#ff6b35',
              price: 4500000,
              stock: 5,
              imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80'
            },
            {
              shopId,
              name: 'رنگ مشکی با بند سیلیکونی مشکی',
              colorCode: '#1a1a1a',
              price: 4600000,
              stock: 7,
              imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80'
            }
          ]
        }
      }
    });

    console.log(`[DemoProduct] Beautiful professional demo product created successfully for shop: ${shopId}`);
  } catch (error) {
    console.error('[DemoProduct] Error ensuring demo product:', error);
  }
}
