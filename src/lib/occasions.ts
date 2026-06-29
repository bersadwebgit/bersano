// Curated, deterministic occasion calendar for the AI content planner.
// All Jalali (solar) and fixed-Gregorian dates are exact and never guessed.
// Lunar (Hijri) occasions are intentionally excluded here because they drift
// ~11 days/year and cannot be derived accurately without a Hijri library.

import { gregorianToJalali, jalaliToGregorian } from './jalali';

export type OccasionCalendarType = 'jalali' | 'gregorian';

export interface OccasionDefinition {
  key: string;
  title: string; // Persian display name
  calendar: OccasionCalendarType;
  month: number; // jalali month (1-12) or gregorian month (1-12)
  day: number;
  category: string; // national | seasonal | romantic | commercial | educational
  commerceAngle: string; // short hint about the sales/marketing angle
  leadDays: number; // recommended days to publish content BEFORE the occasion
}

export interface UpcomingOccasion extends OccasionDefinition {
  date: string; // ISO Gregorian date of the occasion (next occurrence)
  jalaliLabel: string; // e.g. "۳۰ آذر ۱۴۰۴"
  suggestedPublishAt: string; // ISO date = occasion date minus leadDays
  daysUntil: number;
}

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

// Fixed occasions on the solar (Jalali) calendar — exact every year.
const JALALI_OCCASIONS: OccasionDefinition[] = [
  { key: 'nowruz', title: 'نوروز و سال نو', calendar: 'jalali', month: 1, day: 1, category: 'national', commerceAngle: 'هدیه نوروزی، خرید عید، آجیل و پوشاک نو', leadDays: 14 },
  { key: 'sizdah-bedar', title: 'سیزده‌به‌در (روز طبیعت)', calendar: 'jalali', month: 1, day: 13, category: 'national', commerceAngle: 'لوازم سفر و پیک‌نیک، طبیعت‌گردی', leadDays: 7 },
  { key: 'teacher-day', title: 'روز معلم', calendar: 'jalali', month: 2, day: 12, category: 'national', commerceAngle: 'هدیه برای معلمان و اساتید', leadDays: 7 },
  { key: 'summer-sale', title: 'آغاز تابستان و حراج تابستانه', calendar: 'jalali', month: 4, day: 1, category: 'seasonal', commerceAngle: 'محصولات تابستانی، خنک‌کننده، سفر', leadDays: 10 },
  { key: 'back-to-school', title: 'بازگشایی مدارس (مهر)', calendar: 'jalali', month: 7, day: 1, category: 'educational', commerceAngle: 'لوازم‌التحریر، کیف و کفش، تجهیزات درسی', leadDays: 14 },
  { key: 'student-day', title: 'روز دانش‌آموز', calendar: 'jalali', month: 8, day: 13, category: 'educational', commerceAngle: 'تخفیف دانش‌آموزی و لوازم آموزشی', leadDays: 5 },
  { key: 'university-student-day', title: 'روز دانشجو', calendar: 'jalali', month: 9, day: 16, category: 'educational', commerceAngle: 'تخفیف دانشجویی، گجت و کتاب', leadDays: 5 },
  { key: 'yalda', title: 'شب یلدا (شب چله)', calendar: 'jalali', month: 9, day: 30, category: 'national', commerceAngle: 'آجیل، میوه، هدیه یلدا، دورهمی', leadDays: 12 },
  { key: 'sepandarmazgan', title: 'سپندارمذگان (روز عشق ایرانی)', calendar: 'jalali', month: 12, day: 5, category: 'romantic', commerceAngle: 'هدیه عاشقانه، ست هدیه، محصولات لوکس', leadDays: 8 },
  { key: 'year-end-cleaning', title: 'خانه‌تکانی و حراج پایان سال', calendar: 'jalali', month: 12, day: 1, category: 'seasonal', commerceAngle: 'لوازم خانه، نظافت، خرید پایان سال', leadDays: 12 },
];

// Fixed occasions on the Gregorian calendar — exact every year.
const GREGORIAN_OCCASIONS: OccasionDefinition[] = [
  { key: 'valentine', title: 'ولنتاین (روز عشق)', calendar: 'gregorian', month: 2, day: 14, category: 'romantic', commerceAngle: 'هدیه عاشقانه، ست‌های دونفره، شکلات و گل', leadDays: 10 },
  { key: 'singles-day', title: 'جشنواره فروش ۱۱:۱۱', calendar: 'gregorian', month: 11, day: 11, category: 'commercial', commerceAngle: 'حراج بزرگ آنلاین، تخفیف ویژه روز مجردها', leadDays: 7 },
];

