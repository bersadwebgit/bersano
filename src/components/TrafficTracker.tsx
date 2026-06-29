'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TrafficTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Skip tracking in admin and super-admin pages
    if (pathname.startsWith('/admin') || pathname.startsWith('/super-admin') || pathname.startsWith('/api')) {
      return;
    }

    // Generate or retrieve a persistent visitor ID (to identify unique visitors)
    let visitorId = localStorage.getItem('shop_visitor_id');
    if (!visitorId) {
      visitorId = 'vis_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('shop_visitor_id', visitorId);
    }

    const trackVisit = async () => {
      try {
        await fetch('/api/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: window.location.href,
            referrer: document.referrer || '',
            visitorId,
          }),
        });
      } catch (error) {
        console.error('Error sending traffic log:', error);
      }
    };

    // Use a small timeout to let the page settle and ensure document.referrer is correctly populated
    const timer = setTimeout(trackVisit, 500);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
