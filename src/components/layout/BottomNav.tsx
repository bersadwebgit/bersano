'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useEffect, useState } from 'react';
import { 
  Home, 
  Grid, 
  ShoppingCart, 
  User, 
  Search, 
  Heart, 
  Plus, 
  Flame, 
  Sparkles, 
  Menu,
  Tag,
  Percent,
  Bell,
  MessageSquare,
  Store,
  Settings,
  Bookmark,
  Compass,
  MapPin,
  Gift,
  HelpCircle,
  Phone,
  Info
} from 'lucide-react';

const IconMap: Record<string, React.ComponentType<any>> = {
  Home,
  Grid,
  ShoppingCart,
  User,
  Search,
  Heart,
  Plus,
  Flame,
  Sparkles,
  Menu,
  Tag,
  Percent,
  Bell,
  MessageSquare,
  Store,
  Settings,
  Bookmark,
  Compass,
  MapPin,
  Gift,
  HelpCircle,
  Phone,
  Info
};

function DynamicIcon({ name, className, size = 20 }: { name: string; className?: string; size?: number }) {
  const IconComponent = IconMap[name] || Home;
  return <IconComponent className={className} size={size} />;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  link: string;
  visible: boolean;
  activeColor?: string;
  inactiveColor?: string;
  order: number;
  isSpecial?: boolean;
}

interface BottomNavConfig {
  enabled: boolean;
  appearance: {
    backgroundColor: string;
    iconColor: string;
    activeIconColor: string;
    showLabels: boolean;
    activeStyle: 'color' | 'underline' | 'circle' | 'background';
  };
  behavior: {
    showOnAllPages: boolean;
    autoHideOnScroll: boolean;
    sticky: boolean;
  };
  badge: {
    showCount: boolean;
    showTotalPrice: boolean;
    badgeColor: string;
    animate: boolean;
  };
  specialButton: {
    enabled: boolean;
    icon: string;
    color: string;
    link: string;
    label: string;
  };
  excludedPages: string[];
  items: NavItem[];
}

const DEFAULT_CONFIG: BottomNavConfig = {
  enabled: true,
  appearance: {
    backgroundColor: '#ffffff',
    iconColor: '#6b7280',
    activeIconColor: 'var(--primary)',
    showLabels: true,
    activeStyle: 'color'
  },
  behavior: {
    showOnAllPages: true,
    autoHideOnScroll: false,
    sticky: true
  },
  badge: {
    showCount: true,
    showTotalPrice: false,
    badgeColor: '#ef4444',
    animate: true
  },
  specialButton: {
    enabled: false,
    icon: 'Plus',
    color: 'var(--primary)',
    link: '/special-deals',
    label: 'ویژه'
  },
  excludedPages: ['/checkout', '/payment', '/login', '/register'],
  items: [
    { id: 'home', label: 'خانه', icon: 'Home', link: '/', visible: true, activeColor: 'var(--primary)', inactiveColor: '#6b7280', order: 0 },
    { id: 'categories', label: 'دسته‌بندی‌ها', icon: 'Grid', link: '/categories', visible: true, activeColor: 'var(--primary)', inactiveColor: '#6b7280', order: 1 },
    { id: 'cart', label: 'سبد خرید', icon: 'ShoppingCart', link: '/cart', visible: true, activeColor: 'var(--primary)', inactiveColor: '#6b7280', order: 2 },
    { id: 'profile', label: 'پروفایل', icon: 'User', link: '/profile', visible: true, activeColor: 'var(--primary)', inactiveColor: '#6b7280', order: 3 },
    { id: 'search', label: 'جستجو', icon: 'Search', link: '/search', visible: true, activeColor: 'var(--primary)', inactiveColor: '#6b7280', order: 4 }
  ]
};