function toPersianDigits(input: string | number): string {
  const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(input).replace(/[0-9]/g, (d) => map[Number(d)]);
}

function jalaliLabelFromDate(date: Date): string {
  const { jy, jm, jd } = gregorianToJalali(date);
  return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

// "Today" anchored to Tehran local date so occasion matching matches Iran time.
function getTehranToday(): Date {
  const tehranString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Tehran' });
  return startOfDay(new Date(tehranString));
}

// Black Friday = the 4th Friday of November for a given Gregorian year.
function blackFridayForYear(gy: number): Date {
  const nov1 = new Date(gy, 10, 1);
  const firstFridayOffset = (5 - nov1.getDay() + 7) % 7; // 5 = Friday
  const firstFriday = 1 + firstFridayOffset;
  return new Date(gy, 10, firstFriday + 21); // 4th Friday
}

function nextOccurrence(def: OccasionDefinition, today: Date): Date {
  if (def.calendar === 'gregorian') {
    let candidate = startOfDay(new Date(today.getFullYear(), def.month - 1, def.day));
    if (candidate < today) {
      candidate = startOfDay(new Date(today.getFullYear() + 1, def.month - 1, def.day));
    }
    return candidate;
  }
  // jalali
  const { jy } = gregorianToJalali(today);
  let candidate = startOfDay(jalaliToGregorian(jy, def.month, def.day));
  if (candidate < today) {
    candidate = startOfDay(jalaliToGregorian(jy + 1, def.month, def.day));
  }
  return candidate;
}

function buildUpcoming(def: OccasionDefinition, occasionDate: Date, today: Date): UpcomingOccasion {
  const suggested = new Date(occasionDate.getTime() - def.leadDays * 24 * 60 * 60 * 1000);
  // Never suggest a publish date in the past.
  const safeSuggested = suggested < today ? today : suggested;
  const daysUntil = Math.round((occasionDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  return {
    ...def,
    date: occasionDate.toISOString(),
    jalaliLabel: jalaliLabelFromDate(occasionDate),
    suggestedPublishAt: safeSuggested.toISOString(),
    daysUntil,
  };
}

/**
 * Returns evenly spread publish slots across the planning window so evergreen /
 * product-driven content can be scheduled without guessing dates or landing in the past.
 */
export function getPublishingSlots(monthsAhead = 3, everyDays = 6, max = 16): { date: string; jalaliLabel: string }[] {
  const today = getTehranToday();
  const windowEnd = new Date(today.getTime() + monthsAhead * 30 * 24 * 60 * 60 * 1000);
  const slots: { date: string; jalaliLabel: string }[] = [];

  // Start a few days out so there is lead time to prepare content.
  let cursor = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  while (cursor <= windowEnd && slots.length < max) {
    const d = startOfDay(cursor);
    slots.push({ date: d.toISOString(), jalaliLabel: jalaliLabelFromDate(d) });
    cursor = new Date(cursor.getTime() + everyDays * 24 * 60 * 60 * 1000);
  }
  return slots;
}

/**
 * Returns the list of upcoming occasions within the given window (in months),
 * each enriched with exact Gregorian + Jalali dates and a recommended publish date.
 */
export function getUpcomingOccasions(monthsAhead = 3): UpcomingOccasion[] {
  const today = getTehranToday();
  const windowEnd = new Date(today.getTime() + monthsAhead * 30 * 24 * 60 * 60 * 1000);

  const result: UpcomingOccasion[] = [];

  for (const def of [...JALALI_OCCASIONS, ...GREGORIAN_OCCASIONS]) {
    const occasionDate = nextOccurrence(def, today);
    if (occasionDate >= today && occasionDate <= windowEnd) {
      result.push(buildUpcoming(def, occasionDate, today));
    }
  }

  // Computed occasion: Black Friday (and the following commerce window).
  const bfDef: OccasionDefinition = {
    key: 'black-friday', title: 'بلک‌فرایدی (جمعه سیاه)', calendar: 'gregorian', month: 11, day: 0,
    category: 'commercial', commerceAngle: 'بزرگ‌ترین حراج سال، تخفیف‌های پلکانی', leadDays: 7,
  };
  for (const gy of [today.getFullYear(), today.getFullYear() + 1]) {
    const bf = startOfDay(blackFridayForYear(gy));
    if (bf >= today && bf <= windowEnd && !result.some(r => r.key === 'black-friday')) {
      result.push(buildUpcoming(bfDef, bf, today));
    }
  }

  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
