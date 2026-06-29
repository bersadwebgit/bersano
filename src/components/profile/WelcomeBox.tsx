'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, X } from 'lucide-react';

interface WelcomeBoxProps {
  userName: string;
}

export default function WelcomeBox({ userName }: WelcomeBoxProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-gradient-to-l from-indigo-50/80 to-white dark:from-indigo-900/10 dark:to-[#24303f] p-4 md:p-5 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30 shadow-sm">
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-3 left-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
        aria-label="بستن"
      >
        <X size={18} />
      </button>

      <div className="pl-8">
        <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-1">
          خوش آمدید، {userName}! 👋
        </h1>
        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
          فعالیت‌ها و سفارشات اخیر خود را مدیریت کنید.
        </p>
      </div>
      
      <Link 
        href="/"
        className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-sm font-medium transition-colors sm:w-auto w-full shadow-sm"
      >
        <ShoppingBag size={16} />
        ادامه خرید
      </Link>
    </div>
  );
}
