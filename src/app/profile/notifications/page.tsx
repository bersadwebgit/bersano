'use client';

import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, Settings, Save } from 'lucide-react';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [notifications, setNotifications] = useState<
    { id: string; isRead: boolean; linkUrl?: string; type: string; title: string; message: string; createdAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Settings State
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [offersAndDiscounts, setOffersAndDiscounts] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/profile/notifications');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (data.notifications) {
          setNotifications(data.notifications);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();

    // In a real app, fetch settings from backend. For now we use localStorage or mock data.
    const savedOrderUpdates = localStorage.getItem('setting_orderUpdates');
    const savedOffers = localStorage.getItem('setting_offersAndDiscounts');
    
    if (savedOrderUpdates !== null) setOrderUpdates(savedOrderUpdates === 'true');
    if (savedOffers !== null) setOffersAndDiscounts(savedOffers === 'true');

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

  const handleSaveSettings = () => {
    setSavingSettings(true);
    setSettingsMessage(null);
    
    // Simulate API call
    setTimeout(() => {
      localStorage.setItem('setting_orderUpdates', orderUpdates.toString());
      localStorage.setItem('setting_offersAndDiscounts', offersAndDiscounts.toString());
      
      setSavingSettings(false);
      setSettingsMessage({ type: 'success', text: 'تنظیمات با موفقیت ذخیره شد' });
      
      setTimeout(() => setSettingsMessage(null), 3000);
    }, 800);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">اعلان‌ها</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">مشاهده اعلان‌ها و مدیریت تنظیمات آنها</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#24303f] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'list' 
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Bell size={18} />
            لیست اعلان‌ها
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full mr-1">
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'settings' 
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Settings size={18} />
            تنظیمات اعلان‌ها
          </button>
        </div>

        {/* List Tab */}
        {activeTab === 'list' && (
          <div>
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#1a222c]/50">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                همه اعلان‌ها
              </span>
              {notifications.some(n => !n.isRead) && (
                <button 
                  onClick={() => markNotificationAsRead()}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  خواندن همه
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Bell size={32} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">اعلانی وجود ندارد</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  در حال حاضر هیچ اعلانی برای نمایش وجود ندارد.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map((notification) => (
                  <li 
                    key={notification.id} 
                    className={`p-4 sm:p-5 transition-colors ${
                      !notification.isRead 
                        ? 'bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-50/50 dark:hover:bg-blue-900/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-[#1a222c]/50'
                    }`}
                  >
                    <div 
                      onClick={() => {
                        if (!notification.isRead) markNotificationAsRead(notification.id);
                        if (notification.linkUrl) window.location.href = notification.linkUrl;
                      }}
                      className={`flex gap-4 ${notification.linkUrl ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {notification.type === 'success' ? (
                          <CheckCircle size={24} className="text-green-500" />
                        ) : notification.type === 'warning' ? (
                          <AlertTriangle size={24} className="text-yellow-500" />
                        ) : notification.type === 'error' ? (
                          <AlertTriangle size={24} className="text-red-500" />
                        ) : (
                          <Info size={24} className="text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`text-base font-medium ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-400 whitespace-nowrap mt-1">
                            {new Date(notification.createdAt).toLocaleDateString('fa-IR')}
                          </span>
                        </div>
                        <p className={`text-sm ${!notification.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="flex-shrink-0 flex items-center justify-center w-3">
                          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-5 md:p-6">
            {settingsMessage && (
              <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${
                settingsMessage.type === 'success' 
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                <CheckCircle size={20} />
                <p className="text-sm font-medium">{settingsMessage.text}</p>
              </div>
            )}

            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">تنظیمات دریافت پیام و اعلان</h3>
                
                <div className="space-y-4">
                  {/* Order Status Setting */}
                  <label className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1a222c] cursor-pointer transition-colors">
                    <div className="relative flex items-center mt-1">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={orderUpdates}
                        onChange={() => setOrderUpdates(!orderUpdates)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">اعلان وضعیت سفارش</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        دریافت پیامک و اعلان هنگام تغییر وضعیت سفارشات (پرداخت، ارسال، تحویل و ...)
                      </p>
                    </div>
                  </label>

                  {/* Offers & Discounts Setting */}
                  <label className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1a222c] cursor-pointer transition-colors">
                    <div className="relative flex items-center mt-1">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={offersAndDiscounts}
                        onChange={() => setOffersAndDiscounts(!offersAndDiscounts)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">اعلان تخفیف و پیشنهادات</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        اطلاع از جدیدترین کدهای تخفیف، جشنواره‌های فروش و پیشنهادات ویژه
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button 
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {savingSettings ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save size={18} />
                  )}
                  ذخیره تنظیمات
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
