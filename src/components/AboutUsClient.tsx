'use client';

import { useState } from 'react';
import {
  Sparkles,
  Heart,
  Layers,
  Users,
  Phone,
  HelpCircle,
  MapPin,
  Mail,
  Star,
  Compass,
  ChevronDown,
  Info
} from 'lucide-react';
import { AboutUsConfig } from '@/types/about-us';

interface AboutUsClientProps {
  config: AboutUsConfig;
  themeColor: string;
}

export default function AboutUsClient({ config, themeColor }: AboutUsClientProps) {
  const [activeServiceTab, setActiveServiceTab] = useState<string>(
    config.services.list.length > 0 ? config.services.list[0].id : ''
  );
  
  const [testimonialFilter, setTestimonialFilter] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const selectedService = config.services.list.find(s => s.id === activeServiceTab);

  // Testimonials filter logic
  const filteredTestimonials = testimonialFilter === 'all'
    ? config.testimonials.list
    : config.testimonials.list.filter(t => t.serviceId === testimonialFilter);

  // Helper to get soft-colored theme background for light/dark modes
  const getThemeBgStyle = (opacityHex: string) => `${themeColor}${opacityHex}`;

  return (
    <div className="space-y-10 md:space-y-14" dir="rtl">

      {/* SECTION 1: Brand Story (داستان برند) */}
      <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center">
        <div className="space-y-5 md:order-1 order-2">
          <div
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border"
            style={{
              backgroundColor: getThemeBgStyle('10'),
              borderColor: getThemeBgStyle('20'),
              color: themeColor
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
            داستان شکل‌گیری ما
          </div>

          <h2 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight">
            {config.brandStory.title || 'داستان شکل‌گیری و مأموریت ما'}
          </h2>

          {config.brandStory.foundingYear && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
              <span>تأسیس در سال:</span>
              <span
                className="px-3 py-1 rounded-xl text-gray-800 dark:text-gray-100 font-black border shadow-3xs"
                style={{
                  backgroundColor: getThemeBgStyle('08'),
                  borderColor: getThemeBgStyle('15')
                }}
              >
                {config.brandStory.foundingYear}
              </span>
            </div>
          )}

          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-7 md:leading-8 font-medium text-justify">
            {config.brandStory.storyText}
          </p>

          {/* Vision & Mission Cards */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            {config.brandStory.visionText && (
              <div
                className="p-5 rounded-2xl space-y-2.5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-3xs"
                style={{
                  backgroundColor: getThemeBgStyle('04'),
                  borderColor: getThemeBgStyle('10'),
                }}
              >
                <div className="flex items-center gap-2 font-black text-xs" style={{ color: themeColor }}>
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>چشم‌انداز ما</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium text-justify">
                  {config.brandStory.visionText}
                </p>
              </div>
            )}
            {config.brandStory.missionText && (
              <div
                className="p-5 rounded-2xl space-y-2.5 border border-rose-100/40 dark:border-rose-950/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-3xs"
                style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.03)',
                }}
              >
                <div className="flex items-center gap-2 text-rose-500 font-black text-xs">
                  <Compass className="w-4 h-4 shrink-0" />
                  <span>مأموریت شرکت</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium text-justify">
                  {config.brandStory.missionText}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Brand Illustration/Image */}
        <div className="relative aspect-[4/3] sm:aspect-video md:aspect-square bg-gray-50/50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/50 rounded-3xl overflow-hidden flex items-center justify-center shadow-sm group hover:shadow-md transition-all duration-500 md:order-2 order-1">
          {config.brandStory.imageUrl ? (
            <img
              src={config.brandStory.imageUrl}
              alt="Brand Story"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-600 p-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100/60 dark:border-gray-800">
                <Info className="w-8 h-8" style={{ color: themeColor }} />
              </div>
              <span className="text-xs font-medium text-gray-500">ارزش‌ها و خدمات یکپارچه</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Core Values (ارزش‌های اصلی) */}
      {config.coreValues.list.length > 0 && (
        <div className="space-y-7 pt-8 md:pt-10 border-t border-gray-100 dark:border-gray-800/50">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white">
              {config.coreValues.title || 'ارزش‌های کلیدی و اخلاقی ما'}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">اصول تغییرناپذیر ما برای هدایت خدمات عالی</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {config.coreValues.list.map((value, idx) => (
              <div
                key={value.id}
                className="bg-white dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/50 p-5 rounded-2xl space-y-3 shadow-3xs hover:shadow-xs hover:-translate-y-0.5 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 relative overflow-hidden group"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-lg font-black text-[10px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: getThemeBgStyle('08'), color: themeColor }}
                  >
                    {(idx + 1).toLocaleString('fa-IR')}
                  </div>
                  <h3 className="text-xs font-black text-gray-900 dark:text-white">{value.title}</h3>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium text-justify">
                  {value.description}
                </p>

                {value.serviceId && value.serviceId !== 'general' && (
                  <div className="pt-1">
                    <span className="inline-block text-[9px] px-2.5 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800/80 font-medium text-gray-400 dark:text-gray-500 border border-gray-100/50 dark:border-gray-850">
                      مخصوص سرویس: {config.services.list.find(s => s.id === value.serviceId)?.title || value.serviceId}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3 & 4: Services Structure & Details (ساختار خدمات و جزئیات تب/آکاردئون) */}
      {config.services.list.length > 0 && (
        <div className="space-y-7 pt-8 md:pt-10 border-t border-gray-100 dark:border-gray-800/50">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white">
              {config.services.title || 'ساختار خدمات و دپارتمان‌ها'}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">سلسله‌مراتب و زنجیره ارزش‌آفرینی پلتفرم ما</p>
          </div>

          {/* Horizontal Tabs selector (Segmented Control) */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100/80 dark:border-gray-800/40 gap-1 max-w-full overflow-x-auto scrollbar-none">
              {config.services.list.map((srv) => {
                const isActive = activeServiceTab === srv.id;
                return (
                  <button
                    key={srv.id}
                    onClick={() => setActiveServiceTab(srv.id)}
                    className="px-5 py-2.5 text-xs font-black transition-all duration-300 rounded-xl whitespace-nowrap cursor-pointer border border-transparent"
                    style={{
                      backgroundColor: isActive ? 'white' : 'transparent',
                      color: isActive ? themeColor : '#64748b',
                      boxShadow: isActive ? '0 2px 8px -1px rgba(0, 0, 0, 0.05)' : 'none'
                    }}
                  >
                    {srv.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Service Panel View */}
          {selectedService && (
            <div key={selectedService.id} className="bg-white dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/50 rounded-3xl p-6 md:p-8 space-y-7 shadow-3xs animate-fadeIn">
              <div className="space-y-3">
                <span
                  className="inline-block text-[10px] px-3 py-1 rounded-full font-black border"
                  style={{
                    backgroundColor: getThemeBgStyle('08'),
                    borderColor: getThemeBgStyle('15'),
                    color: themeColor
                  }}
                >
                  سرویس تخصصی
                </span>
                <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white">{selectedService.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{selectedService.description}</p>
              </div>

              {/* Specific details */}
              {selectedService.details && (
                <div className="bg-gray-50/50 dark:bg-gray-950/40 p-5 rounded-2xl border border-gray-100/60 dark:border-gray-850">
                  <h4 className="text-xs font-black text-gray-800 dark:text-white mb-2.5 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-gray-400" />
                    عملکرد و جزئیات سرویس
                  </h4>
                  <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 leading-7 font-medium text-justify">
                    {selectedService.details}
                  </p>
                </div>
              )}

              {/* Sub-services hierarchy */}
              {selectedService.subServices && selectedService.subServices.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4" style={{ color: themeColor }} />
                    زیرسرویس‌ها و شاخه‌ها
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {selectedService.subServices.map(sub => (
                      <div key={sub.id} className="bg-gray-50/30 dark:bg-gray-950/20 border border-gray-100/50 dark:border-gray-850 p-4.5 rounded-2xl space-y-1 transition-all duration-300 hover:border-gray-200 dark:hover:border-gray-800">
                        <h5 className="text-[11px] font-black text-gray-800 dark:text-white">{sub.title}</h5>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{sub.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Team */}
              {selectedService.team && selectedService.team.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-rose-500" />
                    تیم اجرایی سرویس
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selectedService.team.map(member => (
                      <div key={member.id} className="flex items-center gap-3 p-2.5 bg-gray-50/30 dark:bg-gray-950/20 rounded-2xl border border-gray-100/50 dark:border-gray-850">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden shrink-0 flex items-center justify-center shadow-3xs">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h5 className="text-[10px] font-black text-gray-800 dark:text-white truncate">{member.name}</h5>
                          <p className="text-[9px] text-gray-400 truncate font-medium">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact + Specific FAQs */}
              <div className="grid sm:grid-cols-2 gap-6 pt-5 border-t border-gray-100 dark:border-gray-800/50">
                {/* Service contact */}
                {(selectedService.contact.phone || selectedService.contact.email || selectedService.contact.address) && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Phone className="w-4 h-4" style={{ color: themeColor }} />
                      ارتباط مستقیم با بخش {selectedService.title}
                    </h4>
                    <div className="space-y-2.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      {selectedService.contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span dir="ltr">{selectedService.contact.phone}</span>
                        </div>
                      )}
                      {selectedService.contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span dir="ltr">{selectedService.contact.email}</span>
                        </div>
                      )}
                      {selectedService.contact.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed text-justify">{selectedService.contact.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Service FAQs */}
                {selectedService.faqs && selectedService.faqs.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" style={{ color: themeColor }} />
                      سوالات اختصاصی {selectedService.title}
                    </h4>
                    <div className="space-y-2.5">
                      {selectedService.faqs.map(faq => (
                        <div key={faq.id} className="text-[10px] border-r-2 pr-2.5 space-y-0.5 font-medium" style={{ borderRightColor: themeColor }}>
                          <h5 className="font-black text-gray-800 dark:text-gray-200">{faq.question}</h5>
                          <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-justify">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: Platform Management Team (تیم مدیریتی) */}
      {config.team.platformTeam.length > 0 && (
        <div className="space-y-7 pt-8 md:pt-10 border-t border-gray-100 dark:border-gray-800/50">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white">
              {config.team.title || 'شورای مدیریت و رهبری پلتفرم'}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">مدیران تصمیم‌ساز و بنیان‌گذاران مجموعه</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto">
            {config.team.platformTeam.map(member => (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/50 p-5 rounded-2xl flex gap-4 items-center shadow-3xs hover:shadow-xs hover:-translate-y-0.5 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-950 border overflow-hidden shrink-0 flex items-center justify-center shadow-3xs">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs font-black text-gray-900 dark:text-white">{member.name}</h4>
                  <p className="text-[10px] font-black" style={{ color: themeColor }}>{member.role}</p>
                  {member.bio && (
                    <p className="text-[9.5px] text-gray-400 dark:text-gray-500 leading-relaxed font-medium line-clamp-2 text-justify">
                      {member.bio}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: Testimonials & Filtering (نظرات و توصیه‌نامه‌ها) */}
      {config.testimonials.list.length > 0 && (
        <div className="space-y-7 pt-8 md:pt-10 border-t border-gray-100 dark:border-gray-800/50">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white">
              {config.testimonials.title || 'توصیه‌نامه‌ها و صدای خریداران'}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">تجربه شرکا و مشتریان واقعی از خدمات ما</p>
          </div>

          {/* Testimonial Service Filters */}
          {config.services.list.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 p-1 bg-gray-50 dark:bg-gray-900/60 border border-gray-100/80 dark:border-gray-800/40 rounded-2xl max-w-md mx-auto shadow-3xs">
              <button
                onClick={() => setTestimonialFilter('all')}
                className="flex-1 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-300 cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: testimonialFilter === 'all' ? 'white' : 'transparent',
                  color: testimonialFilter === 'all' ? themeColor : '#64748b',
                  boxShadow: testimonialFilter === 'all' ? '0 2px 8px -1px rgba(0, 0, 0, 0.05)' : 'none'
                }}
              >
                همه نظرات
              </button>
              {config.services.list.map(s => (
                <button
                  key={s.id}
                  onClick={() => setTestimonialFilter(s.id)}
                  className="flex-1 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-300 cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor: testimonialFilter === s.id ? 'white' : 'transparent',
                    color: testimonialFilter === s.id ? themeColor : '#64748b',
                    boxShadow: testimonialFilter === s.id ? '0 2px 8px -1px rgba(0, 0, 0, 0.05)' : 'none'
                  }}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}

          {/* Testimonials List Cards */}
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
            {filteredTestimonials.map(test => (
              <div
                key={test.id}
                className="bg-white dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/50 p-5 rounded-2xl space-y-4 relative shadow-3xs hover:shadow-xs hover:-translate-y-0.5 hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-950 overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-center shadow-3xs">
                    {test.avatarUrl ? (
                      <img src={test.avatarUrl} alt={test.author} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">{test.author}</h4>
                    {test.role && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{test.role}</p>}
                  </div>
                  <div className="mr-auto flex gap-0.5 text-amber-400 shrink-0">
                    {Array.from({ length: test.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>

                {/* Quotation block style */}
                <div className="relative bg-gray-50/40 dark:bg-gray-950/25 p-4 rounded-xl border border-gray-100/50 dark:border-gray-850">
                  <Heart className="absolute -top-2 right-3 w-4 h-4 text-rose-200 dark:text-rose-900/40 bg-white dark:bg-gray-900 rounded-full p-0.5" />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium italic text-justify">
                    « {test.comment} »
                  </p>
                </div>

                {test.serviceId && test.serviceId !== 'general' && (
                  <div className="flex justify-end pt-1">
                    <span
                      className="text-[8px] font-medium px-2.5 py-0.5 rounded-full border shadow-3xs"
                      style={{
                        backgroundColor: getThemeBgStyle('06'),
                        borderColor: getThemeBgStyle('12'),
                        color: themeColor
                      }}
                    >
                      بخش: {config.services.list.find(s => s.id === test.serviceId)?.title || test.serviceId}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {filteredTestimonials.length === 0 && (
              <p className="sm:col-span-2 text-[10px] text-gray-400 font-bold text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">توصیه‌نامه‌ای در این بخش یافت نشد.</p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 7 & 8: Contact & Two-Layer FAQs (تماس عمومی + سؤالات متداول عمومی) */}
      <div className="grid md:grid-cols-2 gap-6 md:gap-12 pt-8 md:pt-10 border-t border-gray-100 dark:border-gray-800/50">

        {/* Contact info */}
        <div className="space-y-5 bg-white dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/50 p-6 md:p-8 rounded-2xl shadow-3xs hover:-translate-y-0.5 hover:shadow-xs hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300">
          <div className="space-y-1.5">
            <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white">
              {config.contact.title || 'ارتباط با پلتفرم'}
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">راه‌های ارتباط عمومی و پشتیبانی متمرکز دفتر مرکزی</p>
          </div>

          <div className="space-y-3.5 text-xs font-medium text-gray-500 dark:text-gray-400 pt-2">
            {config.contact.phone && (
              <a href={`tel:${config.contact.phone}`} className="flex items-center gap-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <div className="w-8.5 h-8.5 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100/80 flex items-center justify-center shrink-0 shadow-3xs">
                  <Phone className="w-4.5 h-4.5" style={{ color: themeColor }} />
                </div>
                <span dir="ltr" className="font-black text-gray-700 dark:text-gray-200">{config.contact.phone}</span>
              </a>
            )}
            {config.contact.email && (
              <a href={`mailto:${config.contact.email}`} className="flex items-center gap-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <div className="w-8.5 h-8.5 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100/80 flex items-center justify-center shrink-0 shadow-3xs">
                  <Mail className="w-4.5 h-4.5 text-rose-500" />
                </div>
                <span dir="ltr" className="font-black text-gray-700 dark:text-gray-200">{config.contact.email}</span>
              </a>
            )}
            {config.contact.address && (
              <div className="flex items-start gap-3">
                <div className="w-8.5 h-8.5 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-100/80 flex items-center justify-center shrink-0 shadow-3xs">
                  <MapPin className="w-4.5 h-4.5 text-emerald-500" />
                </div>
                <span className="leading-relaxed text-justify font-medium pt-1">{config.contact.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* General FAQs */}
        {config.faqs.generalFaqs.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white">
                {config.faqs.title || 'سؤالات عمومی متداول'}
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">پاسخ به متداول‌ترین ابهامات و پرسش‌های روزمره شما</p>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800/60 pt-1">
              {config.faqs.generalFaqs.map(faq => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className="py-3">
                    <button
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full flex items-center justify-between py-2 text-right text-xs font-black hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <span className={isOpen ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}>{faq.question}</span>
                      <ChevronDown
                        className="w-3.5 h-3.5 text-gray-400 transition-transform duration-300 shrink-0 mr-2"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'none', color: isOpen ? themeColor : undefined }}
                      />
                    </button>
                    {isOpen && (
                      <div className="pb-2 pt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-7 font-medium text-justify animate-slideDown">
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
    </div>
  );
}
