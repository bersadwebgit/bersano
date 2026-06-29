'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Heart, 
  MapPin, 
  Shield, 
  HeadphonesIcon, 
  Menu, 
  X,
  Bell,
  Search,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  User,
  CheckCircle,
  Info,
  AlertTriangle,
  FileDown
} from 'lucide-react';

import Image from 'next/image';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [user, setUser] = useState<{name?: string, email?: string, avatarUrl?: string, productType?: string, role?: string} | null>(null);
  const [notifications, setNotifications] = useState<
    { id: string; isRead: boolean; linkUrl?: string; type: string; title: string; message: string; createdAt: string }[]
  >([]);
  const pathname = usePathname();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    if (darkMode !== isDark) {
      setDarkMode(isDark);
    }
  }, [darkMode]);

  useEffect(() => {
    const fetchProfile = () => {
      fetch('/api/profile', { cache: 'no-store' })
        .then(res => {
          if (res.status === 401) {
            window.location.href = '/login';
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (data && data.user) {
            setUser({
              name: data.user.name,
              email: data.user.email,
              avatarUrl: data.user.avatarUrl,
              productType: data.productType,
              role: data.user.role
            });
          }
        })
        .catch(console.error);
    };

    // Fetch user profile initially
    fetchProfile();

    // Listen for profile updates
    window.addEventListener('profile-updated', fetchProfile);

    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/profile/notifications');
        const data = await res.json();
        if (data.notifications) {
          setNotifications(data.notifications);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
    
    fetchNotifications();

    return () => {
      window.removeEventListener('profile-updated', fetchProfile);
    };
  }, []);

  const markNotificationAsRead = async (id?: string) => {
    try {
      await fetch('/api/profile/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      if (id) {
        setNotifications(notifications.map(n => 
          n.id === id ? { ...n, isRead: true } : n
        ));
      } else {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/customer/logout', { method: 'POST' });
    // Clear user-specific local storage
    localStorage.removeItem('shop-favorites-storage');
    window.location.href = '/login';
  };

  const menuItems = [
    { name: 'داشبورد', href: '/profile', icon: LayoutDashboard },
    { name: 'پروفایل کاربری', href: '/profile/security', icon: User },
    ...(user?.role === 'superadmin' ? [{ name: 'پنل مدیریت کل', href: '/super-admin', icon: Shield }] : []),
    ...(['admin', 'product_manager', 'sales_manager', 'sales_product_manager'].includes(user?.role || '') ? [{ name: 'پنل مدیریت فروشگاه', href: '/admin', icon: LayoutDashboard }] : []),
    ...(user?.productType !== 'physical' ? [{ name: 'دانلودهای من', href: '/profile/downloads', icon: FileDown }] : []),
    { name: 'سفارش‌های من', href: '/profile/orders', icon: ShoppingBag },
    { name: 'محصولات ذخیره شده', href: '/profile/favorites', icon: Heart },
    { name: 'آدرس‌های من', href: '/profile/addresses', icon: MapPin },
    { name: 'اعلان‌ها', href: '/profile/notifications', icon: Bell },
    { name: 'پشتیبانی', href: '/profile/support', icon: HeadphonesIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#1a222c] text-slate-800 dark:text-slate-300 font-sans flex" dir="rtl">
      
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 lg:py-5 border-b border-slate-800/60">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm text-white">
              S
            </div>
            <span className="text-xl font-bold tracking-wide text-white">فروشگاه</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Menu */}
        <div className="flex flex-col flex-1 overflow-y-auto duration-300 ease-linear py-4">
          <nav className="px-3 lg:px-4">
            <h3 className="mb-3 ml-4 text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
              منوی کاربری
            </h3>
            <ul className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <li key={item.href}>
                    <Link 
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium duration-200 ease-in-out
                        ${isActive 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                      `}
                    >
                      <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        
        {/* Sidebar Footer - Logout */}
        <div className="p-4 border-t border-slate-800/60">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
            خروج از حساب
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        
        {/* Header */}
        <header className="sticky top-0 z-30 flex w-full bg-white/90 backdrop-blur-md dark:bg-[#24303f]/90 shadow-sm dark:border-b dark:border-gray-800">
          <div className="flex flex-grow items-center justify-between px-4 py-3 md:px-5">
            
            <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="z-50 block rounded-xl border border-slate-200/80 bg-white/50 p-2 shadow-sm dark:border-gray-700 dark:bg-[#1a222c] lg:hidden backdrop-blur-md"
              >
                <Menu size={20} className="text-slate-800 dark:text-white" />
              </button>
              <Link href="/" className="block flex-shrink-0 lg:hidden text-lg font-bold text-slate-800 dark:text-white">
                فروشگاه
              </Link>
            </div>

            <div className="hidden sm:block">
              <div className="relative">
                <button className="absolute right-0 top-1/2 -translate-y-1/2 pl-3 pr-3">
                  <Search size={16} className="text-gray-500 dark:text-gray-400" />
                </button>
                <input
                  type="text"
                  placeholder="جستجو..."
                  className="w-full bg-slate-100/50 dark:bg-[#1a222c] rounded-xl py-2 pr-10 pl-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:text-white xl:w-80 transition-all border border-transparent focus:border-indigo-500 dark:border-gray-700"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ul className="flex items-center gap-2">
                {/* Dark Mode Toggler */}
                <li>
                  <button 
                    onClick={toggleDarkMode}
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-[#1a222c] dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300 transition-colors"
                  >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                </li>
                
                {/* Notification */}
                <li className="relative notification-container">
                  <button 
                    onClick={() => {
                      setNotificationDropdownOpen(!notificationDropdownOpen);
                      setProfileDropdownOpen(false);
                    }}
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-[#1a222c] dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300 transition-colors"
                  >
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 z-1 h-2 w-2 rounded-full bg-red-500 border-2 border-white dark:border-[#24303f]"></span>
                    )}
                    <Bell size={16} />
                  </button>

                  {/* Notification Dropdown */}
                  {notificationDropdownOpen && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-3 flex w-80 flex-col rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xl dark:border-gray-800 dark:bg-[#24303f]/90 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">اعلان‌ها</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={() => markNotificationAsRead()}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            خواندن همه
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            هیچ اعلانی ندارید
                          </div>
                        ) : (
                          <ul className="flex flex-col">
                            {notifications.map((notification) => (
                              <li key={notification.id} className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                <div 
                                  onClick={() => {
                                    if (!notification.isRead) markNotificationAsRead(notification.id);
                                    if (notification.linkUrl) window.location.href = notification.linkUrl;
                                  }}
                                  className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${notification.linkUrl ? 'cursor-pointer' : ''}`}
                                >
                                  <div className="flex gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {notification.type === 'success' ? (
                                        <CheckCircle size={16} className="text-green-500" />
                                      ) : notification.type === 'warning' ? (
                                        <AlertTriangle size={16} className="text-yellow-500" />
                                      ) : notification.type === 'error' ? (
                                        <AlertTriangle size={16} className="text-red-500" />
                                      ) : (
                                        <Info size={16} className="text-blue-500" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                        {notification.title}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                        {notification.message}
                                      </p>
                                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                                        {new Date(notification.createdAt).toLocaleDateString('fa-IR')}
                                      </p>
                                    </div>
                                    {!notification.isRead && (
                                      <div className="flex-shrink-0 flex items-center">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              </ul>

              {/* User Area */}
              <div className="relative pl-1 profile-container">
                <button 
                  onClick={() => {
                    setProfileDropdownOpen(!profileDropdownOpen);
                    setNotificationDropdownOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <span className="hidden text-right lg:block">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-white">
                      {user?.name || 'کاربر'}
                    </span>
                  </span>

                  <span className="h-9 w-9 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700 relative flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    {user?.avatarUrl ? (
                      <Image 
                        src={user.avatarUrl} 
                        alt="User" 
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </span>

                  <ChevronDown size={14} className="hidden sm:block text-gray-500 dark:text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute left-0 top-full mt-3 flex w-56 flex-col rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xl dark:border-gray-800 dark:bg-[#24303f]/90 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user?.name || 'کاربر'}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 truncate dir-ltr text-right">{user?.email || ''}</p>
                    </div>
                    <ul className="flex flex-col gap-0.5 p-1.5 border-b border-slate-100 dark:border-gray-800">
                      <li>
                        <Link href="/profile" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-100/50 dark:hover:bg-gray-800 transition-colors">
                          <LayoutDashboard size={16} />
                          داشبورد
                        </Link>
                      </li>
                      <li>
                        <Link href="/profile/security" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-100/50 dark:hover:bg-gray-800 transition-colors">
                          <User size={16} />
                          پروفایل کاربری
                        </Link>
                      </li>
                    </ul>
                    <div className="p-1.5">
                      <button 
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50/50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={16} />
                        خروج از حساب
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl p-4 md:p-5 lg:p-6">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
