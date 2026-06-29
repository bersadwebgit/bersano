'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, ChevronLeft, Globe } from 'lucide-react';
import { DEFAULT_FOOTER_CONFIG, type FooterConfig } from '@/types/footer';

interface FooterProps {
  shopName: string;
  logoUrl?: string | null;
  config?: FooterConfig;
}

// Persian accessible labels for social platforms
const SOCIAL_LABELS: Record<string, string> = {
  instagram: 'اینستاگرام',
  telegram: 'تلگرام',
  whatsapp: 'واتس‌اپ',
  twitter: 'توییتر',
  linkedin: 'لینکدین',
  youtube: 'یوتیوب',
  aparat: 'آپارات',
  phone: 'تلفن',
  email: 'ایمیل',
};

// Custom SVG Icons for Social Media Platforms
const SocialIcon = ({ platform, className = "w-5 h-5" }: { platform: string; className?: string }) => {
  switch (platform) {
    case 'instagram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="24" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    case 'telegram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
        </svg>
      );
    case 'aparat':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      );
    default:
      return <Globe className={className} />;
  }
};

export default function Footer({ shopName, logoUrl, config }: FooterProps) {
  const [isClient, setIsClient] = useState(false);
  const customHtmlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const footerConfig: FooterConfig = config
    ? { ...DEFAULT_FOOTER_CONFIG, ...config }
    : DEFAULT_FOOTER_CONFIG;

  // Inject custom HTML and re-execute <script> tags (innerHTML alone never runs them)
  useEffect(() => {
    if (!isClient || !customHtmlRef.current) return;
    const container = customHtmlRef.current;
    container.innerHTML = footerConfig.customHtml || '';
    if (!footerConfig.customHtml) return;

    const scripts = Array.from(container.querySelectorAll('script'));
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [isClient, footerConfig.customHtml]);

  if (!footerConfig.enabled) return null;

  // Theme styles based on configuration
  const isCustom = footerConfig.theme === 'custom';
  const isDark = footerConfig.theme === 'dark';

  const themeStyles = isCustom
    ? {
        backgroundColor: footerConfig.bgColor,
        color: footerConfig.textColor,
        borderColor: footerConfig.borderColor,
        '--footer-link': footerConfig.linkColor,
        '--footer-link-hover': footerConfig.linkHoverColor,
      } as React.CSSProperties
    : {};

  const themeClasses = isCustom
    ? ''
    : isDark
    ? 'bg-slate-900 text-slate-300 border-slate-800'
    : 'bg-slate-50 text-slate-600 border-slate-200';

  const titleColorClass = isCustom ? '' : isDark ? 'text-white' : 'text-slate-800';
  const dividerBorderClass = isCustom ? 'border-t' : isDark ? 'border-t border-slate-800' : 'border-t border-slate-200';

  // Theme-aware surface (used by contact cards) so it reads correctly on light/dark/custom backgrounds
  const surfaceBg = isCustom
    ? 'rgba(255,255,255,0.04)'
    : isDark
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(255,255,255,0.6)';
  const surfaceBorder = isCustom ? footerConfig.borderColor : 'rgba(148, 163, 184, 0.2)';

  return (
    <footer 
      className={`w-full py-10 sm:py-12 px-4 sm:px-6 lg:px-8 border-t mt-auto ${themeClasses} footer-custom-colors`}
      style={themeStyles}
      dir="rtl"
      aria-label="پاورقی سایت"
    >
      {isCustom && (
        <style dangerouslySetInnerHTML={{ __html: `
          .footer-custom-link {
            color: var(--footer-link) !important;
            transition: color 0.2s ease, transform 0.2s ease;
          }
          .footer-custom-link:hover {
            color: var(--footer-link-hover) !important;
          }
        `}} />
      )}
      <div className="max-w-7xl mx-auto">
        {/* Top Grid: Logo/About + Links Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 mb-10">
          {/* Shop Info Column */}
          <div className="lg:col-span-4 flex flex-col gap-4 min-w-0">
            <div className="flex items-center">
              {logoUrl || footerConfig.logoUrl ? (
                <img 
                  src={logoUrl || footerConfig.logoUrl || ''} 
                  alt={shopName} 
                  className="h-12 w-auto object-contain max-w-[180px]"
                />
              ) : (
                <span className={`text-2xl font-bold tracking-tight break-words ${titleColorClass}`}>
                  {shopName}
                </span>
              )}
            </div>
            
            <p className="text-sm leading-relaxed text-justify opacity-90 max-w-prose">
              {footerConfig.aboutText}
            </p>

            {/* Social Media Links */}
            {footerConfig.showSocials && footerConfig.socials.some(s => s.enabled && s.url) && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {footerConfig.socials.map((social, idx) => {
                  if (!social.enabled || !social.url) return null;
                  const label = SOCIAL_LABELS[social.platform] || social.platform;
                  return (
                    <a
                      key={idx}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:-translate-y-0.5 opacity-80 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      style={{ backgroundColor: surfaceBg }}
                      title={label}
                      aria-label={label}
                    >
                      <SocialIcon platform={social.platform} className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic Links Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 min-w-0">
            {footerConfig.columns.map((column) => (
              <div key={column.id} className="flex flex-col gap-4 min-w-0">
                <h3 className={`text-base font-bold ${titleColorClass}`}>
                  {column.title}
                </h3>
                <ul className="space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.id}>
                      <Link
                        href={link.url}
                        target={link.target}
                        className="text-sm inline-flex items-center gap-1 transition-all duration-200 opacity-85 hover:opacity-100 hover:-translate-x-1 footer-custom-link rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 opacity-50 shrink-0" aria-hidden="true" />
                        <span className="break-words">{link.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Info & Trust Badges Section */}
        {(footerConfig.showContactInfo || (footerConfig.badges && footerConfig.badges.length > 0)) && (
          <div className={`py-6 ${dividerBorderClass} flex flex-col md:flex-row justify-between items-start md:items-center gap-6`}>
            {/* Contact Details */}
            {footerConfig.showContactInfo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full md:w-auto">
                {footerConfig.contactPhone && (
                  <a 
                    href={`tel:${footerConfig.contactPhone}`}
                    aria-label={`تماس با شماره ${footerConfig.contactPhone}`}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-w-0"
                    style={{ borderColor: surfaceBorder, backgroundColor: surfaceBg }}
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs opacity-60">تلفن تماس پشتیبانی</span>
                      <span className="text-sm font-bold tracking-wider truncate" dir="ltr">{footerConfig.contactPhone}</span>
                    </div>
                  </a>
                )}

                {footerConfig.contactEmail && (
                  <a 
                    href={`mailto:${footerConfig.contactEmail}`}
                    aria-label={`ارسال ایمیل به ${footerConfig.contactEmail}`}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-w-0"
                    style={{ borderColor: surfaceBorder, backgroundColor: surfaceBg }}
                  >
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs opacity-60">پست الکترونیک</span>
                      <span className="text-sm font-semibold truncate" dir="ltr">{footerConfig.contactEmail}</span>
                    </div>
                  </a>
                )}

                {footerConfig.contactAddress && (
                  <div 
                    className="flex items-center gap-3 p-3 rounded-xl border sm:col-span-2 lg:col-span-1 min-w-0"
                    style={{ borderColor: surfaceBorder, backgroundColor: surfaceBg }}
                  >
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs opacity-60">آدرس فروشگاه</span>
                      <span className="text-xs font-medium line-clamp-1">{footerConfig.contactAddress}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trust Badges / Certificates */}
            {footerConfig.badges && footerConfig.badges.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
                {footerConfig.badges.map((badge) => {
                  if (!badge.enabled) return null;
                  const BadgeContent = (
                    <div 
                      className="p-2 rounded-xl border bg-white flex items-center justify-center h-16 w-16 shrink-0 hover:shadow-md transition-all duration-200"
                      style={{ borderColor: surfaceBorder }}
                    >
                      <img 
                        src={badge.imageUrl} 
                        alt={badge.title} 
                        className="h-full w-full object-contain"
                        title={badge.title}
                      />
                    </div>
                  );

                  return badge.linkUrl ? (
                    <a 
                      key={badge.id} 
                      href={badge.linkUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      aria-label={badge.title}
                      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {BadgeContent}
                    </a>
                  ) : (
                    <div key={badge.id}>
                      {BadgeContent}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bottom Section: Copyright */}
        <div className={`pt-6 ${dividerBorderClass} flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-xs opacity-75`}>
          <p className="text-center sm:text-right text-balance">
            {footerConfig.copyrightText}
          </p>
          <p className="text-center sm:text-left shrink-0">
            قدرت گرفته از <span className="font-bold text-primary">شاپ بیلدر</span>
          </p>
        </div>
      </div>

      {/* Custom HTML/JS Injection (e.g. scripts or widgets) — populated & scripts executed via effect */}
      <div ref={customHtmlRef} />
    </footer>
  );
}
