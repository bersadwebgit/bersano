'use client';

import Link from 'next/link';
import { ShoppingBag, Heart, MapPin, Clock } from 'lucide-react';
import { useFavoritesStore } from '@/store/favoritesStore';

interface ProfileStatsProps {
  totalOrdersCount: number;
  currentOrdersCount: number;
  addressesCount: number;
}

export default function ProfileStats({
  totalOrdersCount,
  currentOrdersCount,
  addressesCount
}: ProfileStatsProps) {
  const favoritesCount = useFavoritesStore((state) => state.items.length);

  const stats = [
    { title: 'سفارشات کل', value: totalOrdersCount.toString(), icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', href: '/profile/orders' },
    { title: 'در جریان', value: currentOrdersCount.toString(), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', href: '/profile/orders' },
    { title: 'علاقه‌مندی‌ها', value: favoritesCount.toString(), icon: Heart, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', href: '/profile/favorites' },
    { title: 'آدرس‌ها', value: addressesCount.toString(), icon: MapPin, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', href: '/profile/addresses' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Link href={stat.href} key={index} className="bg-white dark:bg-[#24303f] p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-gray-800 flex items-center gap-3 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} flex-shrink-0`}>
              <Icon size={18} className="md:w-5 md:h-5" />
            </div>
            <div className="overflow-hidden">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-tight">{stat.value}</h3>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{stat.title}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
