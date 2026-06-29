import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import Script from "next/script";
import TrafficTracker from "@/components/TrafficTracker";
import { getTenantShop } from "@/lib/tenant";
import ChatWidget from "@/components/chat/ChatWidget";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getTenantShop(undefined, true);
  if (!shop) {
    return {
      title: "شاپ بیلدر | پلتفرم فروشگاه‌ساز ابری و هوشمند",
      description: "فروشگاه اینترنتی خود را در کمتر از ۶۰ ثانیه به صورت کاملاً رایگان و آنی بسازید و از همین امروز فروش خود را آغاز کنید.",
    };
  }

  return {
    title: shop.shopName || "فروشگاه من",
    description: shop.description || "پلتفرم فروشگاهی چند مستاجره",
    icons: shop.faviconUrl ? {
      icon: shop.faviconUrl,
      shortcut: shop.faviconUrl,
      apple: shop.faviconUrl,
    } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shop = await getTenantShop(undefined, true);
  const themeColor = shop?.themeColor || '#2563eb';
  const gaId = (shop as any)?.googleAnalyticsId;
  const gtmId = (shop as any)?.googleTagManagerId;
  const clarityId = (shop as any)?.microsoftClarityId;

  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} h-full antialiased`}
      suppressHydrationWarning
      style={{
        '--primary': themeColor,
      } as React.CSSProperties}
    >
      <head>
        {shop?.customDomain && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var currentHost = window.location.host;
                    var customDomain = "${shop.customDomain}";
                    var cleanCurrentHost = currentHost.split(':')[0].toLowerCase();
                    var cleanCustomDomain = customDomain.split(':')[0].toLowerCase();
                    var pathname = window.location.pathname;
                    
                    if (cleanCurrentHost !== cleanCustomDomain && !pathname.startsWith('/admin') && !pathname.startsWith('/super-admin') && !pathname.startsWith('/api')) {
                      var isLocal = cleanCurrentHost.endsWith('localhost') || cleanCurrentHost.endsWith('local');
                      var targetProtocol = isLocal ? window.location.protocol : 'https:';
                      var targetHost = isLocal ? (cleanCustomDomain + ':' + (window.location.port || '3000')) : cleanCustomDomain;
                      window.location.replace(targetProtocol + '//' + targetHost + pathname + window.location.search);
                    }
                  } catch (e) {
                    console.error('Redirection error:', e);
                  }
                })();
              `
            }}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}

        {/* Google Tag Manager (script) */}
        {gtmId && (
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `}
          </Script>
        )}

        {/* Microsoft Clarity Script */}
        {clarityId && (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityId}");
            `}
          </Script>
        )}

        {/* Google Analytics 4 */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
        <Suspense fallback={null}>
          <TrafficTracker />
        </Suspense>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
