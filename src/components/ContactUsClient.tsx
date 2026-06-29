'use client';

import { useState } from 'react';
import {
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  Send as TelegramIcon,
  CheckCircle2,
  Users,
  Building,
  Info
} from 'lucide-react';
import { ContactUsConfig } from '@/types/contact-us';

interface ContactUsClientProps {
  config: ContactUsConfig;
  themeColor: string;
}

export default function ContactUsClient({ config, themeColor }: ContactUsClientProps) {
  // Form submission state
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [successTrackingMsg, setSuccessTrackingMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // Helper to get soft-colored theme background for light/dark modes
  const getThemeBgStyle = (opacityHex: string) => `${themeColor}${opacityHex}`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.message) return;

    setLoading(true);
    setFormError(null);
    setSuccessTrackingMessage(null);
    try {
      const res = await fetch('/api/contact-us', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFormSubmitted(true);
        setSuccessTrackingMessage(data.trackingMessage || null);
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setFormError(data.error || 'خطا در ثبت پیام. لطفاً مجدداً تلاش کنید.');
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setFormError('خطا در برقراری ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to render platform icons
  const renderSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        );
      case 'telegram':
        return <TelegramIcon className="w-4 h-4" />;
      case 'bale':
        return (
          <span className="font-black text-[10px] w-4 h-4 flex items-center justify-center border border-current rounded-full leading-none">
            ب
          </span>
        );
      case 'eitaa':
        return (
          <span className="font-black text-[10px] w-4 h-4 flex items-center justify-center border border-current rounded-full leading-none">
            ای
          </span>
        );
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  // Helper to translate platform names
  const getPlatformLabel = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return 'اینستاگرام';
      case 'telegram':
        return 'تلگرام';
      case 'bale':
        return 'بله';
      case 'eitaa':
        return 'ایتا';
      case 'whatsapp':
        return 'واتس‌اپ';
      default:
        return platform;
    }
  };

  return (
    <div className="space-y-16" dir="rtl">
      
      {/* SECTION 1: Hero Header */}
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center pt-4">
        <div className="space-y-6">
          <div 
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all duration-300"
            style={{ 
              backgroundColor: getThemeBgStyle('10'), 
              borderColor: getThemeBgStyle('20'),
              color: themeColor
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
            پل‌های ارتباطی ما
          </div>
          
          <h2 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight">
            {config.hero.title || 'ارتباط با ما'}
          </h2>
          
          {config.hero.subtitle && (
            <p className="text-sm font-black text-gray-800 dark:text-gray-200" style={{ color: themeColor }}>
              {config.hero.subtitle}
            </p>
          )}
          
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium text-justify">
            {config.hero.description}
          </p>

          {/* CTA Track Link */}
          <div className="pt-2">
            <a
              href="/pages/contact-us-track"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black border transition-all duration-300 hover:shadow-sm"
              style={{
                backgroundColor: getThemeBgStyle('06'),
                borderColor: getThemeBgStyle('15'),
                color: themeColor
              }}
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>پیگیری پیام‌های قبلی تماس با ما</span>
            </a>
          </div>

          {/* Social Links Quick Badges */}
          {config.socialLinks.list.length > 0 && (
            <div className="space-y-2.5 pt-4">
              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-bold block">ما را در شبکه‌های اجتماعی دنبال کنید:</span>
              <div className="flex flex-wrap gap-2">
                {config.socialLinks.list.map(soc => (
                  <a
                    key={soc.id}
                    href={soc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs text-gray-600 dark:text-gray-300 font-bold transition-all duration-300 shadow-3xs"
                  >
                    <span style={{ color: themeColor }}>{renderSocialIcon(soc.platform)}</span>
                    <span>{getPlatformLabel(soc.platform)}: {soc.username}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hero Illustration / Contact Info Quick View */}
        <div className="relative p-6 md:p-8 bg-gray-50/50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/50 rounded-3xl overflow-hidden flex flex-col justify-center gap-6 shadow-sm hover:shadow-md transition-all duration-500 min-h-[300px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-primary-500/10 to-transparent rounded-full blur-2xl" />
          
          <div className="space-y-4 relative z-10">
            <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4" style={{ color: themeColor }} />
              اطلاعات مرکزی فروشگاه
            </h3>
            
            <div className="space-y-4">
              {/* Phone */}
              {config.map.addressDescription && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-gray-400" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold block">نشانی اصلی</span>
                    <p className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{config.map.addressDescription}</p>
                  </div>
                </div>
              )}

              {config.departments.list.length > 0 && config.departments.list[0].phone && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-gray-400" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold block">تلفن تماس مرکزی</span>
                    <p className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed" dir="ltr">{config.departments.list[0].phone}</p>
                  </div>
                </div>
              )}

              {config.departments.list.length > 0 && config.departments.list[0].email && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-gray-400" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold block">ایمیل پشتیبانی رسمی</span>
                    <p className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{config.departments.list[0].email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Opening Hours & Departments */}
      <div className="grid md:grid-cols-2 gap-8 pt-10 border-t border-gray-100 dark:border-gray-800/50">
        
        {/* Opening Hours */}
        <div className="bg-white dark:bg-gray-950 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-3xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: themeColor }} />
              {config.openingHours.title || 'ساعات پاسخگویی و فعالیت'}
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">بازه روزهای هفته و زمان‌هایی که به صورت تلفنی و حضوری در خدمت شما هستیم</p>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {config.openingHours.list.map(hour => (
              <div key={hour.id} className="py-3.5 flex items-center justify-between text-xs font-bold">
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                  {hour.dayRange}
                </span>
                <span className="text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-xl border border-gray-100/60 dark:border-gray-800/40">
                  {hour.hours}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Departments List */}
        <div className="bg-white dark:bg-gray-950 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-3xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: themeColor }} />
              {config.departments.title || 'دپارتمان‌های اختصاصی تماس'}
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">برای کاهش زمان هماهنگی، مستقیماً با دپارتمان مربوطه در تماس باشید</p>
          </div>

          <div className="space-y-4">
            {config.departments.list.map(dep => (
              <div 
                key={dep.id} 
                className="p-4 rounded-xl border border-gray-100 dark:border-gray-800/40 bg-gray-50/40 dark:bg-gray-900/10 space-y-2.5 hover:border-gray-200 dark:hover:border-gray-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                    <span className="w-1 h-3 rounded-full" style={{ backgroundColor: themeColor }} />
                    {dep.name}
                  </span>
                  {dep.responsiblePerson && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">
                      مسئول: {dep.responsiblePerson}
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-bold">
                  {dep.phone && (
                    <span className="flex items-center gap-1" dir="ltr">
                      <Phone className="w-3 h-3 shrink-0" style={{ color: themeColor }} />
                      {dep.phone}
                    </span>
                  )}
                  {dep.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 shrink-0" style={{ color: themeColor }} />
                      {dep.email}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SECTION 3: Interactive Contact Form & Map */}
      <div className="grid md:grid-cols-5 gap-8 pt-10 border-t border-gray-100 dark:border-gray-800/50">
        
        {/* Contact Form */}
        <div className={`md:col-span-3 space-y-6 ${!config.contactForm.enabled ? 'hidden md:block opacity-40' : ''}`}>
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: themeColor }} />
              {config.contactForm.title || 'ارسال پیام مستقیم'}
            </h3>
            {config.contactForm.description && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">{config.contactForm.description}</p>
            )}
          </div>

          {config.contactForm.enabled ? (
            <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-950 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-3xs">
              
              {formSubmitted && (
                <div 
                  className="p-4 rounded-xl border flex flex-col gap-2.5 text-xs font-bold leading-relaxed transition-all animate-fadeIn"
                  style={{ 
                    backgroundColor: getThemeBgStyle('06'), 
                    borderColor: getThemeBgStyle('15'),
                    color: themeColor
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black mb-0.5">پیام شما دریافت شد</span>
                      <span>{config.contactForm.successMessage || 'پیام شما با موفقیت به بخش پشتیبانی ارسال شد.'}</span>
                    </div>
                  </div>
                  {successTrackingMsg && (
                    <div className="mt-2 p-3 bg-white/70 dark:bg-black/30 rounded-lg border border-current/10 font-bold text-[11px] leading-relaxed">
                      <p className="font-extrabold text-xs mb-1.5" style={{ color: themeColor }}>🔑 راهنمای پیگیری پاسخ پیام شما:</p>
                      <div className="whitespace-pre-wrap">{successTrackingMsg}</div>
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <div className="p-4 rounded-xl border flex items-start gap-2.5 text-xs font-bold leading-relaxed transition-all bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-850/40 text-red-600 dark:text-red-400">
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold block">نام و نام خانوادگی <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    placeholder="مثال: علی محمدی"
                    className="w-full px-3.5 py-2.5 bg-gray-50/60 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/80 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 focus:bg-white dark:focus:bg-gray-950 transition-all placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold block">شماره موبایل</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full px-3.5 py-2.5 bg-gray-50/60 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/80 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 focus:bg-white dark:focus:bg-gray-950 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold block">آدرس ایمیل</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="مثال: name@example.com"
                    className="w-full px-3.5 py-2.5 bg-gray-50/60 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/80 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 focus:bg-white dark:focus:bg-gray-950 transition-all placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold block">موضوع یا بخش هدف</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 bg-gray-50/60 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/80 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 focus:bg-white dark:focus:bg-gray-950 transition-all cursor-pointer"
                  >
                    <option value="">انتخاب موضوع پیام...</option>
                    {config.departments.list.map(dep => (
                      <option key={dep.id} value={dep.name}>{dep.name}</option>
                    ))}
                    <option value="other">سایر موارد</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold block">متن پیام <span className="text-red-500">*</span></label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  rows={4}
                  placeholder="پیام خود را به طور کامل بنویسید..."
                  className="w-full px-3.5 py-2.5 bg-gray-50/60 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/80 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 focus:bg-white dark:focus:bg-gray-950 transition-all placeholder:text-gray-400 leading-relaxed resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !formData.name || !formData.message}
                className="w-full sm:w-auto px-5 py-3 rounded-xl font-black text-xs text-white shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: themeColor }}
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    ارسال پیام پشتیبانی
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="p-8 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-100 dark:border-gray-800 text-center font-bold text-xs text-gray-500">
              فرم تماس در حال حاضر غیرفعال است. لطفاً از طریق سایر اطلاعات ذکر شده با ما ارتباط برقرار کنید.
            </div>
          )}
        </div>

        {/* Dynamic Location Map */}
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: themeColor }} />
              موقعیت مکانی دفتر مرکزی
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">نقشه جغرافیایی و راه‌های مراجعه</p>
          </div>

          <div className="bg-white dark:bg-gray-950 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-3xs flex flex-col gap-4">
            
            {config.map.enabled && config.map.provider === 'embed' && config.map.embedUrl ? (
              <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                <iframe
                  src={config.map.embedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                />
              </div>
            ) : config.map.enabled && config.map.provider === 'coordinates' && config.map.latitude && config.map.longitude ? (
              <div 
                className="relative aspect-square w-full rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center p-6 text-center gap-3 hover:-translate-y-0.5 transition-all duration-300 shadow-3xs"
                style={{ backgroundColor: getThemeBgStyle('04') }}
              >
                <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/80">
                  <MapPin className="w-6 h-6 animate-bounce" style={{ color: themeColor }} />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-gray-800 dark:text-gray-100 block">موقعیت دقیق جغرافیایی ثبت شد</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">عرض: {config.map.latitude} | طول: {config.map.longitude}</span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${config.map.latitude},${config.map.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-[10px] font-black shadow-3xs transition-all"
                  style={{ color: themeColor }}
                >
                  مسیریابی روی گوگل‌مپ
                </a>
              </div>
            ) : (
              <div className="relative aspect-square w-full rounded-xl border border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center p-6 text-center gap-3 text-gray-400">
                <MapPin className="w-8 h-8 opacity-40" />
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">نقشه آنلاین ثبت نشده است</span>
              </div>
            )}

            {config.map.addressDescription && (
              <div className="text-[11px] text-gray-600 dark:text-gray-300 font-medium leading-relaxed bg-gray-50/50 dark:bg-gray-900/10 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800/40">
                <span className="font-black text-gray-800 dark:text-white block mb-1">راهنمای آدرس پستی:</span>
                {config.map.addressDescription}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 4: Contact FAQs */}
      {config.faqs.list.length > 0 && (
        <div className="space-y-6 pt-10 border-t border-gray-100 dark:border-gray-800/50">
          <div className="text-center space-y-2">
            <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white flex items-center justify-center gap-2">
              <HelpCircle className="w-4 h-4" style={{ color: themeColor }} />
              {config.faqs.title || 'پرسش‌های متداول ارتباط و پشتیبانی'}
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">پاسخ سریع به سوالات پرتکرار مشتریان پیش از تماس با ما</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3.5">
            {config.faqs.list.map(faq => {
              const isOpen = openFaqId === faq.id;
              return (
                <div 
                  key={faq.id}
                  className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-3xs overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full p-4 md:p-5 flex items-center justify-between text-right text-xs md:text-sm font-black text-gray-800 dark:text-gray-100 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-900/10"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown 
                      className={`w-4 h-4 shrink-0 transition-transform duration-300 text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-gray-50 dark:border-gray-900 text-[11px] md:text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-bold animate-slideDown">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
