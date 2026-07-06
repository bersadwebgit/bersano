import Link from 'next/link';
import { Store, Heart, ShieldCheck, HelpCircle } from 'lucide-react';

export default function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { name: 'امکانات اصلی', href: '/features' },
    { name: 'هوش مصنوعی (AI/RAG)', href: '/ai' },
    { name: 'نمونه دموها', href: '/demo' },
    { name: 'تعرفه‌ها و قیمت', href: '/pricing' },
  ];

  const solutionsLinks = [
    { name: 'فروشگاه اینستاگرامی', href: '/instagram-shop' },
    { name: 'سامانه عمده‌فروشی', href: '/wholesale' },
    { name: 'فروش فایل و لایسنس', href: '/digital-products' },
    { name: 'پرداخت و ارسال', href: '/payments-shipping' },
    { name: 'سئو و تولید محتوا', href: '/seo-content' },
  ];

  const resourcesLinks = [
    { name: 'مقالات وبلاگ', href: '/blog' },
    { name: 'راهنمای کاربری', href: '/faq' },
    { name: 'درباره ما', href: '/about' },
    { name: 'ارتباط با ما', href: '/contact' },
  ];

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-slate-800">
          
          {/* Brand Info */}
          <div className="lg:col-span-4 space-y-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black text-white">برسانا</span>
                <span className="text-[10px] font-bold text-blue-400">فروشگاه‌ساز هوشمند</span>
              </div>
            </Link>
            <p className="text-xs leading-relaxed font-bold text-slate-400 max-w-sm">
              برسانا فقط فروشگاه‌ساز نیست؛ یک بستر هوشمند فروش آنلاین است که به کسب‌وکارها کمک می‌کند با کمک هوش مصنوعی و فناوری‌های نوین، فروشگاه حرفه‌ای خود را راه‌اندازی کنند، محصول و سئو بسازند و با زبان خودشان با فروشگاه صحبت کنند.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold text-white pt-2">
              <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                <ShieldCheck className="w-4 h-4" />
                <span>پایداری ۱۰۰٪</span>
              </div>
              <div className="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                <Heart className="w-4 h-4" />
                <span>پشتیبانی ۲۴/۷</span>
              </div>
            </div>
          </div>

          {/* Links Column 1 */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black text-white tracking-wider">امکانات پلتفرم</h4>
            <ul className="space-y-2.5 text-xs font-bold">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black text-white tracking-wider">راهکارها</h4>
            <ul className="space-y-2.5 text-xs font-bold">
              {solutionsLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Column 3 */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black text-white tracking-wider">منابع پلتفرم</h4>
            <ul className="space-y-2.5 text-xs font-bold">
              {resourcesLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact / Trust Area */}
          <div className="lg:col-span-2 space-y-4 text-right">
            <h4 className="text-xs font-black text-white tracking-wider">دفتر مرکزی</h4>
            <div className="text-xs font-bold space-y-2 text-slate-400">
              <p>تهران، بلوار آفریقا، پلاک ۱۱۰</p>
              <p className="dir-ltr text-right">۰۲۱-۱۲۳۴۵۶۷۸</p>
              <p className="dir-ltr text-right">support@bersana.ir</p>
            </div>
            {/* Trust symbols placeholder */}
            <div className="flex gap-2 pt-2">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 hover:border-slate-600 transition-colors">
                <span className="text-[10px] text-slate-500 font-bold">انماد</span>
              </div>
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 hover:border-slate-600 transition-colors">
                <span className="text-[10px] text-slate-500 font-bold">ساماندهی</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs font-bold text-slate-500">
          <p>
            © {currentYear} برسانا. تمامی حقوق مادی و معنوی محفوظ است.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/compare/custom-website" className="hover:text-slate-400 transition-colors">مقایسه با سایت اختصاصی</Link>
            <Link href="/compare/instagram" className="hover:text-slate-400 transition-colors">مقایسه با اینستاگرام</Link>
            <Link href="/faq" className="hover:text-slate-400 transition-colors">پاسخ به سوالات</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