export default function BottomNav() {
  const pathname = usePathname();
  const items = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => (state as any).total || 0);
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<BottomNavConfig>(DEFAULT_CONFIG);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [animateBadge, setAnimateBadge] = useState(false);

  const cartItemCount = items.filter(i => i.stockStatus !== 'out_of_stock').reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    setMounted(true);
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.bottomNavConfig) {
          try {
            const parsed = JSON.parse(data.settings.bottomNavConfig);
            // Merge with default config to ensure all fields are present
            setConfig({
              ...DEFAULT_CONFIG,
              ...parsed,
              appearance: { ...DEFAULT_CONFIG.appearance, ...parsed.appearance },
              behavior: { ...DEFAULT_CONFIG.behavior, ...parsed.behavior },
              badge: { ...DEFAULT_CONFIG.badge, ...parsed.badge },
              specialButton: { ...DEFAULT_CONFIG.specialButton, ...parsed.specialButton },
              items: parsed.items ? parsed.items : DEFAULT_CONFIG.items
            });
          } catch (e) {
            console.error('Error parsing bottomNavConfig', e);
          }
        }
      })
      .catch(err => console.error('Error fetching public settings', err));
  }, []);

  // Ensure menu is visible when pathname changes (e.g. navigating back/forward)
  useEffect(() => {
    setIsVisible(true);
  }, [pathname]);

  // Handle badge animation when cart count changes
  useEffect(() => {
    if (cartItemCount > 0 && config.badge.animate) {
      setAnimateBadge(true);
      const timer = setTimeout(() => setAnimateBadge(false), 300);
      return () => clearTimeout(timer);
    }
  }, [cartItemCount, config.badge.animate]);

  // Handle scroll auto-hide behavior
  useEffect(() => {
    if (!config.behavior.autoHideOnScroll) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false); // scrolling down
      } else {
        setIsVisible(true); // scrolling up
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, config.behavior.autoHideOnScroll]);

  if (!mounted || !config.enabled) return null;

  // Check if current page is excluded
  const isExcluded = config.excludedPages?.some((page) => {
    if (page === '/') return pathname === '/';
    return pathname.startsWith(page);
  }) || false;

  if (isExcluded) return null;

  // Filter and sort items
  const activeItems = [...config.items]
    .filter(item => item.visible)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // If one of the items is marked as special, place it in the middle of active items
  const specialItemIndex = activeItems.findIndex(item => item.isSpecial);
  if (specialItemIndex !== -1) {
    const specialItem = activeItems[specialItemIndex];
    activeItems.splice(specialItemIndex, 1); // remove from current position
    const middleIndex = Math.floor(activeItems.length / 2);
    activeItems.splice(middleIndex, 0, specialItem); // insert in the middle
  }

  return (
    <>
      <style>{`
        .glow-menu-container {
          perspective: 600px;
        }
        .glow-menu-card {
          transform-style: preserve-3d;
          width: 100%;
          height: 1.8rem;
          position: relative;
        }
        .glow-menu-card-front {
          transform: rotateX(0deg);
          backface-visibility: hidden;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .glow-menu-card-back {
          position: absolute;
          inset: 0;
          transform: rotateX(90deg);
          backface-visibility: hidden;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          opacity: 0;
        }
        .glow-menu-item:hover .glow-menu-card-front {
          transform: rotateX(-90deg);
          opacity: 0;
        }
        .glow-menu-item:hover .glow-menu-card-back {
          transform: rotateX(0deg);
          opacity: 1;
        }
        .glow-menu-item {
          color: var(--inactive-color);
          transition: color 0.3s ease;
        }
        .glow-menu-item.active,
        .glow-menu-item:hover {
          color: var(--active-color) !important;
        }
        .glow-menu-item .glow-bg {
          position: absolute;
          inset: -2px -4px;
          z-index: 0;
          pointer-events: none;
          opacity: 0;
          transform: scale(0.85);
          transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 12px;
        }
        .glow-menu-item.active .glow-bg,
        .glow-menu-item:hover .glow-bg {
          opacity: 1;
          transform: scale(1.15);
        }
      `}</style>

      <nav 
        style={{ 
          backgroundColor: config.appearance.backgroundColor.includes('rgba') 
            ? config.appearance.backgroundColor 
            : `${config.appearance.backgroundColor}cc`, // Add slight transparency for backdrop-blur
          transform: isVisible 
            ? 'translate(-50%, 0)' 
            : 'translate(-50%, calc(100% + 24px))',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease',
          position: config.behavior.sticky ? 'fixed' : 'absolute',
          left: '50%',
          right: 'auto'
        }}
        className="fixed bottom-4 w-[calc(100%-2rem)] max-w-md p-1.5 pb-2 rounded-2xl border border-gray-200/40 dark:border-gray-800/40 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] backdrop-blur-md flex justify-around items-center z-40 lg:hidden group overflow-hidden"
      >
        {/* Background Radial Glow of the whole navigation bar on hover */}
        <div
          className="absolute -inset-4 pointer-events-none rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out z-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, rgba(147,51,234,0.06) 35%, rgba(239,68,68,0.06) 70%, transparent 100%)',
            backgroundSize: '150% 150%',
            backgroundPosition: 'center',
          }}
        />

        <ul className="flex items-center gap-1.5 relative z-10 w-full justify-around p-0 m-0 list-none">
          {activeItems.map((item) => {
            const isActive = pathname === item.link;
            const activeColor = item.activeColor || config.appearance.activeIconColor;
            const inactiveColor = item.inactiveColor || config.appearance.iconColor;

            // Compute radial gradient glow for item based on activeColor
            const gradient = `radial-gradient(circle, color-mix(in srgb, ${activeColor} 18%, transparent) 0%, color-mix(in srgb, ${activeColor} 4%, transparent) 60%, transparent 100%)`;

            // Special Central Button styling
            if (item.isSpecial) {
              const specialColor = item.activeColor || config.appearance.activeIconColor;
              return (
                <li key={item.id} className="relative list-none p-0 m-0">
                  <Link 
                    href={item.link}
                    className="flex flex-col items-center -translate-y-3 relative group/special"
                  >
                    <div 
                      style={{ backgroundColor: specialColor }}
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform duration-150 border-4 border-white dark:border-gray-900"
                    >
                      <DynamicIcon name={item.icon} size={20} />
                    </div>
                    {config.appearance.showLabels && (
                      <span 
                        style={{ color: specialColor }}
                        className="text-[9px] font-black mt-0.5 absolute -bottom-4 whitespace-nowrap"
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            }

            return (
              <li key={item.id} className="flex-1 max-w-[80px] list-none p-0 m-0">
                <Link 
                  href={item.link}
                  style={{ 
                    '--active-color': activeColor, 
                    '--inactive-color': inactiveColor 
                  } as React.CSSProperties}
                  className={`glow-menu-item block w-full text-center ${isActive ? 'active' : ''}`}
                >
                  <div className="glow-menu-container rounded-xl overflow-visible relative py-1.5 px-2 flex items-center justify-center">
                    {/* Individual Item Background Glow */}
                    <div 
                      className="glow-bg"
                      style={{ background: gradient }}
                    />

                    {/* 3D Flipping Card */}
                    <div className="glow-menu-card">
                      
                      {/* Front Side */}
                      <div className="glow-menu-card-front">
                        <div className="relative flex items-center justify-center">
                          <DynamicIcon name={item.icon} size={18} />
                          
                          {/* Badge support for Cart item */}
                          {item.id === 'cart' && cartItemCount > 0 && (
                            <span 
                              style={{ 
                                backgroundColor: config.badge.badgeColor,
                                transform: animateBadge ? 'scale(1.2)' : 'scale(1)',
                                transition: 'transform 0.15s ease-out'
                              }}
                              className="absolute -top-1.5 -right-2 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[14px] text-center shadow-sm z-20"
                            >
                              {cartItemCount}
                            </span>
                          )}
                        </div>
                        {config.appearance.showLabels && (
                          <span className="text-[9px] font-bold tracking-tight mt-0.5 whitespace-nowrap">{item.label}</span>
                        )}
                      </div>

                      {/* Back Side (identical to front for transition/flip effect) */}
                      <div className="glow-menu-card-back">
                        <div className="relative flex items-center justify-center">
                          <DynamicIcon name={item.icon} size={18} />
                          
                          {/* Badge support for Cart item (copied on back) */}
                          {item.id === 'cart' && cartItemCount > 0 && (
                            <span 
                              style={{ 
                                backgroundColor: config.badge.badgeColor,
                                transform: animateBadge ? 'scale(1.2)' : 'scale(1)',
                                transition: 'transform 0.15s ease-out'
                              }}
                              className="absolute -top-1.5 -right-2 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[14px] text-center shadow-sm z-20"
                            >
                              {cartItemCount}
                            </span>
                          )}
                        </div>
                        {config.appearance.showLabels && (
                          <span className="text-[9px] font-bold tracking-tight mt-0.5 whitespace-nowrap">{item.label}</span>
                        )}
                      </div>

                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
