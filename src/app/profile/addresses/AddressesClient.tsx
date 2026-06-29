'use client';

import { useState } from 'react';
import { MapPin, Plus, Trash2, Edit2, Crosshair, X, Check } from 'lucide-react';

interface Address {
  id: string;
  title: string;
  receiver: string;
  phone: string;
  province: string;
  city: string;
  street: string;
  plaque: string;
  unit: string;
  postalCode: string;
  isDefault: boolean;
}

export default function AddressesClient({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این آدرس اطمینان دارید؟')) return;
    
    try {
      const res = await fetch(`/api/profile/addresses/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setAddresses(addresses.filter(a => a.id !== id));
      } else {
        alert('خطا در حذف آدرس');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('خطا در ارتباط با سرور');
    }
  };

  const handleSetDefault = (id: string) => {
    setAddresses(addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    })));
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Mock reverse geocoding
          setTimeout(() => {
            setNewAddress(prev => ({
              ...prev,
              province: 'تهران',
              city: 'تهران',
              street: `ثبت شده از طریق نقشه (مختصات: ${lat.toFixed(4)}، ${lng.toFixed(4)})`,
            }));
            setIsLocating(false);
          }, 1000);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("خطا در دریافت موقعیت مکانی. لطفا دسترسی مرورگر را بررسی کنید.");
          setIsLocating(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("مرورگر شما از قابلیت مکان‌یابی پشتیبانی نمی‌کند.");
      setIsLocating(false);
    }
  };


  const generateFullAddress = (address: Address) => {
    return [address.street, `پلاک ${address.plaque}`, address.unit ? `واحد ${address.unit}` : null]
      .filter(Boolean)
      .join('، ');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            آدرس‌های من
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            مدیریت آدرس‌های ثبت شده برای ارسال سفارشات
          </p>
        </div>
        <button 
          onClick={() => {
            setNewAddress({});
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <Plus size={18} />
          ثبت آدرس جدید
        </button>
      </div>

      {/* Address List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {addresses.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-[#24303f] p-12 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <MapPin size={32} />
            </div>
            <p className="text-gray-500 dark:text-gray-400">هنوز آدرسی ثبت نکرده‌اید.</p>
          </div>
        ) : (
          addresses.map((address) => (
            <div key={address.id} className={`bg-white dark:bg-[#24303f] p-5 rounded-2xl shadow-sm border transition-all ${address.isDefault ? 'border-blue-500 dark:border-blue-500' : 'border-gray-100 dark:border-gray-800'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{address.title}</h3>
                    <p className="text-xs text-gray-500">{address.province}، {address.city}</p>
                  </div>
                </div>
                {address.isDefault && (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-md">
                    آدرس پیش‌فرض
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2 leading-relaxed">
                {generateFullAddress(address)}
              </p>
              
              <div className="grid grid-cols-2 gap-y-2 mb-5 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">گیرنده:</span>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{address.receiver}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">موبایل:</span>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{address.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="text-gray-400">کد پستی:</span>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{address.postalCode}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                {!address.isDefault ? (
                  <button 
                    onClick={() => handleSetDefault(address.id)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                  >
                    تنظیم به عنوان پیش‌فرض
                  </button>
                ) : <div></div>}
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setNewAddress(address);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(address.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New/Edit Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1a222c] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {newAddress.id ? 'ویرایش آدرس' : 'ثبت آدرس جدید'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Location Auto-Fetch Button */}
              {!newAddress.id && (
                <button 
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="w-full mb-6 flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-blue-200 dark:border-blue-900/30 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Crosshair size={28} className={isLocating ? 'animate-spin' : ''} />
                  <span className="font-bold text-sm">
                    {isLocating ? 'در حال دریافت موقعیت مکانی...' : 'مسیریابی و ثبت خودکار آدرس از طریق نقشه (لوکیشن)'}
                  </span>
                  <span className="text-xs opacity-70">
                    برای راحتی شما، مرورگر به صورت خودکار آدرس را پیدا می‌کند
                  </span>
                </button>
              )}

              <form id="addressForm" onSubmit={async (e) => {
                e.preventDefault();
                if (!newAddress.title || !newAddress.street) return;

                setIsSubmitting(true);
                try {
                  if (newAddress.id) {
                    // Update existing
                    const res = await fetch(`/api/profile/addresses/${newAddress.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newAddress),
                    });
                    
                    if (res.ok) {
                      const data = await res.json();
                      const updatedAddress = {
                        ...data.address,
                        province: data.address.state,
                        postalCode: data.address.zipCode,
                        isDefault: addresses.find(a => a.id === newAddress.id)?.isDefault || false
                      };
                      setAddresses(addresses.map(a => a.id === newAddress.id ? updatedAddress as Address : a));
                      setIsModalOpen(false);
                      setNewAddress({});
                    } else {
                      if (res.status === 401 || res.status === 404) {
                        alert('جلسه شما منقضی شده است یا حساب کاربری یافت نشد. لطفاً دوباره وارد شوید.');
                        window.location.href = '/login';
                      } else {
                        alert('خطا در بروزرسانی آدرس');
                      }
                    }
                  } else {
                    // Add new
                    const res = await fetch('/api/profile/addresses', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newAddress),
                    });
                    
                    if (res.ok) {
                      const data = await res.json();
                      const addedAddress = {
                        ...data.address,
                        province: data.address.state,
                        postalCode: data.address.zipCode,
                        isDefault: addresses.length === 0
                      };
                      setAddresses([...addresses, addedAddress]);
                      setIsModalOpen(false);
                      setNewAddress({});
                    } else {
                      if (res.status === 401 || res.status === 404) {
                        alert('جلسه شما منقضی شده است یا حساب کاربری یافت نشد. لطفاً دوباره وارد شوید.');
                        window.location.href = '/login';
                      } else {
                        alert('خطا در ثبت آدرس');
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error saving address:', error);
                  alert('خطا در ارتباط با سرور');
                } finally {
                  setIsSubmitting(false);
                }
              }} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">عنوان آدرس</label>
                    <input 
                      required
                      type="text" 
                      placeholder="مثال: خانه، محل کار"
                      value={newAddress.title || ''}
                      onChange={e => setNewAddress({...newAddress, title: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">کد پستی</label>
                    <input 
                      type="text" 
                      placeholder="کد پستی 10 رقمی"
                      value={newAddress.postalCode || ''}
                      onChange={e => setNewAddress({...newAddress, postalCode: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">استان</label>
                    <input 
                      required
                      type="text" 
                      placeholder="استان"
                      value={newAddress.province || ''}
                      onChange={e => setNewAddress({...newAddress, province: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">شهر</label>
                    <input 
                      required
                      type="text" 
                      placeholder="شهر"
                      value={newAddress.city || ''}
                      onChange={e => setNewAddress({...newAddress, city: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">خیابان / کوچه</label>
                  <textarea 
                    required
                    rows={2}
                    placeholder="خیابان اصلی، خیابان فرعی، کوچه..."
                    value={newAddress.street || ''}
                    onChange={e => setNewAddress({...newAddress, street: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">پلاک</label>
                    <input 
                      required
                      type="text" 
                      placeholder="پلاک"
                      value={newAddress.plaque || ''}
                      onChange={e => setNewAddress({...newAddress, plaque: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">واحد (اختیاری)</label>
                    <input 
                      type="text" 
                      placeholder="واحد"
                      value={newAddress.unit || ''}
                      onChange={e => setNewAddress({...newAddress, unit: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">نام گیرنده</label>
                    <input 
                      required
                      type="text" 
                      placeholder="نام و نام خانوادگی تحویل گیرنده"
                      value={newAddress.receiver || ''}
                      onChange={e => setNewAddress({...newAddress, receiver: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">شماره موبایل گیرنده</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="09..."
                      value={newAddress.phone || ''}
                      onChange={e => setNewAddress({...newAddress, phone: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#24303f] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a222c] flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                انصراف
              </button>
              <button 
                type="submit"
                form="addressForm"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
              >
                <Check size={18} />
                {isSubmitting ? 'در حال ثبت...' : (newAddress.id ? 'ثبت تغییرات' : 'ثبت آدرس')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
