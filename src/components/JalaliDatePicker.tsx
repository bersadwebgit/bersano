'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { gregorianToJalali, jalaliToGregorian } from '@/lib/jalali';

interface JalaliDatePickerProps {
  value: string; // ISO string or datetime-local string (YYYY-MM-DDTHH:MM)
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function isJalaliLeap(jy: number): boolean {
  const r = jy % 33;
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(r);
}

function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

function getFirstDayWeekday(jy: number, jm: number): number {
  const gDate = jalaliToGregorian(jy, jm, 1);
  const gDay = gDate.getDay(); // 0-6 (Sun-Sat)
  // Map Sat(6)->0, Sun(0)->1, Mon(1)->2, Tue(2)->3, Wed(3)->4, Thu(4)->5, Fri(5)->6
  return (gDay + 1) % 7;
}

export default function JalaliDatePicker({ value, onChange, required = false, className = '' }: JalaliDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  const initialDate = value ? new Date(value) : new Date();
  const initialJalali = gregorianToJalali(isNaN(initialDate.getTime()) ? new Date() : initialDate);

  const [currentYear, setCurrentYear] = useState(initialJalali.jy);
  const [currentMonth, setCurrentMonth] = useState(initialJalali.jm);
  const [selectedDay, setSelectedDay] = useState(initialJalali.jd);
  const [hour, setHour] = useState(initialJalali.hour);
  const [minute, setMinute] = useState(initialJalali.minute);

  // Sync state with value prop when it changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const j = gregorianToJalali(d);
        setCurrentYear(j.jy);
        setCurrentMonth(j.jm);
        setSelectedDay(j.jd);
        setHour(j.hour);
        setMinute(j.minute);
      }
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = getJalaliMonthDays(currentYear, currentMonth);
  const firstDayWeekday = getFirstDayWeekday(currentYear, currentMonth);

  // Generate days grid
  const blanks = Array(firstDayWeekday).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const gridCells = [...blanks, ...days];

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    updateValue(currentYear, currentMonth, day, hour, minute);
  };

  const handleTimeChange = (newHour: number, newMinute: number) => {
    setHour(newHour);
    setMinute(newMinute);
    updateValue(currentYear, currentMonth, selectedDay, newHour, newMinute);
  };

  const updateValue = (jy: number, jm: number, jd: number, h: number, m: number) => {
    const gDate = jalaliToGregorian(jy, jm, jd, h, m);
    
    // Format as YYYY-MM-DDTHH:MM for datetime-local compatibility
    const yearStr = gDate.getFullYear();
    const monthStr = String(gDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(gDate.getDate()).padStart(2, '0');
    const hourStr = String(gDate.getHours()).padStart(2, '0');
    const minStr = String(gDate.getMinutes()).padStart(2, '0');
    
    onChange(`${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minStr}`);
  };

  const formattedJalaliValue = value ? (() => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const j = gregorianToJalali(d);
    return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')} ${String(j.hour).padStart(2, '0')}:${String(j.minute).padStart(2, '0')}`;
  })() : '';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          value={formattedJalaliValue}
          placeholder="انتخاب تاریخ و زمان شمسی"
          required={required}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-gray-900 dark:text-white font-mono text-sm cursor-pointer"
        />
        <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-[320px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 select-none right-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-white text-sm">
              <span>{MONTH_NAMES[currentMonth - 1]}</span>
              <select
                value={currentYear}
                onChange={e => {
                  const y = Number(e.target.value);
                  setCurrentYear(y);
                  updateValue(y, currentMonth, selectedDay, hour, minute);
                }}
                className="bg-transparent border-none outline-none cursor-pointer text-gray-800 dark:text-white font-mono font-bold"
              >
                {Array.from({ length: 20 }, (_, i) => 1405 + i).map(y => (
                  <option key={y} value={y} className="bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAYS.map((day, index) => (
              <div
                key={index}
                className={`text-xs font-bold py-1 ${index === 6 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center mb-4">
            {gridCells.map((day, index) => {
              if (day === null) {
                return <div key={`blank-${index}`} className="py-1.5" />;
              }

              const isSelected =
                currentYear === initialJalali.jy &&
                currentMonth === initialJalali.jm &&
                day === selectedDay;

              const isToday = (() => {
                const todayJ = gregorianToJalali(new Date());
                return currentYear === todayJ.jy && currentMonth === todayJ.jm && day === todayJ.jd;
              })();

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`py-1.5 text-xs font-mono rounded-lg transition-all ${
                    isSelected
                      ? 'bg-red-500 text-white font-bold'
                      : isToday
                      ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/50'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Picker */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
              <Clock className="w-4 h-4" />
              <span>زمان:</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-sm" dir="ltr">
              <select
                value={hour}
                onChange={e => handleTimeChange(Number(e.target.value), minute)}
                className="px-1.5 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-800 dark:text-white"
              >
                {Array.from({ length: 24 }, (_, i) => i).map(h => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span className="text-gray-400">:</span>
              <select
                value={minute}
                onChange={e => handleTimeChange(hour, Number(e.target.value))}
                className="px-1.5 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-800 dark:text-white"
              >
                {Array.from({ length: 60 }, (_, i) => i).map(m => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-4 w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            تایید
          </button>
        </div>
      )}
    </div>
  );
}
