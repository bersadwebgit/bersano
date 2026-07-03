'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  Package, 
  Settings, 
  Menu, 
  X,
  Store,
  Users,
  User,
  Tags,
  MessageSquare,
  BookOpen,
  ShoppingCart,
  Pin,
  PinOff,
  HeadphonesIcon,
  Home,
  Sun,
  Moon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Bell,
  Search,
  LogOut,
  Info,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  UserCog,
  Calculator,
  Globe
} from 'lucide-react';
import { canAccessAdminPage, ADMIN_ROLE_LABELS, type AdminRole } from '@/lib/admin-roles';
import SetupWizard from '@/components/admin/SetupWizard';
import DottedSurface from '@/components/DottedSurface';

function AnimatedBadge({ count }: { count: number }) {
  const [prevCount, setPrevCount] = useState(count);
  const [isPop, setIsPop] = useState(false);

  useEffect(() => {
    if (count > prevCount) {
      setIsPop(true);
      const timer = setTimeout(() => setIsPop(false), 1000);
      return () => clearTimeout(timer);
    }
    setPrevCount(count);
  }, [count, prevCount]);

  const formatNum = (num: number) => {
    return num.toLocaleString('fa-IR');
  };

  const hasBadge = count > 0;

  return (
    <div 
      className={`
        flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${hasBadge ? 'w-auto opacity-100 scale-100 ml-1.5' : 'w-0 opacity-0 scale-0 ml-0 pointer-events-none'}
      `}
    >
      <span 
        className={`
          relative flex items-center justify-center
          bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full
          shadow-[0_2px_8px_rgba(239,68,68,0.35)] dark:shadow-[0_2px_10px_rgba(239,68,68,0.5)]
          transition-all duration-300
          ${isPop ? 'scale-125 ring-4 ring-red-500/30' : 'scale-100'}
        `}
      >
        {/* Ping effect on pop */}
        {isPop && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
        )}
        
        {/* Soft pulse ring for continuous attention, but very subtle */}
        {hasBadge && !isPop && (
          <span className="absolute -inset-0.5 rounded-full bg-red-500/20 animate-pulse -z-10" />
        )}

        <span className="relative z-10 select-none">{formatNum(count)}</span>
      </span>
    </div>
  );
}

function AnimatedNotificationDot({ count }: { count: number }) {
  const [prevCount, setPrevCount] = useState(count);
  const [isPop, setIsPop] = useState(false);

  useEffect(() => {
    if (count > prevCount) {
      setIsPop(true);
      const timer = setTimeout(() => setIsPop(false), 1000);
      return () => clearTimeout(timer);
    }
    setPrevCount(count);
  }, [count, prevCount]);

  if (count <= 0) return null;

  return (
    <span className="absolute top-1.5 right-1.5 z-10 flex h-2.5 w-2.5">
      {isPop && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      )}
      <span className={`
        relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white dark:border-slate-900 transition-all duration-300
        ${isPop ? 'scale-125' : 'scale-100'}
      `}></span>
    </span>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapse, setSidebarCollapse] = useState<'expanded' | 'collapsed'>('expanded');
  const [sidebarMode, setSidebarMode] = useState<'simple' | 'advanced'>('simple');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<{
    name?: string;
    avatarUrl?: string;
    shopName?: string;
    logoUrl?: string;
    subdomain?: string;
    customDomain?: string;
    productType?: string;
    email?: string;
    phone?: string;
    role?: AdminRole;
    isApproved?: boolean;
    isActive?: boolean;
    hasDemoData?: boolean;
    setupWizardCompleted?: boolean;
    activePackage?: { id: string; name: string; features: string } | null;
    mahakEnabled?: boolean;
  } | null>(null);

  const [clearingDemoData, setClearingDemoData] = useState(false);
  
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  interface CustomToast {
    id: string;
    title: string;
    message: string;
    type: 'order' | 'ticket' | 'info';
    orderId?: string;
    amount?: number;
    customerName?: string;
  }
  const [toasts, setToasts] = useState<CustomToast[]>([]);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = audioContext.currentTime;
      playTone(659.25, now, 0.4, 0.05);
      playTone(880.00, now + 0.08, 0.5, 0.05);
    } catch (e) {
      console.log('Web Audio play failed:', e);
    }
  };

  const showToast = (toast: Omit<CustomToast, 'id'>) => {
    const id = Math.random().toString();
    const newToast = { ...toast, id };
    setToasts(current => [...current, newToast]);
    setTimeout(() => {
      setToasts(current => current.filter(t => t.id !== id));
    }, 10000);
  };
  
  const pathname = usePathname();

  const formatNum = (num: number) => {
    return num.toLocaleString('fa-IR');
  };

  const [pinnedItems, setPinnedItems] = useState<string[]>([]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    general: true,
    store: true,
    design: false,
    blog: false,
    support: false,
    settings: false,
    'system-support': false,
  });
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    'مدیریت محصولات': true,
    'سفارشات و دانلودها': true,
    'باشگاه مشتریان (کاربران)': true,
  });

  useEffect(() => {
    const savedMode = localStorage.getItem('admin_sidebar_menu_mode') as 'simple' | 'advanced';
    if (savedMode) {
      setSidebarMode(savedMode);
    } else {
      setSidebarMode('simple');
    }

    const savedCollapse = localStorage.getItem('admin_sidebar_mode') as 'expanded' | 'collapsed';
    if (savedCollapse === 'collapsed' || savedCollapse === 'expanded') {
      setSidebarCollapse(savedCollapse);
    }
  }, []);

  const toggleCollapse = () => {
    const nextCollapse = sidebarCollapse === 'expanded' ? 'collapsed' : 'expanded';
    setSidebarCollapse(nextCollapse);
    localStorage.setItem('admin_sidebar_mode', nextCollapse);
  };

  const toggleSidebarMode = () => {
    const nextMode = sidebarMode === 'simple' ? 'advanced' : 'simple';
    setSidebarMode(nextMode);
    localStorage.setItem('admin_sidebar_menu_mode', nextMode);
  };

  useEffect(() => {
    // Load pinned items from local storage
    const savedPinnedItems = localStorage.getItem('admin-pinned-menu-items');
    if (savedPinnedItems) {
      try {
        setPinnedItems(JSON.parse(savedPinnedItems));
      } catch (e) {
        console.error('Failed to parse pinned items', e);
      }
    }
  }, []);

  useEffect(() => {
    // Load open categories from local storage
    const savedOpenCategories = localStorage.getItem('admin-open-categories');
    if (savedOpenCategories) {
      try {
        const parsed = JSON.parse(savedOpenCategories);
        setOpenCategories(prev => ({
          ...prev,
          ...parsed
        }));
      } catch (e) {
        console.error('Failed to parse open categories', e);
      }
    }
  }, []);

  useEffect(() => {
    // Load open submenus from local storage
    const savedOpenSubMenus = localStorage.getItem('admin-open-submenus');
    if (savedOpenSubMenus) {
      try {
        const parsed = JSON.parse(savedOpenSubMenus);
        setOpenSubMenus(prev => ({
          ...prev,
          ...parsed
        }));
      } catch (e) {
        console.error('Failed to parse open submenus', e);
      }
    }
  }, []);

  const toggleCategory = (categoryKey: string) => {
    setOpenCategories(prev => {
      const next = { ...prev, [categoryKey]: !prev[categoryKey] };
      localStorage.setItem('admin-open-categories', JSON.stringify(next));
      return next;
    });
  };

  const toggleSubMenu = (menuName: string) => {
    setOpenSubMenus(prev => {
      const next = { ...prev, [menuName]: !prev[menuName] };
      localStorage.setItem('admin-open-submenus', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    // Initialize dark mode from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const togglePin = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setPinnedItems(prev => {
      const newPinnedItems = prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href];
        
      localStorage.setItem('admin-pinned-menu-items', JSON.stringify(newPinnedItems));
      return newPinnedItems;
    });
  };

  const fetchCounts = async () => {
    try {
      const res = await fetch('/api/admin/counts');
      if (!res.ok) return;
      const data = await res.json();
      
      const { pendingOrdersCount: newPendingOrders, newTicketsCount: newTickets, unreadChatsCount: newUnreadChats } = data;

      // Handle pending orders change
      if (newPendingOrders !== undefined) {
        setPendingOrdersCount(prev => {
          if (newPendingOrders > prev && prev !== 0) {
            playNotificationSound();
            // Fetch the details of the latest order to show in toast
            fetch('/api/admin/orders?status=pending&limit=1')
              .then(r => r.json())
              .then(orderData => {
                const latestOrder = orderData.orders?.[0];
                const orderId = latestOrder?.id ? latestOrder.id.slice(-8).toUpperCase() : '';
                const customerName = latestOrder?.user?.name || 'مشتری جدید';
                const amount = latestOrder?.finalAmount;
                
                if (Notification.permission === 'granted') {
                  new Notification('سفارش جدید پرداختی', {
                    body: `سفارشی به مبلغ ${amount ? amount.toLocaleString('fa-IR') : '---'} تومان توسط ${customerName} ثبت شد.`,
                    icon: '/favicon.ico'
                  });
                }
                
                showToast({
                  title: 'سفارش جدید ثبت شد! 🎉',
                  message: `سفارشی به مبلغ ${amount ? amount.toLocaleString('fa-IR') : '---'} تومان توسط ${customerName} ثبت شد. ${orderId ? `(کد: ${orderId})` : ''}`,
                  type: 'order'
                });
              })
              .catch(console.error);
          }
          return newPendingOrders;
        });
      }

      // Handle new tickets change
      if (newTickets !== undefined) {
        setNewTicketsCount(prev => {
          if (newTickets > prev && prev !== 0) {
            playNotificationSound();
            // Fetch the details of the latest ticket to show in toast
            fetch('/api/admin/tickets?status=new&limit=1')
              .then(r => r.json())
              .then(ticketData => {
                const latestTicket = ticketData.tickets?.[0];
                const subject = latestTicket?.subject || 'بدون موضوع';
                const customerName = latestTicket?.user?.name || 'کاربر پشتیبانی';
                
                if (Notification.permission === 'granted') {
                  new Notification('تیکت پشتیبانی جدید', {
                    body: `تیکت جدید با موضوع "${subject}" از طرف ${customerName} ارسال شد.`,
                    icon: '/favicon.ico'
                  });
                }
                
                showToast({
                  title: 'تیکت پشتیبانی جدید 🎧',
                  message: `تیکت جدید با موضوع "${subject}" از طرف ${customerName} ارسال شد.`,
                  type: 'ticket'
                });
              })
              .catch(console.error);
          }
          return newTickets;
        });
      }

      // Handle unread chats change
      if (newUnreadChats !== undefined) {
        setUnreadChatsCount(prev => {
          if (newUnreadChats > prev && prev !== 0) {
            playNotificationSound();
            if (Notification.permission === 'granted') {
              new Notification('پیام چت جدید', {
                body: 'یک پیام جدید در چت آنلاین دریافت شد.',
                icon: '/favicon.ico'
              });
            }
            showToast({
              title: 'پیام چت جدید 💬',
              message: 'یک پیام جدید در چت آنلاین از طرف کاربران دریافت شد.',
              type: 'info'
            });
          }
          return newUnreadChats;
        });
      }
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (pathname !== '/admin/login') {
      fetch('/api/admin/profile')
        .then(res => {
          if (res.status === 401) {
            window.location.href = '/admin/login';
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (data && data.user) {
            setProfile({
              name: data.user.name,
              avatarUrl: data.user.avatarUrl,
              shopName: data.shopName,
              logoUrl: data.logoUrl,
              subdomain: data.subdomain,
              customDomain: data.customDomain,
              productType: data.productType,
              email: data.user.email,
              phone: data.user.phone,
              role: data.user.role,
              isApproved: data.isApproved,
              isActive: data.isActive,
              hasDemoData: data.hasDemoData,
              setupWizardCompleted: data.setupWizardCompleted,
              activePackage: data.activePackage,
              mahakEnabled: data.mahakEnabled,
            });
            if (data.user.role === 'admin' || data.user.role === 'sales_manager' || data.user.role === 'sales_product_manager') {
              fetchCounts();
            }
          }
        })
        .catch(console.error);

    }
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    if (profile?.role !== 'admin' && profile?.role !== 'sales_manager' && profile?.role !== 'sales_product_manager') return;
    const intervalId = setInterval(fetchCounts, 10000);
    return () => clearInterval(intervalId);
  }, [pathname, profile?.role]);

  const handleClearDemoData = async () => {
    if (confirm('آیا از حذف تمامی اطلاعات تستی اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
      setClearingDemoData(true);
      try {
        const res = await fetch('/api/admin/clear-demo-data', {
          method: 'POST'
        });
        const data = await res.json();
        if (res.ok) {
          setProfile(prev => prev ? { ...prev, hasDemoData: false } : null);
          alert('اطلاعات تستی با موفقیت حذف شدند.');
          window.location.reload();
        } else {
          alert(data.error || 'خطایی در حذف اطلاعات تستی رخ داد.');
        }
      } catch (err) {
        console.error(err);
        alert('خطای شبکه در ارتباط با سرور.');
      } finally {
        setClearingDemoData(false);
      }
    }
  };

  const isFeatureEnabled = (featureKey: string): boolean => {
    if (!profile) return true; // Let it load
    if (!profile.activePackage) {
      // Default fallback for shops without any package assigned
      if (featureKey === 'physicalProducts') return true;
      return false;
    }
    try {
      const features = JSON.parse(profile.activePackage.features);
      return !!features[featureKey];
    } catch (e) {
      return false;
    }
  };

  const userRole = profile?.role || 'admin';

  const filterMenuByRole = (items: any[]): any[] => {
    return items
      .map((item) => {
        if (item.subItems) {
          const filteredSubs = item.subItems.filter((sub: { href: string }) => canAccessAdminPage(userRole, sub.href));
          if (filteredSubs.length === 0) return null;
          return { ...item, subItems: filteredSubs };
        }
        if (item.href && !canAccessAdminPage(userRole, item.href)) return null;
        return item;
      })
      .filter(Boolean);
  };

  const menuGroups = [
    {
      key: 'general',
      title: 'پیشخوان اصلی',
      items: [
        { name: 'داشبورد', href: '/admin/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      key: 'store',
      title: 'مدیریت فروشگاه و محصولات',
      items: [
        ...((isFeatureEnabled('physicalProducts') || isFeatureEnabled('digitalProducts')) ? [{
          name: 'مدیریت محصولات',
          icon: Package,
          subItems: [
            { name: 'لیست محصولات', href: '/admin/products' },
            { name: 'دسته‌بندی‌های کاتالوگ', href: '/admin/categories' },
            ...(isFeatureEnabled('productSets') ? [{ name: 'پکیج‌های تعاملی (شاپبل)', href: '/admin/shoppable', tooltip: 'برچسب‌گذاری کالاها روی تصاویر' }] : []),
            { name: 'گالری تصاویر (رسانه)', href: '/admin/media' },
          ]
        }] : []),
        {
          name: 'سفارشات و دانلودها',
          icon: ShoppingCart,
          badge: pendingOrdersCount,
          subItems: [
            { name: 'سفارشات فروشگاه', href: '/admin/orders', badge: pendingOrdersCount },
            ...(isFeatureEnabled('digitalProducts') && profile?.productType !== 'physical' ? [{ name: 'گزارش دانلود فایل‌ها', href: '/admin/downloads' }] : []),
          ]
        },
        { name: 'نظرات مشتریان', href: '/admin/reviews', icon: MessageSquare },
        ...(profile?.mahakEnabled ? [{
          name: 'حسابداری',
          icon: Calculator,
          subItems: [
            { name: 'سیستم حسابداری محک', href: '/admin/accounting/mahak' },
          ]
        }] : []),
      ]
    },
    {
      key: 'design',
      title: 'ظاهر و چیدمان سایت',
      items: [
        {
          name: 'طراحی پوسته',
          icon: Home,
          subItems: [
            { name: 'تنظیمات صفحه اصلی', href: '/admin/settings/custom-home' },
            { name: 'ویرایشگر درباره ما', href: '/admin/settings/about-us' },
            { name: 'ویرایشگر تماس با ما', href: '/admin/settings/contact-us' },
            { name: 'هدر و منوی ناوبری', href: '/admin/header' },
            { name: 'فوتر سایت', href: '/admin/footer' },
            { name: 'اسلایدر اصلی هوم‌پیج', href: '/admin/slider' },
          ]
        },
        {
          name: 'رسانه و تعامل',
          icon: ImageIcon,
          subItems: [
            { name: 'مدیریت استوری‌ها', href: '/admin/stories' },
          ]
        }
      ]
    },
    {
      key: 'blog',
      title: 'وبلاگ و مقالات',
      items: [
        {
          name: 'مدیریت وبلاگ',
          icon: BookOpen,
          subItems: [
            { name: 'نوشته‌های وبلاگ', href: '/admin/blog' },
            { name: 'دسته‌بندی‌های وبلاگ', href: '/admin/blog/categories' },
            { name: 'نظرات وبلاگ', href: '/admin/blog/comments' },
          ]
        }
      ]
    },
    {
      key: 'support',
      title: 'باشگاه مشتریان و پشتیبانی',
      items: [
        ...(isFeatureEnabled('onlineChatEnabled') ? [{ name: 'چت آنلاین (زنده)', href: '/admin/chat', icon: MessageSquare, badge: unreadChatsCount }] : []),
        { name: 'تیکت‌های مشتریان', href: '/admin/tickets', icon: HeadphonesIcon, badge: newTicketsCount },
        {
          name: 'باشگاه مشتریان (کاربران)',
          icon: Users,
          subItems: [
            ...(isFeatureEnabled('customerClub') ? [{ name: 'لیست مشتریان', href: '/admin/users' }] : []),
            { name: 'کدهای تخفیف', href: '/admin/discounts' },
          ]
        },
      ]
    },
    {
      key: 'settings',
      title: 'تنظیمات پایه سیستم',
      items: [
        { name: 'پروفایل مدیر', href: '/admin/profile', icon: User },
        ...(userRole === 'admin' && isFeatureEnabled('staffEnabled') ? [{ name: 'مدیریت همکاران', href: '/admin/staff', icon: UserCog }] : []),
        { name: 'تنظیمات عمومی فروشگاه', href: '/admin/settings', icon: Settings },
        { name: 'اتصال دامنه اختصاصی', href: '/admin/settings/domains', icon: Globe },
        { name: 'درون‌ریزی و برون‌بری داده‌ها', href: '/admin/import-export', icon: FileDown },
      ]
    },
    {
      key: 'system-support',
      title: 'ارتباط با مدیریت کل',
      items: [
        { name: 'تیکت به پشتیبانی کل', href: '/admin/system-tickets', icon: HeadphonesIcon, isSystem: true },
      ]
    }
  ].map((group) => ({
    ...group,
    items: filterMenuByRole(group.items),
  })).filter((group) => group.items.length > 0);

  const menuItems = menuGroups.reduce<any[]>((acc, group) => {
    const items = group.items.reduce<any[]>((iAcc, item) => {
      if (item.subItems) {
        return [...iAcc, ...item.subItems.map((sub: any) => ({ ...sub, icon: item.icon, isSystem: item.isSystem }))];
      }
      return [...iAcc, item];
    }, []);
    return [...acc, ...items];
  }, []);

  const isEssentialItem = (href: string): boolean => {
    return [
      '/admin/dashboard',
      '/admin/products',
      '/admin/categories',
      '/admin/media',
      '/admin/orders',
      '/admin/settings/custom-home',
      '/admin/slider',
      '/admin/settings',
      '/admin/settings/domains'
    ].includes(href);
  };

  let processedMenuGroups = menuGroups;

  if (sidebarMode === 'simple') {
    const essentialGroups: typeof menuGroups = [];
    const advancedItems: any[] = [];

    menuGroups.forEach(group => {
      const essentialItemsInGroup: any[] = [];

      group.items.forEach(item => {
        if (item.subItems) {
          const essentialSubs = item.subItems.filter((sub: any) => isEssentialItem(sub.href));
          const advancedSubs = item.subItems.filter((sub: any) => !isEssentialItem(sub.href));

          if (essentialSubs.length > 0) {
            essentialItemsInGroup.push({
              ...item,
              subItems: essentialSubs
            });
          }

          if (advancedSubs.length > 0) {
            advancedSubs.forEach((sub: any) => {
              advancedItems.push({
                name: sub.name,
                href: sub.href,
                icon: item.icon,
                tooltip: sub.tooltip,
                badge: sub.badge,
                isSystem: item.isSystem
              });
            });
          }
        } else {
          if (isEssentialItem(item.href || '')) {
            essentialItemsInGroup.push(item);
          } else {
            advancedItems.push({
              name: item.name,
              href: item.href,
              icon: item.icon,
              tooltip: item.tooltip,
              badge: item.badge,
              isSystem: item.isSystem
            });
          }
        }
      });

      if (essentialItemsInGroup.length > 0) {
        essentialGroups.push({
          ...group,
          items: essentialItemsInGroup
        });
      }
    });

    if (advancedItems.length > 0) {
      essentialGroups.push({
        key: 'advanced-features',
        title: 'امکانات پیشرفته',
        items: [
          {
            name: 'امکانات پیشرفته',
            icon: Settings,
            subItems: advancedItems
          }
        ]
      });
    }

    processedMenuGroups = essentialGroups;
  }

  const searchableCommands = [
    { name: 'داشبورد (خلاصه فروشگاه)', href: '/admin/dashboard', keywords: ['داشبورد', 'خانه', 'آمار', 'فروش', 'پیشخوان', 'dashboard', 'home', 'stats'] },
    { name: 'لیست محصولات', href: '/admin/products', keywords: ['محصول', 'کالا', 'انبار', 'موجودی', 'قیمت', 'product', 'items', 'stock', 'price'] },
    { name: 'افزودن محصول جدید', href: '/admin/products/new', keywords: ['افزودن محصول', 'محصول جدید', 'کالای جدید', 'ثبت کالا', 'add product', 'new product'] },
    { name: 'دسته‌بندی‌های کاتالوگ', href: '/admin/categories', keywords: ['دسته', 'گروه', 'دسته بندی', 'شاخه', 'category', 'categories', 'group'] },
    { name: 'سفارشات فروشگاه', href: '/admin/orders', keywords: ['سفارش', 'خرید', 'فاکتور', 'ارسال', 'پست', 'order', 'orders', 'invoice'] },
    { name: 'نظرات مشتریان', href: '/admin/reviews', keywords: ['نظر', 'دیدگاه', 'امتیاز', 'کامنت', 'review', 'reviews', 'comment'] },
    { name: 'تنظیمات صفحه اصلی', href: '/admin/settings/custom-home', keywords: ['صفحه اصلی', 'چیدمان', 'طراحی پوسته', 'لوگو', 'بنر', 'home settings', 'theme'] },
    { name: 'اسلایدر اصلی هوم‌پیج', href: '/admin/slider', keywords: ['اسلایدر', 'عکس متحرک', 'بنر متحرک', 'slider', 'hero slide'] },
    { name: 'مدیریت استوری‌ها', href: '/admin/stories', keywords: ['استوری', 'داستان', 'story', 'stories'] },
    { name: 'نوشته‌های وبلاگ', href: '/admin/blog', keywords: ['وبلاگ', 'مقاله', 'خبر', 'نوشته', 'blog', 'article', 'post'] },
    { name: 'تیکت‌های مشتریان', href: '/admin/tickets', keywords: ['پشتیبانی', 'تیکت', 'سوال', 'راهنمایی', 'ticket', 'support'] },
    { name: 'کدهای تخفیف', href: '/admin/discounts', keywords: ['تخفیف', 'کوپن', 'جشنواره', 'کد تخفیف', 'discount', 'coupon'] },
    { name: 'تنظیمات عمومی فروشگاه', href: '/admin/settings', keywords: ['تنظیمات', 'اطلاعات فروشگاه', 'تلفن', 'آدرس', 'پرداخت', 'درگاه', 'settings', 'general'] },
    { name: 'اتصال دامنه اختصاصی', href: '/admin/settings/domains', keywords: ['دامنه', 'ساب دامن', 'آدرس سایت', 'domain', 'dns', 'ssl'] },
    { name: 'درون‌ریزی و برون‌بری داده‌ها', href: '/admin/import-export', keywords: ['خروجی', 'اکسل', 'بکاپ', 'ورود اطلاعات', 'انتقال', 'import', 'export', 'excel'] },
    { name: 'دستیار هوشمند فروشگاه (ایجنت)', href: '/admin/agent', keywords: ['ایجنت', 'هوش مصنوعی', 'چت', 'دستیار', 'ai', 'agent', 'bot'] },
    { name: 'چت آنلاین (زنده)', href: '/admin/chat', keywords: ['چت', 'گفتگو', 'زنده', 'پیام', 'chat', 'live chat'] },
    { name: 'مدیریت همکاران', href: '/admin/staff', keywords: ['همکار', 'کاربر', 'دسترسی', 'نقش', 'staff', 'users', 'roles'] },
    { name: 'پروفایل مدیر', href: '/admin/profile', keywords: ['پروفایل', 'رمز عبور', 'عکس من', 'profile', 'password'] },
  ];

  const filteredCommands = searchableCommands.filter(cmd => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      cmd.name.toLowerCase().includes(query) ||
      cmd.keywords.some(kw => kw.toLowerCase().includes(query))
    );
  }).slice(0, 6);

  // Auto-open active category and submenu
  useEffect(() => {
    if (pathname !== '/admin/login') {
      const activeGroup = menuGroups.find(group => 
        group.items.some(item => {
          if (item.href) {
            return pathname === item.href || (pathname === '/admin' && item.href === '/admin/stories');
          }
          if (item.subItems) {
            return item.subItems.some((sub: any) => pathname === sub.href);
          }
          return false;
        })
      );
      
      if (activeGroup) {
        setOpenCategories(prev => {
          if (!prev[activeGroup.key]) {
            const next = { ...prev, [activeGroup.key]: true };
            localStorage.setItem('admin-open-categories', JSON.stringify(next));
            return next;
          }
          return prev;
        });

        const activeItemWithSub = activeGroup.items.find(item => 
          item.subItems && item.subItems.some((sub: any) => pathname === sub.href)
        );

        if (activeItemWithSub) {
          setOpenSubMenus(prev => {
            if (!prev[activeItemWithSub.name]) {
              const next = { ...prev, [activeItemWithSub.name]: true };
              localStorage.setItem('admin-open-submenus', JSON.stringify(next));
              return next;
            }
            return prev;
          });
        }
      }
    }
  }, [pathname, profile]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-container') && notificationDropdownOpen) {
        setNotificationDropdownOpen(false);
      }
      if (!target.closest('.profile-container') && profileDropdownOpen) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationDropdownOpen, profileDropdownOpen]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  const totalUrgentCount = pendingOrdersCount + newTicketsCount + unreadChatsCount;

  if (pathname === '/admin/agent') {
    return (
      <div className="h-screen max-h-screen bg-[#f8fafc] dark:bg-[#090d16] text-slate-800 dark:text-slate-100 font-sans flex flex-col relative overflow-hidden transition-colors duration-500" dir="rtl">
        {/* Animated 3D Dotted Surface Background */}
        <DottedSurface className="absolute inset-0" />

        {/* Slow-Moving Aurora Blobs */}
        <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-indigo-400/10 dark:bg-indigo-600/[0.04] rounded-full blur-[130px] pointer-events-none -z-10 animate-blob-1" />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-purple-400/10 dark:bg-purple-600/[0.04] rounded-full blur-[130px] pointer-events-none -z-10 animate-blob-2" />
        <div className="absolute top-[30%] right-[-5%] w-[400px] h-[400px] bg-teal-300/10 dark:bg-teal-600/[0.03] rounded-full blur-[120px] pointer-events-none -z-10 animate-blob-3" />
        <div className="absolute bottom-[20%] left-[-5%] w-[450px] h-[450px] bg-pink-300/10 dark:bg-pink-600/[0.03] rounded-full blur-[120px] pointer-events-none -z-10 animate-blob-4" />

        {/* Subtle Floating Particles */}
        <div className="absolute top-[20%] left-[15%] w-2 h-2 bg-indigo-400/25 dark:bg-indigo-500/15 rounded-full blur-[1px] pointer-events-none -z-10 animate-particle-1" />
        <div className="absolute bottom-[30%] right-[20%] w-3 h-3 bg-purple-400/20 dark:bg-purple-500/15 rounded-full blur-[1px] pointer-events-none -z-10 animate-particle-2" />
        <div className="absolute top-[60%] right-[12%] w-1.5 h-1.5 bg-pink-400/25 dark:bg-pink-500/15 rounded-full blur-[1px] pointer-events-none -z-10 animate-particle-3" />
        <div className="absolute bottom-[15%] left-[25%] w-2 h-2 bg-teal-400/25 dark:bg-teal-500/15 rounded-full blur-[1px] pointer-events-none -z-10 animate-particle-1" style={{ animationDelay: '-4s' }} />

        {/* Subtle Floating Shop Elements */}
        <div className="absolute top-[15%] right-[10%] text-indigo-500/10 dark:text-indigo-400/[0.04] pointer-events-none -z-10 animate-float-slow-1 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.15)]">
          <ShoppingCart size={40} strokeWidth={1} />
        </div>
        <div className="absolute bottom-[20%] left-[12%] text-purple-500/10 dark:text-purple-400/[0.04] pointer-events-none -z-10 animate-float-slow-2 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.15)]">
          <Package size={44} strokeWidth={1} />
        </div>
        <div className="absolute top-[65%] left-[8%] text-teal-500/10 dark:text-teal-400/[0.03] pointer-events-none -z-10 animate-float-slow-3 filter drop-shadow-[0_0_15px_rgba(20,184,166,0.15)]">
          <Store size={38} strokeWidth={1} />
        </div>
        <div className="absolute bottom-[45%] right-[15%] text-pink-500/10 dark:text-pink-400/[0.03] pointer-events-none -z-10 animate-float-slow-1 filter drop-shadow-[0_0_15px_rgba(236,72,153,0.15)]" style={{ animationDelay: '-6s' }}>
          <Tags size={42} strokeWidth={1} />
        </div>
        <div className="absolute top-[40%] left-[20%] text-amber-500/10 dark:text-amber-400/[0.03] pointer-events-none -z-10 animate-float-slow-2 filter drop-shadow-[0_0_15px_rgba(245,158,11,0.15)]" style={{ animationDelay: '-12s' }}>
          <Sparkles size={36} strokeWidth={1} />
        </div>

        {/* AI Tech Lights & Glowing Rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-indigo-500/[0.015] dark:border-indigo-500/[0.04] flex items-center justify-center pointer-events-none -z-10 animate-spin-slow">
          <div className="w-[360px] h-[360px] rounded-full border border-dashed border-purple-500/[0.01] dark:border-purple-500/[0.03]" />
          <div className="absolute w-2 h-2 bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full top-0 left-1/2 -translate-x-1/2 blur-[1px]" />
          <div className="absolute w-1.5 h-1.5 bg-purple-400/20 dark:bg-purple-500/10 rounded-full bottom-0 left-1/2 -translate-x-1/2 blur-[1px]" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-teal-500/[0.01] dark:border-teal-500/[0.02] flex items-center justify-center pointer-events-none -z-10 animate-spin-slow-reverse">
          <div className="absolute w-1.5 h-1.5 bg-teal-400/20 dark:bg-teal-500/10 rounded-full left-0 top-1/2 -translate-y-1/2 blur-[1px]" />
        </div>

        {/* Dynamic Laser Scanning Lines */}
        <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/10 dark:via-indigo-500/20 to-transparent pointer-events-none -z-10 animate-scan-line-1" />
        <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/5 dark:via-purple-500/15 to-transparent pointer-events-none -z-10 animate-scan-line-2" />

        {/* Minimal header is removed because it is now rendered inside the AgentPage component to allow dynamic sidebar toggling & chat history integration */}
        <main className="flex-1 w-full max-w-full mx-auto overflow-hidden flex flex-col min-h-0">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#1a222c] text-slate-800 dark:text-slate-300 font-sans flex print:block print:bg-white print:p-0" dir="rtl">
      
      {/* Sidebar - Floating Card Style */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen flex flex-col h-screen shrink-0 border-l border-slate-800/50 print:hidden
        ${sidebarCollapse === 'collapsed' ? 'lg:w-20' : 'lg:w-64'}
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between px-5 py-5 border-b border-slate-800/60 shrink-0 ${sidebarCollapse === 'collapsed' ? 'lg:px-3 lg:justify-center' : ''}`}>
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-black text-xl shadow-md text-white shrink-0 overflow-hidden">
              {profile?.logoUrl ? (
                <img 
                  src={profile.logoUrl} 
                  alt={profile?.shopName || 'Logo'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>B</span>
              )}
            </div>
            <div className={`flex flex-col transition-all duration-300 ${sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''}`}>
              <span className="text-base font-black tracking-wide text-white leading-tight">پنل مدیریت هسته</span>
              <span className="text-[9px] text-slate-400 font-bold">سازنده فروشگاه SaaS</span>
            </div>
          </Link>
          <div className={`flex items-center gap-2 ${sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''}`}>
            {profile?.subdomain && (
              <a 
                href={profile.customDomain ? `https://${profile.customDomain}` : (() => {
                  if (typeof window === 'undefined') return `http://${profile.subdomain}.localhost:3000`;
                  const host = window.location.host;
                  if (host.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
                    const port = window.location.port ? `:${window.location.port}` : '';
                    const cleanHost = window.location.hostname;
                    if (cleanHost === 'localhost' || cleanHost === '127.0.0.1') {
                      return `http://${profile.subdomain}.localhost${port}`;
                    }
                    return `http://${profile.subdomain}.${cleanHost}${port}`;
                  }
                  const parts = host.split('.');
                  if (parts.length >= 2) {
                    const baseDomain = parts.slice(-2).join('.');
                    return `https://${profile.subdomain}.${baseDomain}`;
                  }
                  return `https://${profile.subdomain}.${host}`;
                })()} 
                target="_blank" 
                rel="noreferrer"
                title="مشاهده فروشگاه"
                className="text-slate-400 hover:text-white transition-all p-2 rounded-xl hover:bg-slate-800 shrink-0"
              >
                <Store size={18} />
              </a>
            )}
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Sidebar Menu - Scrollable */}
        <nav className={`flex-1 p-3 space-y-3 custom-scrollbar ${
          sidebarCollapse === 'collapsed' ? 'lg:overflow-visible overflow-y-auto' : 'overflow-y-auto'
        }`}>
          <Link 
            href="/admin/agent"
            onClick={() => setIsMobileMenuOpen(false)}
            title="فعالسازی دستیار هوشمند فروشگاه"
            className={`group relative flex items-center mb-5 rounded-2xl text-white shadow-lg shadow-cyan-900/30 hover:shadow-cyan-500/40 transition-[transform,box-shadow,padding] duration-500 ease-out hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden shrink-0 bg-gradient-to-r from-cyan-500 via-blue-600 via-violet-600 to-fuchsia-600 animate-agent-aurora ${
              sidebarCollapse === 'collapsed' ? 'lg:px-2 lg:py-2 lg:justify-center lg:gap-0' : 'px-3.5 py-3 gap-3'
            }`}
          >
            <span className="pointer-events-none absolute -inset-y-8 -left-10 w-16 bg-white/30 blur-md rotate-12 -translate-x-full group-hover:translate-x-[22rem] transition-transform duration-[1000ms] ease-out" />
            <span className="pointer-events-none absolute inset-0 bg-white/0 group-hover:bg-white/[0.08] transition-colors duration-500" />

            <span className="relative z-10 flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 ring-1 ring-white/25 shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <Sparkles size={17} className="animate-pulse text-cyan-50" />
            </span>

            <span className={`relative z-10 flex flex-col min-w-0 text-right leading-tight transition-all duration-300 ${
              sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
            }`}>
              <span className="font-black text-[13px] truncate">فعال‌سازی حالت ایجنت</span>
              <span className="text-[10px] font-bold text-white/75 truncate">دستیار هوشمند فروشگاه</span>
            </span>

            <ChevronDown size={16} className={`relative z-10 mr-auto rotate-90 text-white/60 group-hover:text-white group-hover:-translate-x-1 transition-all duration-500 shrink-0 ${
              sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
            }`} />
          </Link>

          {/* Sidebar Mode Switcher */}
          <div className={`flex items-center justify-between bg-slate-800/40 border border-slate-800/60 p-2 rounded-2xl mb-5 select-none ${
            sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
          }`}>
            <span className="text-[10px] font-black text-slate-400 mr-2">حالت منو:</span>
            <div className="relative flex items-center bg-slate-950 rounded-xl p-1 w-32 h-8 border border-slate-800/50">
              {/* Sliding background indicator */}
              <div 
                className={`absolute top-1 bottom-1 w-[58px] bg-blue-600 rounded-lg transition-all duration-300 ease-out ${
                  sidebarMode === 'simple' ? 'right-1' : 'right-[64px]'
                }`}
              />
              
              {/* Simple Mode Button */}
              <div className="relative flex-1 h-full group">
                <button 
                  onClick={() => {
                    setSidebarMode('simple');
                    localStorage.setItem('admin_sidebar_menu_mode', 'simple');
                  }}
                  className={`relative z-10 w-full h-full text-center text-[10px] font-black transition-colors duration-200 border-none bg-transparent cursor-pointer ${
                    sidebarMode === 'simple' ? 'text-white' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  ساده
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 w-52 p-2.5 bg-slate-900/95 dark:bg-slate-950/95 border border-slate-800 text-white rounded-xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 text-right leading-relaxed">
                  <div className="font-black text-[10px] text-blue-400 mb-1">منوی ساده و خلوت</div>
                  <div className="text-[9px] font-bold text-slate-300">
                    فقط بخش‌های اصلی و روزمره: داشبورد، محصولات، سفارشات، تنظیمات اصلی و دامنه.
                  </div>
                </div>
              </div>

              {/* Professional Mode Button */}
              <div className="relative flex-1 h-full group">
                <button 
                  onClick={() => {
                    setSidebarMode('advanced');
                    localStorage.setItem('admin_sidebar_menu_mode', 'advanced');
                  }}
                  className={`relative z-10 w-full h-full text-center text-[10px] font-black transition-colors duration-200 border-none bg-transparent cursor-pointer ${
                    sidebarMode === 'advanced' ? 'text-white' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  حرفه‌ای
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 w-52 p-2.5 bg-slate-900/95 dark:bg-slate-950/95 border border-slate-800 text-white rounded-xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 text-right leading-relaxed">
                  <div className="font-black text-[10px] text-purple-400 mb-1">منوی کامل و پیشرفته</div>
                  <div className="text-[9px] font-bold text-slate-300">
                    نمایش تمام امکانات: وبلاگ، تیکت‌ها، تخفیف‌ها، استوری‌ها، چت آنلاین و ابزارها.
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Pinned Items */}
          {pinnedItems.length > 0 && (
            <div className={`space-y-1.5 bg-slate-800/20 rounded-2xl border border-slate-800/30 ${
              sidebarCollapse === 'collapsed' ? 'p-1 lg:bg-transparent lg:border-transparent' : 'p-2'
            }`}>
              <div className={`px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider ${
                sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
              }`}>دسترسی‌های سنجاق‌شده</div>
              <div className="space-y-1">
                {menuItems.filter(item => pinnedItems.includes(item.href)).map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link 
                      key={`pinned-${item.href}`} 
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      title={item.name}
                      className={`
                        group flex items-center rounded-xl transition-all duration-250 text-xs font-bold min-w-0
                        ${sidebarCollapse === 'collapsed' 
                          ? 'lg:px-0 lg:py-2.5 lg:justify-center' 
                          : 'justify-between px-4 py-2.5'}
                        ${item.isSystem
                          ? isActive
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20 font-black'
                            : 'text-indigo-400/90 hover:bg-indigo-950/40 hover:text-indigo-300 border border-indigo-500/15 bg-indigo-500/[0.04]'
                          : isActive 
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10 font-black' 
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                      `}
                    >
                      <div className={`flex items-center min-w-0 ${
                        sidebarCollapse === 'collapsed' ? 'lg:gap-0' : 'gap-3'
                      }`}>
                        <Icon size={17} className="shrink-0" />
                        <span className={`truncate transition-all duration-300 ${
                          sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
                        }`}>{item.name}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${
                        sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
                      }`}>
                        {item.badge !== undefined && (
                          <AnimatedBadge count={item.badge} />
                        )}
                        <button 
                          onClick={(e) => togglePin(item.href, e)}
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-blue-400 hover:text-blue-500 transition-opacity p-0.5"
                          title="برداشتن سنجاق"
                        >
                          <PinOff size={14} />
                        </button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsible Categories */}
          <div className="space-y-3 pt-1">
            {processedMenuGroups.map((group) => {
              // Map/filter group items to only include subItems that are not pinned
              const visibleItems = group.items.map(item => {
                if (item.subItems) {
                  const filteredSubItems = item.subItems.filter((sub: any) => !pinnedItems.includes(sub.href));
                  if (filteredSubItems.length === 0) return null; // All sub-items pinned, don't show the parent either!
                  return { ...item, subItems: filteredSubItems };
                }
                if (pinnedItems.includes(item.href || '')) return null;
                return item;
              }).filter((item): item is any => item !== null);

              if (visibleItems.length === 0) return null;
              
              const isOpen = openCategories[group.key] ?? true;
              
              return (
                <div key={group.key} className="space-y-1">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(group.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-[10px] font-black text-slate-500 hover:text-slate-300 bg-slate-800/10 hover:bg-slate-800/30 rounded-xl transition-all duration-200 uppercase tracking-wider min-w-0 ${
                      sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${group.key === 'system-support' ? 'bg-indigo-500/70' : 'bg-blue-500/70'}`} />
                      <span className="truncate">{group.title}</span>
                    </span>
                    <ChevronDown size={12} className={`transform transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90 rtl:rotate-90'} text-slate-500 shrink-0`} />
                  </button>
                  
                  {/* Category Items */}
                  <div className={`space-y-1 transition-all duration-200 overflow-hidden ${
                    sidebarCollapse === 'collapsed'
                      ? 'lg:max-h-[1000px] lg:opacity-100 lg:pointer-events-auto lg:py-1'
                      : ''
                  } ${isOpen ? 'max-h-[1000px] opacity-100 py-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    {visibleItems.map((item) => {
                      const isSubOpen = openSubMenus[item.name] ?? false;
                      const hasSubItems = !!item.subItems;
                      const Icon = item.icon;

                      if (hasSubItems) {
                        const anySubActive = item.subItems!.some((sub: any) => pathname === sub.href);
                        
                        return (
                          <div key={item.name} className="relative group/submenu space-y-0.5">
                            {/* Parent Button */}
                            <button
                              onClick={() => toggleSubMenu(item.name)}
                              title={item.name}
                              className={`
                                w-full group flex items-center rounded-xl transition-all duration-200 text-xs font-bold
                                ${sidebarCollapse === 'collapsed'
                                  ? 'lg:px-0 lg:py-2.5 lg:justify-center'
                                  : 'justify-between px-4 py-2.5'}
                                ${anySubActive 
                                  ? 'bg-slate-800/80 text-white font-black border-r-2 border-blue-500 rounded-r-none' 
                                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                              `}
                            >
                              <div className={`flex items-center min-w-0 ${
                                sidebarCollapse === 'collapsed' ? 'lg:gap-0' : 'gap-3'
                              }`}>
                                <Icon size={17} className={`shrink-0 ${anySubActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`} />
                                <span className={`truncate transition-all duration-300 ${
                                  sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
                                }`}>{item.name}</span>
                              </div>
                              <div className={`flex items-center gap-2 shrink-0 ${
                                sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
                              }`}>
                                {item.badge !== undefined && item.badge > 0 && (
                                  <AnimatedBadge count={item.badge} />
                                )}
                                <ChevronDown 
                                  size={12} 
                                  className={`transform transition-transform duration-200 ${isSubOpen ? 'rotate-0' : '-rotate-90 rtl:rotate-90'} text-slate-500 group-hover:text-slate-300`} 
                                />
                              </div>
                            </button>

                            {/* Floating Submenu on Hover (Visible only when collapsed on desktop) */}
                            {sidebarCollapse === 'collapsed' && (
                              <div className="absolute right-full top-0 mr-2 w-48 bg-slate-950/95 border border-slate-800 rounded-xl shadow-xl py-2 px-1.5 hidden group-hover/submenu:block z-50 text-right space-y-1 animate-fade-in">
                                <div className="px-3 py-1.5 border-b border-slate-800/80 text-[10px] font-black text-slate-400 mb-1 select-none">
                                  {item.name}
                                </div>
                                {item.subItems!.map((sub: any) => {
                                  const isSubActive = pathname === sub.href;
                                  return (
                                    <Link
                                      key={sub.href}
                                      href={sub.href}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className={`
                                        flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 text-xs font-semibold
                                        ${isSubActive
                                          ? 'bg-blue-600 text-white font-black'
                                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
                                      `}
                                    >
                                      <span className="truncate">{sub.name}</span>
                                      {sub.badge !== undefined && sub.badge > 0 && (
                                        <AnimatedBadge count={sub.badge} />
                                      )}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}

                            {/* Inline Sub Items (Visible only when expanded or on mobile) */}
                            <div className={`mr-4 pr-3 border-r border-slate-800/80 space-y-0.5 transition-all duration-200 overflow-hidden ${
                              sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
                            } ${isSubOpen ? 'max-h-[500px] opacity-100 py-1' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                              {item.subItems!.map((sub: any) => {
                                const isSubActive = pathname === sub.href;
                                return (
                                  <Link
                                    key={sub.href}
                                    href={sub.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    title={sub.tooltip}
                                    className={`
                                      group flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 text-xs font-semibold
                                      ${isSubActive
                                        ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-600/10'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/35'}
                                    `}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`w-1 h-1 rounded-full shrink-0 ${isSubActive ? 'bg-white' : 'bg-slate-600 group-hover:bg-slate-400'}`} />
                                      <span className="truncate">{sub.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {sub.badge !== undefined && sub.badge > 0 && (
                                        <AnimatedBadge count={sub.badge} />
                                      )}
                                      <button 
                                        onClick={(e) => togglePin(sub.href, e)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-blue-500 transition-opacity p-0.5"
                                        title="سنجاق کردن"
                                      >
                                        <Pin size={12} className="rotate-45" />
                                      </button>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // If it is a simple item without subItems
                      const isActive = pathname === item.href;
                      return (
                        <Link 
                          key={item.href} 
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          title={item.name}
                          className={`
                            group flex items-center rounded-xl transition-all duration-250 text-xs font-bold min-w-0
                            ${sidebarCollapse === 'collapsed'
                              ? 'lg:px-0 lg:py-2.5 lg:justify-center'
                              : 'justify-between px-4 py-2.5'}
                            ${item.isSystem
                              ? isActive
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20 font-black'
                                : 'text-indigo-400/90 hover:bg-indigo-950/40 hover:text-indigo-300 border border-indigo-500/15 bg-indigo-500/[0.04]'
                              : isActive 
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10 font-black' 
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                          `}
                        >
                          <div className={`flex items-center min-w-0 ${
                            sidebarCollapse === 'collapsed' ? 'lg:gap-0' : 'gap-3'
                          }`}>
                            <Icon size={17} className="shrink-0" />
                            <span className={`truncate transition-all duration-300 ${
                              sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
                            }`}>{item.name}</span>
                          </div>
                          <div className={`flex items-center gap-2 ${
                            sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''
                          }`}>
                            {item.badge !== undefined && item.badge > 0 && (
                              <AnimatedBadge count={item.badge} />
                            )}
                            <button 
                              onClick={(e) => togglePin(item.href, e)}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-blue-500 transition-opacity p-0.5"
                              title="سنجاق کردن"
                            >
                              <Pin size={14} className="rotate-45" />
                            </button>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>
        
        {/* Sidebar Footer - Collapse Toggle & Logout button */}
        <div className="p-4 border-t border-slate-800/60 shrink-0 bg-slate-950/20 space-y-2">
          {/* Collapse Toggle Button (Desktop only) */}
          <button
            onClick={toggleCollapse}
            className={`hidden lg:flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800/40 hover:text-white transition-all active:scale-98 ${
              sidebarCollapse === 'collapsed' ? 'justify-center px-0' : ''
            }`}
            title={sidebarCollapse === 'collapsed' ? 'باز کردن منو' : 'کوچک کردن منو'}
          >
            {sidebarCollapse === 'collapsed' ? (
              <>
                <ChevronLeft size={16} />
                <span className="lg:hidden">باز کردن منو</span>
              </>
            ) : (
              <>
                <ChevronRight size={16} />
                <span>کوچک کردن منو</span>
              </>
            )}
          </button>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800/40 hover:text-red-400 transition-all active:scale-98 ${
              sidebarCollapse === 'collapsed' ? 'lg:justify-center lg:px-0' : ''
            }`}
            title="خروج از حساب مدیریت"
          >
            <LogOut size={16} className="shrink-0" />
            <span className={sidebarCollapse === 'collapsed' ? 'lg:hidden' : ''}>خروج از حساب مدیریت</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile navigation */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Container - Scrollable Column */}
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden min-h-screen print:block print:overflow-visible print:h-auto">
        
        {/* Modern Sticky Header */}
        <header className="sticky top-0 z-30 flex w-full bg-white/95 backdrop-blur-md dark:bg-slate-900/95 shadow-sm dark:border-b dark:border-slate-800/80 transition-colors print:hidden">
          <div className="flex flex-grow items-center justify-between px-4 py-3 md:px-6 lg:px-8">
            
            {/* Mobile toggles */}
            <div className="flex items-center gap-3 lg:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900 p-2 shadow-sm backdrop-blur-md text-slate-800 dark:text-white"
              >
                <Menu size={18} />
              </button>
              <span className="font-black text-sm text-slate-800 dark:text-white">پنل ادمین</span>
            </div>

            {/* Desktop breadcrumb search placeholder */}
            <div className="hidden sm:block relative">
              <div className="relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pl-3 pr-3 text-slate-400 pointer-events-none">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  placeholder="جستجوی سریع بخش‌ها و کارهای ادمین..."
                  className="w-full bg-slate-100/50 dark:bg-slate-950 rounded-xl py-2 pr-10 pl-4 text-xs font-bold text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 xl:w-96 transition-all border border-transparent focus:border-blue-500 dark:border-slate-800"
                />
              </div>

              {/* Command Search Dropdown */}
              {isSearchFocused && (
                <div className="absolute right-0 mt-2 w-full xl:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-150 dark:border-slate-800 shadow-2xl py-2.5 z-50 animate-fade-in text-[11px] font-black text-right">
                  <div className="px-4 py-1.5 border-b border-slate-50 dark:border-slate-800/80 mb-1.5 text-slate-400 dark:text-slate-500 select-none">
                    {searchQuery ? 'نتایج جستجوی سریع' : 'پیشنهادهای دسترسی سریع'}
                  </div>
                  {filteredCommands.length === 0 ? (
                    <div className="px-4 py-4 text-center text-slate-400 dark:text-slate-500 select-none">
                      نتیجه‌ای برای جستجوی شما پیدا نشد 🧐
                    </div>
                  ) : (
                    filteredCommands.map((cmd) => (
                      <Link
                        key={cmd.href}
                        href={cmd.href}
                        className="w-full text-right px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors border-none cursor-pointer"
                      >
                        <span className="truncate">{cmd.name}</span>
                        <ArrowLeft size={12} className="text-slate-400 dark:text-slate-500" />
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Right Header Items (Toggles, notifications, user avatar dropdown) */}
            <div className="flex items-center gap-3">
              <ul className="flex items-center gap-2">
                
                {/* Agent Mode Toggler */}
                <li>
                  <Link 
                    href="/admin/agent"
                    className="group relative flex h-9 items-center gap-2 px-3.5 rounded-xl overflow-hidden text-white text-xs font-black shadow-md shadow-cyan-900/20 hover:shadow-cyan-500/30 transition-[transform,box-shadow] duration-500 ease-out hover:scale-[1.03] active:scale-[0.98] bg-gradient-to-r from-cyan-500 via-blue-600 via-violet-600 to-fuchsia-600 animate-agent-aurora"
                    title="حالت ایجنت (مدیریت هوشمند یکپارچه)"
                  >
                    <span className="pointer-events-none absolute -inset-y-6 -left-8 w-12 bg-white/30 blur-md rotate-12 -translate-x-full group-hover:translate-x-[16rem] transition-transform duration-[1000ms] ease-out" />
                    <Sparkles size={14} className="relative z-10 animate-pulse text-cyan-50 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
                    <span className="relative z-10 hidden sm:inline">حالت ایجنت ✨</span>
                  </Link>
                </li>

                {/* Dark mode toggler */}
                <li>
                  <button 
                    onClick={toggleDarkMode}
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-gray-300 transition-colors"
                    title={darkMode ? 'تم روشن' : 'تم تیره'}
                  >
                    {darkMode ? <Sun size={17} /> : <Moon size={17} />}
                  </button>
                </li>
                
                {/* Admin Notifications Dropdown */}
                <li className="relative notification-container">
                  <button 
                    onClick={() => {
                      setNotificationDropdownOpen(!notificationDropdownOpen);
                      setProfileDropdownOpen(false);
                    }}
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-gray-300 transition-colors"
                    title="اعلان‌های زنده"
                  >
                    <AnimatedNotificationDot count={totalUrgentCount} />
                    <Bell size={16} />
                  </button>

                  {notificationDropdownOpen && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-3 flex w-80 flex-col rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xl dark:border-slate-800 dark:bg-slate-900/95 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/30 select-none">
                        <h3 className="text-xs font-black text-slate-800 dark:text-white">اقدامات در صف انتظار</h3>
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-black px-2 py-0.5 rounded-full">
                          {formatNum(totalUrgentCount)} مورد جدید
                        </span>
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-850">
                        {totalUrgentCount === 0 ? (
                          <div className="px-4 py-8 text-center text-xs font-bold text-slate-500 dark:text-gray-400">
                            هیچ مورد جدیدی در صف انتظار نیست 🎉
                          </div>
                        ) : (
                          <ul className="flex flex-col">
                            {pendingOrdersCount > 0 && (
                              <li>
                                <Link 
                                  href="/admin/orders?status=pending"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="flex gap-3 px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
                                >
                                  <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-xl h-fit shrink-0">
                                    <ShoppingCart size={15} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-800 dark:text-white mb-0.5">
                                      سفارشات جدید در انتظار بررسی
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                      تعداد {formatNum(pendingOrdersCount)} سفارش پرداخت شده نیاز به تدارک کالا و ارسال دارند.
                                    </p>
                                  </div>
                                </Link>
                              </li>
                            )}
                            
                            {newTicketsCount > 0 && (
                              <li>
                                <Link 
                                  href="/admin/tickets?status=new"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="flex gap-3 px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
                                >
                                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-xl h-fit shrink-0">
                                    <HeadphonesIcon size={15} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-800 dark:text-white mb-0.5">
                                      تیکت‌های جدید مشتریان
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                      تعداد {formatNum(newTicketsCount)} پیام بی‌پاسخ در انتظار راهنمایی کاربران است.
                                    </p>
                                  </div>
                                </Link>
                              </li>
                            )}
                            
                            {unreadChatsCount > 0 && (
                              <li>
                                <Link 
                                  href="/admin/chat"
                                  onClick={() => setNotificationDropdownOpen(false)}
                                  className="flex gap-3 px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
                                >
                                  <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl h-fit shrink-0">
                                    <MessageSquare size={15} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-800 dark:text-white mb-0.5">
                                      چت‌های جدید بی‌پاسخ
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                      تعداد {formatNum(unreadChatsCount)} گفتگو با پیام خوانده‌نشده از طرف مشتریان در انتظار پاسخ است.
                                    </p>
                                  </div>
                                </Link>
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              </ul>

              {/* Admin Profile Area */}
              <div className="relative pl-1 profile-container">
                <button 
                  onClick={() => {
                    setProfileDropdownOpen(!profileDropdownOpen);
                    setNotificationDropdownOpen(false);
                  }}
                  className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
                >
                  <span className="hidden text-right lg:block">
                    <span className="block text-xs font-black text-slate-850 dark:text-slate-100">
                      {profile?.name || 'مدیر هسته'}
                    </span>
                    <span className="block text-[9px] text-slate-400 font-bold mt-0.5">
                      {profile?.shopName || 'فروشگاه تستی'}
                    </span>
                  </span>

                  <span className="h-9 w-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative flex items-center justify-center bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shadow-sm shrink-0 font-black text-sm">
                    {profile?.avatarUrl ? (
                      <img 
                        src={profile.avatarUrl} 
                        alt="Admin Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{profile?.name ? profile.name.charAt(0) : 'م'}</span>
                    )}
                  </span>

                  <ChevronDown size={13} className="hidden sm:block text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute left-0 top-full mt-3 flex w-56 flex-col rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xl dark:border-slate-800 dark:bg-slate-900/95 overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/30 select-none">
                      <p className="text-xs font-black text-slate-850 dark:text-white truncate">{profile?.name || 'مدیر سیستم'}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 truncate text-left dir-ltr">{profile?.email || ''}</p>
                      {profile?.role && (
                        <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-black mt-1">
                          {ADMIN_ROLE_LABELS[profile.role]}
                        </p>
                      )}
                    </div>
                    <ul className="flex flex-col gap-0.5 p-1.5 border-b border-slate-100 dark:border-slate-850">
                      <li>
                        <Link 
                          href="/admin/profile" 
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-850 transition-colors"
                        >
                          <User size={15} />
                          پروفایل من
                        </Link>
                      </li>
                      {userRole === 'admin' && (
                        <li>
                          <Link 
                            href="/admin/settings" 
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-850 transition-colors"
                          >
                            <Settings size={15} />
                            تنظیمات فروشگاه
                          </Link>
                        </li>
                      )}
                    </ul>
                    <div className="p-1.5">
                      <button 
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50/50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={15} />
                        خروج از پنل
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 print:p-0 print:max-w-full print:m-0 print:space-y-0">
          {profile?.hasDemoData && (
            <div className="bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none text-right print:hidden" dir="rtl">
              <div className="flex items-start gap-3.5">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                    حالت پیش‌نمایش با اطلاعات تستی فعال است ✨
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed max-w-3xl">
                    فروشگاه شما با اطلاعات نمونه متناسب با زمینه فعالیتتان شخصی‌سازی شده است تا سایت خالی نباشد. با دکمه زیر فقط محتوای تستی حذف می‌شود و محصولات، استوری‌ها و مقالات واقعی شما دست‌نخورده باقی می‌مانند.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearDemoData}
                disabled={clearingDemoData}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/10 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98] self-end md:self-auto flex items-center gap-1.5"
              >
                {clearingDemoData ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    در حال حذف...
                  </>
                ) : (
                  'حذف اطلاعات تستی'
                )}
              </button>
            </div>
          )}

          {profile && (!profile.isApproved || !profile.isActive) && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-5 flex items-start gap-3 select-none text-right print:hidden" dir="rtl">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-800 dark:text-white">
                  {!profile.isApproved ? 'فروشگاه شما در انتظار تایید مدیریت است' : 'فروشگاه شما غیرفعال شده است'}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  {!profile.isApproved 
                    ? 'فروشگاه شما با موفقیت ثبت شده است اما هنوز توسط مدیر اصلی تایید نشده است. در این وضعیت، فروشگاه عمومی شما برای خریداران در دسترس نیست، اما شما می‌توانید محصولات خود را اضافه کرده و تنظیمات فروشگاه را تغییر دهید. پس از تایید مدیر، فروشگاه شما به صورت عمومی فعال خواهد شد.'
                    : 'فروشگاه شما موقتاً توسط مدیریت غیرفعال شده است. در صورت نیاز با پشتیبانی تماس بگیرید.'}
                </p>
              </div>
            </div>
          )}
          {children}
        </main>

        {/* Toast Notifications */}
        <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3 w-full max-w-sm font-sans" dir="rtl">
          {toasts.map((toast) => (
            <div 
              key={toast.id}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r-4 border-emerald-500 shadow-2xl rounded-2xl p-4 flex gap-3.5 items-start justify-between border border-slate-150 dark:border-slate-800 animate-slide-in relative overflow-hidden group transition-all hover:scale-[1.02]"
            >
              {/* Soft progress bar background */}
              <div className="absolute bottom-0 right-0 h-1 bg-emerald-500/20 w-full animate-shrink-width" />
              
              <div className="flex gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${toast.type === 'order' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-500'}`}>
                  {toast.type === 'order' ? <ShoppingCart size={18} /> : <HeadphonesIcon size={18} />}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">{toast.title}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{toast.message}</p>
                  <div className="flex gap-2 mt-2">
                    <Link 
                      href={toast.type === 'order' ? '/admin/orders' : '/admin/tickets'}
                      onClick={() => setToasts(current => current.filter(t => t.id !== toast.id))}
                      className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                    >
                      <span>مشاهده و مدیریت</span>
                      <ExternalLink size={10} />
                    </Link>
                    <button 
                      onClick={() => setToasts(current => current.filter(t => t.id !== toast.id))}
                      className="text-[9px] font-black hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      بستن
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setToasts(current => current.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* CSS Animations */}
        <style jsx global>{`
          @keyframes toastSlideIn {
            from { transform: translateX(-110%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes toastShrinkWidth {
            from { width: 100%; }
            to { width: 0%; }
          }
          .animate-slide-in {
            animation: toastSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          .animate-shrink-width {
            animation: toastShrinkWidth 10s linear forwards;
          }

          /* Dot Grid Background */
          .bg-dot-grid {
            background-image: radial-gradient(rgba(99, 102, 241, 0.05) 1.2px, transparent 1.2px);
            background-size: 24px 24px;
          }
          .dark .bg-dot-grid {
            background-image: radial-gradient(rgba(99, 102, 241, 0.1) 1.2px, transparent 1.2px);
          }
          
          /* Background Drift Animation */
          @keyframes bgDrift {
            0% { background-position: 0px 0px; }
            100% { background-position: 48px 48px; }
          }
          .animate-bg-drift {
            animation: bgDrift 120s linear infinite;
          }

          /* Blob Animations */
          @keyframes blobFloat1 {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.05); }
            66% { transform: translate(-20px, 25px) scale(0.96); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes blobFloat2 {
            0% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(-40px, 40px) scale(1.08); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes blobFloat3 {
            0% { transform: translate(0px, 0px) scale(1); }
            40% { transform: translate(40px, 20px) scale(0.94); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          @keyframes blobFloat4 {
            0% { transform: translate(0px, 0px) scale(1); }
            45% { transform: translate(-25px, -30px) scale(1.04); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          
          .animate-blob-1 {
            animation: blobFloat1 35s infinite ease-in-out;
          }
          .animate-blob-2 {
            animation: blobFloat2 42s infinite ease-in-out;
          }
          .animate-blob-3 {
            animation: blobFloat3 38s infinite ease-in-out;
          }
          .animate-blob-4 {
            animation: blobFloat4 45s infinite ease-in-out;
          }

          /* Subtle floating particles */
          @keyframes particleFloat1 {
            0%, 100% { transform: translateY(0px) scale(1); opacity: 0.15; }
            50% { transform: translateY(-15px) scale(1.1); opacity: 0.4; }
          }
          @keyframes particleFloat2 {
            0%, 100% { transform: translateY(0px) scale(1.1); opacity: 0.2; }
            50% { transform: translateY(20px) scale(0.9); opacity: 0.5; }
          }
          @keyframes particleFloat3 {
            0%, 100% { transform: translate(0px, 0px); opacity: 0.1; }
            50% { transform: translate(10px, -10px); opacity: 0.3; }
          }
          
          .animate-particle-1 {
            animation: particleFloat1 16s infinite ease-in-out;
          }
          .animate-particle-2 {
            animation: particleFloat2 20s infinite ease-in-out;
          }
          .animate-particle-3 {
            animation: particleFloat3 24s infinite ease-in-out;
          }

          /* Slow float animations for shop elements */
          @keyframes floatSlow1 {
            0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
            50% { transform: translateY(-25px) rotate(12deg) scale(1.03); }
          }
          @keyframes floatSlow2 {
            0%, 100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
            50% { transform: translate(20px, 20px) rotate(-15deg) scale(0.97); }
          }
          @keyframes floatSlow3 {
            0%, 100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
            50% { transform: translate(-20px, 15px) rotate(8deg) scale(1.02); }
          }
          
          .animate-float-slow-1 {
            animation: floatSlow1 24s infinite ease-in-out;
          }
          .animate-float-slow-2 {
            animation: floatSlow2 28s infinite ease-in-out;
          }
          .animate-float-slow-3 {
            animation: floatSlow3 32s infinite ease-in-out;
          }

          /* Spin slow */
          @keyframes spinSlow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spinSlow 140s linear infinite;
          }
          .animate-spin-slow-reverse {
            animation: spinSlow 200s linear infinite reverse;
          }

          /* Dynamic scanning lines */
          @keyframes scanLine1 {
            0% { top: -10%; opacity: 0; }
            10% { opacity: 0.3; }
            50% { opacity: 0.8; }
            90% { opacity: 0.3; }
            100% { top: 110%; opacity: 0; }
          }
          @keyframes scanLine2 {
            0% { bottom: -10%; opacity: 0; }
            15% { opacity: 0.2; }
            50% { opacity: 0.6; }
            85% { opacity: 0.2; }
            100% { bottom: 110%; opacity: 0; }
          }
          .animate-scan-line-1 {
            animation: scanLine1 18s infinite linear;
          }
          .animate-scan-line-2 {
            animation: scanLine2 24s infinite linear;
          }
        `}</style>

      </div>
    </div>
  );
}
