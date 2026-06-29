// [HARDENED] — validation, error isolation, save safety
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  Home, 
  Sparkles, 
  ArrowRight,
  Eye,
  Settings,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Link as LinkIcon,
  Sliders,
  EyeOff,
  MoveUp,
  MoveDown,
  Smile,
  Upload,
  Search,
  ChevronDown,
  BookOpen,
  FileText,
  Award,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wand2,
  AlertTriangle,
  GripVertical,
  RefreshCw
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import Image from 'next/image';

const RECOMMENDED_ICONS = [
  { name: 'Truck', label: 'ارسال / حمل و نقل' },
  { name: 'RotateCcw', label: 'بازگشت کالا' },
  { name: 'PhoneCall', label: 'پشتیبانی تلفنی' },
  { name: 'Headphones', label: 'پشتیبانی آنلاین' },
  { name: 'CreditCard', label: 'پرداخت آنلاین' },
  { name: 'ShieldCheck', label: 'امنیت / ضمانت' },
  { name: 'Clock', label: 'ساعت / زمان' },
  { name: 'Gift', label: 'هدیه / آفر' },
  { name: 'Award', label: 'مدال / کیفیت' },
  { name: 'Heart', label: 'علاقه‌مندی' },
  { name: 'Sparkles', label: 'ستاره / ویژه' },
  { name: 'Percent', label: 'تخفیف' },
  { name: 'HelpCircle', label: 'راهنما' },
  { name: 'Store', label: 'فروشگاه' },
  { name: 'ShoppingBag', label: 'کیف خرید' },
  { name: 'ThumbsUp', label: 'رضایت خریداران' },
  { name: 'MapPin', label: 'آدرس / مکان' },
];

const ALL_SECTIONS = [
  { id: 'stories', label: 'بخش استوری‌ها', desc: 'نمایش استوری‌های فعال فروشگاه', icon: 'Smile', toggleKey: 'showStories', targetElementId: 'landingDetails' },
  { id: 'slider', label: 'اسلایدر اصلی تصاویر', desc: 'نمایش اسلایدهای سراسری یا اختصاصی', icon: 'Sliders', toggleKey: 'showSlider', targetElementId: 'sliderSettings' },
  { id: 'shoppable', label: 'خرید تصویری تعاملی', desc: 'بخش خرید مستقیم از روی تصاویر', icon: 'Sparkles', toggleKey: 'showShoppable', targetElementId: 'landingDetails' },
  { id: 'specialDeals', label: 'پیشنهادات شگفت‌انگیز', desc: 'محصولات ویژه و تخفیف‌دار زمان‌دار', icon: 'Clock', toggleKey: 'specialDealsEnabled', targetElementId: null },
  { id: 'hero', label: 'بنر خوش‌آمدگویی (Hero)', desc: 'عنوان، زیرعنوان و دکمه ورود به فروشگاه', icon: 'Home', toggleKey: 'showHero', targetElementId: 'landingDetails' },
  { id: 'features', label: 'ویژگی‌های فروشگاه (مزایا)', desc: 'نوار مزایای رقابتی (مانند ارسال رایگان)', icon: 'CheckCircle2', toggleKey: 'showFeatures', targetElementId: 'featuresSettings' },
  { id: 'categoryQuickAccess', label: 'دسترسی سریع دسته‌بندی‌ها', desc: 'دسترسی سریع به دسته‌ها به صورت ردیفی یا عمودی', icon: 'Search', toggleKey: 'showCategoryQuickAccess', targetElementId: 'landingDetails' },
  { id: 'middleBanners', label: 'بنرهای تبلیغاتی میانی', desc: 'بنرهای کمپین‌ها و برندهای خاص', icon: 'ImageIcon', toggleKey: 'showMiddleBanners', targetElementId: 'middleBannersSettings' },
  { id: 'featuredProducts', label: 'تب‌های محصولات', desc: 'تب‌های پرفروش‌ترین، جدیدترین و تخفیف‌دار', icon: 'ShoppingBag', toggleKey: null, targetElementId: null },
  { id: 'blog', label: 'آخرین مطالب وبلاگ', desc: 'نمایش آخرین مقالات وبلاگ به صورت کاروسل مینیمال', icon: 'BookOpen', toggleKey: 'showBlog', targetElementId: 'blogSettings' },
  { id: 'reviews', label: 'نظرات مشتریان', desc: 'نمایش نظرات تایید شده خریداران', icon: 'ThumbsUp', toggleKey: 'showReviews', targetElementId: 'reviewsSettings' },
  { id: 'brands', label: 'کاروسل برندها (همکاران)', desc: 'نمایش برندهای محبوب و همکار به صورت کاروسل روان و مینیمال', icon: 'Award', toggleKey: 'showBrands', targetElementId: 'brandsSettings' },
  { id: 'customText', label: 'باکس متنی دلخواه', desc: 'نمایش یک باکس متنی با عنوان و محتوای دلخواه در صفحه اصلی', icon: 'FileText', toggleKey: 'showCustomText', targetElementId: 'customTextSettings' }
];

export default function CustomHomeSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [activeTab, setActiveTab] = useState<'layout' | 'slides' | 'banners_features' | 'content'>('layout');

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const currentOrder = formData.sectionOrder || [
      'stories', 'slider', 'shoppable', 'specialDeals', 'hero', 'features',
      'categoryQuickAccess', 'middleBanners', 'featuredProducts', 'blog', 'reviews', 'brands', 'customText'
    ];

    const newOrder = [...currentOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    setFormData((prev: any) => ({
      ...prev,
      sectionOrder: newOrder
    }));

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const toggleSectionActive = (sectionId: string, sectionMeta: any) => {
    if (sectionId.startsWith('customText_')) {
      const boxId = sectionId.replace('customText_', '');
      setFormData((prev: any) => {
        const updatedBoxes = (prev.customTextBoxes || []).map((b: any) => {
          if (b.id === boxId) {
            return { ...b, isActive: !b.isActive };
          }
          return b;
        });
        return { ...prev, customTextBoxes: updatedBoxes };
      });
    } else if (sectionMeta.toggleKey) {
      setFormData((prev: any) => ({
        ...prev,
        [sectionMeta.toggleKey]: !prev[sectionMeta.toggleKey]
      }));
    }
  };

  const handleResetSectionOrder = () => {
    const defaultOrder = [
      'stories',
      'slider',
      'shoppable',
      'specialDeals',
      'hero',
      'features',
      'categoryQuickAccess',
      'middleBanners',
      'featuredProducts',
      'blog',
      'reviews',
      'brands',
      'customText'
    ];
    setFormData((prev: any) => ({
      ...prev,
      sectionOrder: defaultOrder
    }));
    setMessage({
      type: 'success',
      text: 'ترتیب بخش‌ها به حالت پیش‌فرض بازنشانی شد.'
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const tabsRef = useRef<HTMLDivElement>(null);
  const scrollInterval = useRef<NodeJS.Timeout | null>(null);

  const startScrolling = (direction: 'left' | 'right') => {
    stopScrolling();
    scrollInterval.current = setInterval(() => {
      if (tabsRef.current) {
        tabsRef.current.scrollBy({
          left: direction === 'left' ? -15 : 15,
          behavior: 'auto'
        });
      }
    }, 16);
  };

  const stopScrolling = () => {
    if (scrollInterval.current) {
      clearInterval(scrollInterval.current);
      scrollInterval.current = null;
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -100 : 100,
        behavior: 'smooth'
      });
    }
  };

  const tabs = [
    {
      id: 'layout',
      title: 'ساختار و چیدمان',
      description: 'نوع نمایش صفحه اصلی و اولویت‌بندی بخش‌ها',
      icon: Sliders,
    },
    {
      id: 'slides',
      title: 'اسلایدرها و لندینگ',
      description: 'تنظیمات اسلایدر سراسری، تصاویر و لندینگ اختصاصی',
      icon: ImageIcon,
    },
    {
      id: 'banners_features',
      title: 'بنرها و مزایا',
      description: 'ویژگی‌های فروشگاه، بنرهای تبلیغاتی میانی و برندها',
      icon: Sparkles,
    },
    {
      id: 'content',
      title: 'وبلاگ، نظرات و متن',
      description: 'تنظیمات آخرین مطالب وبلاگ، نظرات و باکس‌های دلخواه',
      icon: FileText,
    },
  ];

  const [minimizedSections, setMinimizedSections] = useState<Record<string, boolean>>({
    homePageType: false,
    sectionOrdering: false,
    slider: false,
    landingDetails: false,
    sliderManagement: false,
    features: false,
    middleBanners: false,
    brands: false,
    customText: false,
  });

  const toggleSection = (section: string) => {
    setMinimizedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // AI Assistant for Custom Home Settings
  const [promptInput, setPromptInput] = useState('');
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState('');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);

  const [formData, setFormData] = useState<any>({
    homePageType: 'custom',
    heroTitle: 'به فروشگاه ما خوش آمدید',
    heroSubtitle: 'بهترین محصولات با بالاترین کیفیت',
    heroCtaText: 'ورود به فروشگاه',
    heroCtaUrl: '/shop',
    showStories: true,
    showSlider: false,
    showHero: true,
    showCategoryQuickAccess: true,
    categoryQuickAccessLayout: 'row', // 'list' or 'row'
    sliderDisplayLocation: 'both', // 'shop', 'custom', 'both'
    isLandingActive: true,
    inactiveReason: 'صفحه اصلی موقتاً غیرفعال شده است. لطفاً مستقیماً وارد فروشگاه شوید.',
    showReviews: true,
    reviewsTitle: 'نظرات مشتریان ما',
    reviewsSubtitle: 'ببینید خریداران قبلی درباره ما چه می‌گویند',
    reviewsLimit: 6,
    showBlog: false,
    blogTitle: 'آخرین مطالب وبلاگ',
    blogSubtitle: 'جدیدترین مقالات و آموزش‌های ما',
    blogLimit: 6,
    showMiddleBanners: false,
    middleBanners: [],
    showBrands: false,
    brandsTitle: 'برندهای محبوب',
    brandsSubtitle: 'مجموعه‌ای از برترین برندها و همکاران تجاری ما',
    brands: [],
    showFeatures: true,
    showShoppable: true,
    showCustomText: false,
    customTextTitle: 'درباره فروشگاه ما',
    customTextContent: '',
    customTextImage: '',
    customTextImagePosition: 'right', // 'right' or 'left'
    customTextCtaText: '',
    customTextCtaUrl: '',
    customTextBoxes: [],
    features: [
      { id: '1', title: 'ارسال رایگان', desc: 'بالای مبلغ مشخص', icon: 'Truck', iconType: 'lucide' },
      { id: '2', title: 'ضمانت بازگشت کالا', desc: '۷ روز ضمانت بازگشت وجه', icon: 'RotateCcw', iconType: 'lucide' },
      { id: '3', title: 'پشتیبانی ۲۴ ساعته', desc: 'همیشه پاسخگوی شما هستیم', icon: 'PhoneCall', iconType: 'lucide' },
      { id: '4', title: 'پرداخت امن و آسان', desc: 'درگاه‌های بانکی معتبر', icon: 'CreditCard', iconType: 'lucide' }
    ],
    sectionOrder: [
      'stories',
      'slider',
      'shoppable',
      'specialDeals',
      'hero',
      'features',
      'categoryQuickAccess',
      'middleBanners',
      'featuredProducts',
      'blog',
      'reviews',
      'brands',
      'customText'
    ]
  });

  const [slides, setSlides] = useState<any[]>([]);
  const [slidesLoading, setSlidesLoading] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<any>({
    imageUrl: "",
    mobileImageUrl: "",
    title: "",
    subtitle: "",
    linkUrl: "",
    linkText: "",
    isActive: true,
    order: 0,
  });
  const [showMediaPicker, setShowMediaPicker] = useState<string | null>(null);

  // Feature editing helper states
  const [activeFeatureTab, setActiveFeatureTab] = useState<number>(0);
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null);
  const [showIconPickerForIndex, setShowIconPickerForIndex] = useState<number | null>(null);
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchSlides();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.categories) {
          setAllCategories(data.categories);
        }
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchSlides = async () => {
    setSlidesLoading(true);
    try {
      const res = await fetch('/api/admin/slider');
      if (res.ok) {
        const data = await res.json();
        setSlides(data);
      }
    } catch (e) {
      console.error('Error fetching slides:', e);
    } finally {
      setSlidesLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          let customHome = {
            heroTitle: 'به فروشگاه ما خوش آمدید',
            heroSubtitle: 'بهترین محصولات با بالاترین کیفیت',
            heroCtaText: 'ورود به فروشگاه',
            heroCtaUrl: '/shop',
            showStories: true,
            showSlider: false,
            showHero: true,
            showWelcomeBanner: true,
            welcomeTitle: 'به فروشگاه رسمی {shopName} خوش آمدید',
            welcomeFeature1: 'ضمانت اصالت کالا',
            welcomeFeature2: 'پشتیبانی سریع',
            welcomeFeature3: 'ارسال به سراسر کشور',
            showCategoryQuickAccess: true,
            categoryQuickAccessLayout: 'row',
            sliderDisplayLocation: 'both',
            isLandingActive: true,
            inactiveReason: 'صفحه اصلی موقتاً غیرفعال شده است. لطفاً مستقیماً وارد فروشگاه شوید.',
            showFeatures: true,
            showMiddleBanners: false,
            middleBanners: [],
            showShoppable: true,
            useSelectedCategoriesOnly: false,
            homeCategories: [],
            showBlog: false,
            blogTitle: 'آخرین مطالب وبلاگ',
            blogSubtitle: 'جدیدترین مقالات و آموزش‌های ما',
            blogLimit: 6,
            showBrands: false,
            brandsTitle: 'برندهای محبوب',
            brandsSubtitle: 'مجموعه‌ای از برترین برندها و همکاران تجاری ما',
            brands: [],
            showCustomText: false,
            customTextTitle: 'درباره فروشگاه ما',
            customTextContent: '',
            customTextImage: '',
            customTextImagePosition: 'right',
            customTextCtaText: '',
            customTextCtaUrl: '',
            customTextBoxes: [],
            features: [
              { id: '1', title: 'ارسال رایگان', desc: 'بالای مبلغ مشخص', icon: 'Truck', iconType: 'lucide' },
              { id: '2', title: 'ضمانت بازگشت کالا', desc: '۷ روز ضمانت بازگشت وجه', icon: 'RotateCcw', iconType: 'lucide' },
              { id: '3', title: 'پشتیبانی ۲۴ ساعته', desc: 'همیشه پاسخگوی شما هستیم', icon: 'PhoneCall', iconType: 'lucide' },
              { id: '4', title: 'پرداخت امن و آسان', desc: 'درگاه‌های بانکی معتبر', icon: 'CreditCard', iconType: 'lucide' }
            ],
            sectionOrder: [
              'stories',
              'slider',
              'shoppable',
              'specialDeals',
              'hero',
              'features',
              'categoryQuickAccess',
              'middleBanners',
              'featuredProducts',
              'blog',
              'reviews',
              'customText'
            ]
          };
          if (data.settings.customHomeConfig) {
            try {
              const parsed = JSON.parse(data.settings.customHomeConfig);
              let loadedOrder = parsed.sectionOrder || customHome.sectionOrder;
              
              // Migrate legacy 'customText' to individual customText_[ID] sections
              const boxes = parsed.customTextBoxes || [];
              const legacyTitle = parsed.customTextTitle || customHome.customTextTitle;
              const legacyContent = parsed.customTextContent || customHome.customTextContent;
              
              let finalBoxes = [...boxes];
              if (finalBoxes.length === 0 && (legacyTitle || legacyContent)) {
                finalBoxes = [{
                  id: 'legacy-1',
                  title: legacyTitle,
                  content: legacyContent,
                  imageUrl: parsed.customTextImage || '',
                  imagePosition: parsed.customTextImagePosition || 'right',
                  ctaText: parsed.customTextCtaText || '',
                  ctaUrl: parsed.customTextCtaUrl || '',
                  isActive: parsed.showCustomText !== undefined ? parsed.showCustomText : true
                }];
              }

              if (loadedOrder.includes('customText')) {
                const idx = loadedOrder.indexOf('customText');
                const boxSections = finalBoxes.map((b: any) => `customText_${b.id}`);
                if (boxSections.length > 0) {
                  loadedOrder.splice(idx, 1, ...boxSections);
                } else {
                  loadedOrder.splice(idx, 1);
                }
              }

              // Ensure all active custom text box sections are in loadedOrder
              finalBoxes.forEach((box: any) => {
                const secId = `customText_${box.id}`;
                if (!loadedOrder.includes(secId)) {
                  loadedOrder.push(secId);
                }
              });

              const defaultSections = [
                'stories',
                'slider',
                'shoppable',
                'specialDeals',
                'hero',
                'features',
                'categoryQuickAccess',
                'middleBanners',
                'featuredProducts',
                'blog',
                'reviews',
                'brands'
              ];
              defaultSections.forEach(sec => {
                if (!loadedOrder.includes(sec)) {
                  loadedOrder = [...loadedOrder, sec];
                }
              });
              customHome = { ...customHome, ...parsed, sectionOrder: loadedOrder };
            } catch (e) {}
          }

          setFormData({
            homePageType: data.settings.homePageType || 'custom',
            heroTitle: customHome.heroTitle,
            heroSubtitle: customHome.heroSubtitle,
            heroCtaText: customHome.heroCtaText,
            heroCtaUrl: customHome.heroCtaUrl,
            showStories: customHome.showStories,
            showSlider: customHome.showSlider,
            showHero: customHome.showHero,
            showWelcomeBanner: (customHome as any).showWelcomeBanner !== undefined ? (customHome as any).showWelcomeBanner : true,
            welcomeTitle: (customHome as any).welcomeTitle || 'به فروشگاه رسمی {shopName} خوش آمدید',
            welcomeFeature1: (customHome as any).welcomeFeature1 || 'ضمانت اصالت کالا',
            welcomeFeature2: (customHome as any).welcomeFeature2 || 'پشتیبانی سریع',
            welcomeFeature3: (customHome as any).welcomeFeature3 || 'ارسال به سراسر کشور',
            showCategoryQuickAccess: customHome.showCategoryQuickAccess !== undefined ? customHome.showCategoryQuickAccess : true,
            categoryQuickAccessLayout: customHome.categoryQuickAccessLayout || 'row',
            useSelectedCategoriesOnly: (customHome as any).useSelectedCategoriesOnly !== undefined ? (customHome as any).useSelectedCategoriesOnly : false,
            homeCategories: (customHome as any).homeCategories || [],
            sliderDisplayLocation: customHome.sliderDisplayLocation || 'both',
            isLandingActive: customHome.isLandingActive !== undefined ? customHome.isLandingActive : true,
            inactiveReason: customHome.inactiveReason || 'صفحه اصلی موقتاً غیرفعال شده است. لطفاً مستقیماً وارد فروشگاه شوید.',
            showFeatures: customHome.showFeatures !== undefined ? customHome.showFeatures : true,
            showMiddleBanners: customHome.showMiddleBanners !== undefined ? customHome.showMiddleBanners : false,
            middleBanners: customHome.middleBanners || [],
            showBrands: customHome.showBrands !== undefined ? customHome.showBrands : false,
            brandsTitle: customHome.brandsTitle || 'برندهای محبوب',
            brandsSubtitle: customHome.brandsSubtitle || 'مجموعه‌ای از برترین برندها و همکاران تجاری ما',
            brands: customHome.brands || [],
            showShoppable: customHome.showShoppable !== undefined ? customHome.showShoppable : true,
            showBlog: customHome.showBlog !== undefined ? customHome.showBlog : false,
            blogTitle: customHome.blogTitle || 'آخرین مطالب وبلاگ',
            blogSubtitle: customHome.blogSubtitle || 'جدیدترین مقالات و آموزش‌های ما',
            blogLimit: customHome.blogLimit || 6,
            showCustomText: (customHome as any).showCustomText !== undefined ? (customHome as any).showCustomText : false,
            customTextTitle: (customHome as any).customTextTitle || 'درباره فروشگاه ما',
            customTextContent: (customHome as any).customTextContent || '',
            customTextImage: (customHome as any).customTextImage || '',
            customTextImagePosition: (customHome as any).customTextImagePosition || 'right',
            customTextCtaText: (customHome as any).customTextCtaText || '',
            customTextCtaUrl: (customHome as any).customTextCtaUrl || '',
            customTextBoxes: (() => {
              let boxes = (customHome as any).customTextBoxes || [];
              const legacyTitle = (customHome as any).customTextTitle;
              const legacyContent = (customHome as any).customTextContent;
              if (boxes.length === 0 && (legacyTitle || legacyContent)) {
                boxes = [{
                  id: 'legacy-1',
                  title: legacyTitle || 'درباره فروشگاه ما',
                  content: legacyContent || '',
                  imageUrl: (customHome as any).customTextImage || '',
                  imagePosition: (customHome as any).customTextImagePosition || 'right',
                  ctaText: (customHome as any).customTextCtaText || '',
                  ctaUrl: (customHome as any).customTextCtaUrl || '',
                  isActive: (customHome as any).showCustomText !== undefined ? (customHome as any).showCustomText : true
                }];
              }
              return boxes;
            })(),
            features: customHome.features || [
              { id: '1', title: 'ارسال رایگان', desc: 'بالای مبلغ مشخص', icon: 'Truck', iconType: 'lucide' },
              { id: '2', title: 'ضمانت بازگشت کالا', desc: '۷ روز ضمانت بازگشت وجه', icon: 'RotateCcw', iconType: 'lucide' },
              { id: '3', title: 'پشتیبانی ۲۴ ساعته', desc: 'همیشه پاسخگوی شما هستیم', icon: 'PhoneCall', iconType: 'lucide' },
              { id: '4', title: 'پرداخت امن و آسان', desc: 'درگاه‌های بانکی معتبر', icon: 'CreditCard', iconType: 'lucide' }
            ],
            sectionOrder: customHome.sectionOrder,
          });
        }
      }
    } catch (error) {
      console.error('[ERROR] [CustomHomeSettings]: Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAiControl = async () => {
    if (!promptInput.trim()) return;

    setControlling(true);
    setControlError('');
    setControlSuccessMessage('');

    try {
      const res = await fetch('/api/admin/settings/custom-home/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          formData
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در کنترل هوشمند تنظیمات رخ داد.');
      }

      if (data.success) {
        setAiExplanation(data.explanation);
        setPendingFormData(data.formData);
        setAiWarnings(data.warnings || []);
        setShowAiConfirmModal(true);
      } else {
        setControlError(data.explanation || 'هوش مصنوعی نتوانست دستور را به درستی پردازش کند.');
      }
    } catch (err: any) {
      console.error(err);
      setControlError(err.message || 'ارتباط با سرور برقرار نشد.');
    } finally {
      setControlling(false);
    }
  };

  const handleSaveSlide = async () => {
    if (!currentSlide.imageUrl) {
      alert("انتخاب تصویر دسکتاپ الزامی است.");
      return;
    }

    try {
      const isUpdate = !!currentSlide.id;
      const url = isUpdate ? `/api/admin/slider/${currentSlide.id}` : "/api/admin/slider";
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentSlide),
      });

      if (res.ok) {
        setIsEditingSlide(false);
        fetchSlides();
        setMessage({ type: 'success', text: 'اسلاید با موفقیت ذخیره شد.' });
      } else {
        alert("خطا در ذخیره اطلاعات.");
      }
    } catch (error) {
      console.error("Error saving slide:", error);
    } finally {
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (!confirm("آیا از حذف این اسلاید اطمینان دارید؟")) return;

    try {
      const res = await fetch(`/api/admin/slider/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSlides();
        setMessage({ type: 'success', text: 'اسلاید با موفقیت حذف شد.' });
      }
    } catch (error) {
      console.error("Error deleting slide:", error);
    } finally {
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleMediaSelect = (url: string) => {
    if (showMediaPicker === "desktop") {
      setCurrentSlide({ ...currentSlide, imageUrl: url });
    } else if (showMediaPicker === "mobile") {
      setCurrentSlide({ ...currentSlide, mobileImageUrl: url });
    } else if (showMediaPicker && showMediaPicker.startsWith("feature-")) {
      const index = parseInt(showMediaPicker.split("-")[1]);
      handleUpdateFeature(index, "icon", url);
      handleUpdateFeature(index, "iconType", "upload");
    } else if (showMediaPicker && showMediaPicker.startsWith("middlebanner-")) {
      const index = parseInt(showMediaPicker.split("-")[1]);
      const updatedBanners = [...(formData.middleBanners || [])];
      updatedBanners[index] = { ...updatedBanners[index], imageUrl: url };
      setFormData((prev: any) => ({ ...prev, middleBanners: updatedBanners }));
    } else if (showMediaPicker && showMediaPicker.startsWith("homecategory-")) {
      const index = parseInt(showMediaPicker.split("-")[1]);
      const updatedCategories = [...(formData.homeCategories || [])];
      updatedCategories[index] = { ...updatedCategories[index], customImageUrl: url };
      setFormData((prev: any) => ({ ...prev, homeCategories: updatedCategories }));
    } else if (showMediaPicker && showMediaPicker.startsWith("brandlogo-")) {
      const index = parseInt(showMediaPicker.split("-")[1]);
      const updatedBrands = [...(formData.brands || [])];
      updatedBrands[index] = { ...updatedBrands[index], logoUrl: url };
      setFormData((prev: any) => ({ ...prev, brands: updatedBrands }));
    } else if (showMediaPicker === "customTextImage") {
      setFormData((prev: any) => ({ ...prev, customTextImage: url }));
    } else if (showMediaPicker && showMediaPicker.startsWith("customtextbox-")) {
      const index = parseInt(showMediaPicker.split("-")[1]);
      const updatedBoxes = [...(formData.customTextBoxes || [])];
      updatedBoxes[index] = { ...updatedBoxes[index], imageUrl: url };
      setFormData((prev: any) => ({ ...prev, customTextBoxes: updatedBoxes }));
    }
    setShowMediaPicker(null);
  };

  const handleAddMiddleBanner = () => {
    const newBanner = {
      id: Date.now().toString(),
      imageUrl: '',
      linkUrl: '',
      title: 'عنوان بنر جدید',
      subtitle: 'توضیح کوتاه بنر جدید',
      badge: 'کمپین فصلی',
      linkText: 'مشاهده و خرید',
      showOnDesktop: true,
      showOnTablet: true,
      showOnMobile: true,
    };
    setFormData((prev: any) => ({
      ...prev,
      middleBanners: [...(prev.middleBanners || []), newBanner]
    }));
  };

  const handleUpdateMiddleBanner = (index: number, key: string, value: any) => {
    setFormData((prev: any) => {
      const updatedBanners = [...(prev.middleBanners || [])];
      updatedBanners[index] = { ...updatedBanners[index], [key]: value };
      return { ...prev, middleBanners: updatedBanners };
    });
  };

  const handleDeleteMiddleBanner = (index: number) => {
    setFormData((prev: any) => {
      const updatedBanners = (prev.middleBanners || []).filter((_: any, idx: number) => idx !== index);
      return { ...prev, middleBanners: updatedBanners };
    });
  };

  const handleMoveMiddleBanner = (index: number, direction: 'up' | 'down') => {
    setFormData((prev: any) => {
      const banners = [...(prev.middleBanners || [])];
      if (direction === 'up' && index > 0) {
        const temp = banners[index];
        banners[index] = banners[index - 1];
        banners[index - 1] = temp;
      } else if (direction === 'down' && index < banners.length - 1) {
        const temp = banners[index];
        banners[index] = banners[index + 1];
        banners[index + 1] = temp;
      }
      return { ...prev, middleBanners: banners };
    });
  };

  const handleAddBrand = () => {
    const newBrand = {
      id: Date.now().toString(),
      name: 'نام برند',
      logoUrl: '',
      linkUrl: '',
    };
    setFormData((prev: any) => ({
      ...prev,
      brands: [...(prev.brands || []), newBrand]
    }));
  };

  const handleUpdateBrand = (index: number, key: string, value: any) => {
    setFormData((prev: any) => {
      const updatedBrands = [...(prev.brands || [])];
      updatedBrands[index] = { ...updatedBrands[index], [key]: value };
      return { ...prev, brands: updatedBrands };
    });
  };

  const handleDeleteBrand = (index: number) => {
    setFormData((prev: any) => {
      const updatedBrands = (prev.brands || []).filter((_: any, idx: number) => idx !== index);
      return { ...prev, brands: updatedBrands };
    });
  };

  const handleMoveBrand = (index: number, direction: 'up' | 'down') => {
    setFormData((prev: any) => {
      const brands = [...(prev.brands || [])];
      if (direction === 'up' && index > 0) {
        const temp = brands[index];
        brands[index] = brands[index - 1];
        brands[index - 1] = temp;
      } else if (direction === 'down' && index < brands.length - 1) {
        const temp = brands[index];
        brands[index] = brands[index + 1];
        brands[index + 1] = temp;
      }
      return { ...prev, brands };
    });
  };

  const handleAddCustomTextBox = () => {
    const newBox = {
      id: Date.now().toString(),
      title: 'باکس متنی جدید',
      content: '',
      imageUrl: '',
      imagePosition: 'right',
      ctaText: '',
      ctaUrl: '',
      isActive: true,
    };
    setFormData((prev: any) => ({
      ...prev,
      customTextBoxes: [...(prev.customTextBoxes || []), newBox]
    }));
  };

  const handleUpdateCustomTextBox = (index: number, key: string, value: any) => {
    setFormData((prev: any) => {
      const updatedBoxes = [...(prev.customTextBoxes || [])];
      updatedBoxes[index] = { ...updatedBoxes[index], [key]: value };
      return { ...prev, customTextBoxes: updatedBoxes };
    });
  };

  const handleDeleteCustomTextBox = (index: number) => {
    if (!confirm("آیا از حذف این باکس متنی اطمینان دارید؟")) return;
    setFormData((prev: any) => {
      const updatedBoxes = (prev.customTextBoxes || []).filter((_: any, idx: number) => idx !== index);
      return { ...prev, customTextBoxes: updatedBoxes };
    });
  };

  const handleMoveCustomTextBox = (index: number, direction: 'up' | 'down') => {
    setFormData((prev: any) => {
      const boxes = [...(prev.customTextBoxes || [])];
      if (direction === 'up' && index > 0) {
        const temp = boxes[index];
        boxes[index] = boxes[index - 1];
        boxes[index - 1] = temp;
      } else if (direction === 'down' && index < boxes.length - 1) {
        const temp = boxes[index];
        boxes[index] = boxes[index + 1];
        boxes[index + 1] = temp;
      }
      return { ...prev, customTextBoxes: boxes };
    });
  };

  const handleAddFeature = () => {
    const newFeature = {
      id: Date.now().toString(),
      title: 'عنوان ویژگی جدید',
      desc: 'توضیح کوتاه درباره ویژگی',
      icon: 'Sparkles',
      iconType: 'lucide'
    };
    setFormData((prev: any) => {
      const updatedFeatures = [...(prev.features || []), newFeature];
      setActiveFeatureTab(updatedFeatures.length - 1);
      return {
        ...prev,
        features: updatedFeatures
      };
    });
  };

  const handleDeleteFeature = (index: number) => {
    setFormData((prev: any) => {
      const updatedFeatures = prev.features.filter((_: any, i: number) => i !== index);
      setActiveFeatureTab(Math.max(0, index - 1));
      return {
        ...prev,
        features: updatedFeatures
      };
    });
  };

  const handleMoveFeature = (index: number, direction: 'up' | 'down') => {
    const features = [...(formData.features || [])];
    let newIndex = index;
    if (direction === 'up' && index > 0) {
      const temp = features[index];
      features[index] = features[index - 1];
      features[index - 1] = temp;
      newIndex = index - 1;
    } else if (direction === 'down' && index < features.length - 1) {
      const temp = features[index];
      features[index] = features[index + 1];
      features[index + 1] = temp;
      newIndex = index + 1;
    }
    setFormData((prev: any) => ({ ...prev, features }));
    setActiveFeatureTab(newIndex);
  };

  const handleUpdateFeature = (index: number, field: string, value: any) => {
    const features = [...(formData.features || [])];
    features[index] = { ...features[index], [field]: value };
    setFormData((prev: any) => ({ ...prev, features }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    const customHomeConfigObj = {
      heroTitle: formData.heroTitle,
      heroSubtitle: formData.heroSubtitle,
      heroCtaText: formData.heroCtaText,
      heroCtaUrl: formData.heroCtaUrl,
      showStories: formData.showStories,
      showSlider: formData.showSlider,
      showHero: formData.showHero,
      showWelcomeBanner: formData.showWelcomeBanner,
      welcomeTitle: formData.welcomeTitle,
      welcomeFeature1: formData.welcomeFeature1,
      welcomeFeature2: formData.welcomeFeature2,
      welcomeFeature3: formData.welcomeFeature3,
      showCategoryQuickAccess: formData.showCategoryQuickAccess,
      categoryQuickAccessLayout: formData.categoryQuickAccessLayout,
      useSelectedCategoriesOnly: formData.useSelectedCategoriesOnly || false,
      homeCategories: formData.homeCategories || [],
      sliderDisplayLocation: formData.sliderDisplayLocation,
      isLandingActive: formData.isLandingActive,
      inactiveReason: formData.inactiveReason,
      showFeatures: formData.showFeatures,
      showShoppable: formData.showShoppable,
      features: formData.features,
      showMiddleBanners: formData.showMiddleBanners,
      middleBanners: formData.middleBanners,
      showBrands: formData.showBrands,
      brandsTitle: formData.brandsTitle,
      brandsSubtitle: formData.brandsSubtitle,
      brands: formData.brands || [],
      showBlog: formData.showBlog,
      blogTitle: formData.blogTitle,
      blogSubtitle: formData.blogSubtitle,
      blogLimit: formData.blogLimit,
      showCustomText: formData.showCustomText,
      customTextTitle: formData.customTextTitle,
      customTextContent: formData.customTextContent,
      customTextImage: formData.customTextImage,
      customTextImagePosition: formData.customTextImagePosition,
      customTextCtaText: formData.customTextCtaText,
      customTextCtaUrl: formData.customTextCtaUrl,
      customTextBoxes: formData.customTextBoxes || [],
      sectionOrder: formData.sectionOrder,
    };

    // First, fetch existing settings to preserve other fields
    try {
      const getRes = await fetch('/api/settings');
      if (getRes.ok) {
        const getData = await getRes.json();
        const existing = getData.settings || {};

        const payload = {
          ...existing,
          homePageType: formData.homePageType,
          customHomeConfig: JSON.stringify(customHomeConfigObj),
        };

        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setMessage({ type: 'success', text: 'تنظیمات صفحه اصلی اختصاصی با موفقیت ذخیره شد.' });
          setSaveStatus('saved');
        } else {
          throw new Error('خطا در ذخیره تنظیمات');
        }
      } else {
        throw new Error('خطا در دریافت تنظیمات قبلی');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'خطا در ارتباط با سرور.' });
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => {
        setMessage({ type: '', text: '' });
        setSaveStatus('idle');
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3 select-none">
        <div className="w-10 h-10 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
        <span className="text-xs font-bold text-slate-450 dark:text-slate-500">در حال بارگذاری تنظیمات صفحه اصلی...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 select-none" dir="rtl">
      
      {/* Header Banner */}
      {message.text && message.type === 'error' && (
        <div style={{ border: '1px solid var(--color-border-danger)', background: 'var(--color-background-danger)', padding: '12px 16px', borderRadius: '8px', color: 'var(--color-text-danger)' }} className="mb-4 font-bold text-xs">
          ذخیره‌سازی ناموفق بود. تغییرات شما در این صفحه هنوز هستند. دوباره تلاش کنید یا صفحه را نبندید.
        </div>
      )}
      <div className="bg-gradient-to-r from-blue-600/[0.07] via-blue-600/[0.03] to-transparent dark:from-blue-500/10 dark:via-blue-500/5 dark:to-transparent rounded-3xl p-6 border border-blue-500/10 dark:border-blue-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <Home className="w-6 h-6 text-blue-500" />
            تنظیمات صفحه اصلی و لندینگ پیج اختصاصی
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">پیکربندی هویت بصری، بنر خوش‌آمدگویی، استوری‌ها و ساختار لندینگ پیج اختصاصی فروشگاه شما</p>
        </div>
        <button
          onClick={() => handleSubmit()}
          disabled={saving}
          data-testid="save-status"
          data-status-state={saveStatus}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98 hover:shadow-md shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? 'در حال ذخیره‌سازی...' : 'ذخیره تنظیمات'}
        </button>
      </div>

      {/* AI Assistant Card */}
      <div className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 animate-in fade-in duration-300">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-purple-600 text-white">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 dark:text-white">دستیار هوشمند تنظیمات صفحه اصلی (کنترل با پرامپت)</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
              با نوشتن دستورهای متنی به زبان ساده، هر بخشی از صفحه اصلی را که می‌خواهید تغییر دهید (مثال: "بخش وبلاگ را فعال کن و عنوانش را بگذار مقالات جدید، سپس ویژگی‌ها را ببر بالای اسلایدر")
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="مثال: بخش استوری‌ها و اسلایدر اصلی را فعال کن و عنوان بخش برندها را بگذار 'برندهای ما'..."
              className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-bold text-slate-800 dark:text-white placeholder:text-gray-450 dark:placeholder:text-gray-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyAiControl();
                }
              }}
              disabled={controlling}
            />
            <button
              type="button"
              disabled={controlling || !promptInput.trim()}
              onClick={handleApplyAiControl}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {controlling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال پردازش...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  اعمال دستور
                </>
              )}
            </button>
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold self-center ml-1">پیشنهادها:</span>
            {[
              'بخش اسلایدر اصلی را غیرفعال کن',
              'بخش استوری‌ها را فعال کن و ویژگی‌ها را ببر بالای اسلایدر',
              'عنوان بخش برندها را بگذار "برندهای همکار"'
            ].map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPromptInput(sug)}
                className="text-[10px] bg-white hover:bg-purple-50 dark:bg-slate-900 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30 px-2.5 py-1.5 rounded-xl transition-colors font-bold cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {controlError && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-1.5 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{controlError}</span>
            </div>
          )}

          {controlSuccessMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/30 flex flex-col gap-1.5 animate-in fade-in duration-200">
              <span className="font-black">عملیات با موفقیت انجام شد:</span>
              <p className="leading-relaxed whitespace-pre-line">{controlSuccessMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Confirmation Modal */}
      {showAiConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-150 dark:border-slate-800 shadow-xl overflow-hidden animate-scaleIn" dir="rtl">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">تایید تغییرات پیشنهادی هوش مصنوعی</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">لطفاً تغییرات زیر را قبل از اعمال بررسی و تایید کنید</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/20 rounded-2xl p-4">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-bold whitespace-pre-line">
                  {aiExplanation}
                </p>
              </div>

              {aiWarnings && aiWarnings.length > 0 && (
                <div className="space-y-2">
                  {aiWarnings.map((warning, idx) => (
                    <div key={idx} className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl p-3.5 flex items-start gap-2.5 text-amber-800 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400 animate-bounce" />
                      <p className="text-xs font-bold leading-relaxed">{warning}</p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <Wand2 className="w-3.5 h-3.5" />
                تغییرات پس از تایید شما در فرم اعمال می‌شوند. برای ذخیره نهایی در دیتابیس باید روی دکمه «ذخیره تنظیمات» کلیک کنید.
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAiConfirmModal(false);
                  setPendingFormData(null);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all font-black text-xs cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingFormData) {
                    setFormData(pendingFormData);
                    setControlSuccessMessage('تغییرات با موفقیت در فرم اعمال شد. برای ثبت نهایی روی دکمه «ذخیره تنظیمات» کلیک کنید.');
                    setPromptInput('');
                    setTimeout(() => setControlSuccessMessage(''), 8000);
                  }
                  setShowAiConfirmModal(false);
                  setPendingFormData(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all font-black text-xs cursor-pointer shadow-sm"
              >
                تایید و اعمال تغییرات
              </button>
            </div>
          </div>
        </div>
      )}

      {message.text && (
        <div className={`p-4 rounded-2xl text-xs font-black shadow-sm border ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Sidebar Tabs */}
          <div className="md:col-span-4 lg:col-span-3 space-y-3 md:sticky md:top-6">
            {/* Mobile Horizontal Scrollable Tabs Container */}
            <div className="flex md:hidden items-center gap-2 w-full relative group/carousel">
              {/* Left Scroll Button */}
              <button
                type="button"
                onClick={() => handleScroll('left')}
                onMouseEnter={() => startScrolling('left')}
                onMouseLeave={stopScrolling}
                className="absolute left-12 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 dark:bg-slate-900/90 border border-slate-150 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Right Scroll Button */}
              <button
                type="button"
                onClick={() => handleScroll('right')}
                onMouseEnter={() => startScrolling('right')}
                onMouseLeave={stopScrolling}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 dark:bg-slate-900/90 border border-slate-150 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Scrollable Tabs */}
              <div 
                ref={tabsRef}
                className="flex-1 flex overflow-x-auto pb-2 gap-2 scrollbar-none snap-x scroll-smooth"
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-xs shrink-0 snap-center transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      {tab.title}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Quick Save Button */}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={saving}
                data-testid="save-status"
                data-status-state={saveStatus}
                className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl shadow-md shadow-blue-500/10 transition-all active:scale-95 shrink-0 flex items-center justify-center cursor-pointer"
                title="ذخیره تنظیمات"
              >
                <Save className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Desktop/Tablet Sidebar Tabs */}
            <div className="hidden md:flex flex-col gap-2 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 mb-1">بخش‌های تنظیمات</span>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`group relative flex items-center gap-3.5 p-3 rounded-2xl text-right transition-all border w-full cursor-pointer ${
                      isActive
                        ? 'bg-blue-500/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30'
                        : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div className={`p-2 rounded-xl border shrink-0 ${
                      isActive
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-100 dark:border-slate-850'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-black truncate">{tab.title}</span>
                      <span className={`block text-[9px] font-bold mt-0.5 truncate ${isActive ? 'text-blue-500/85' : 'text-slate-400'}`}>
                        {tab.description}
                      </span>
                    </div>

                    {/* Tooltip */}
                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col items-start bg-slate-950 dark:bg-slate-800 text-white text-[10px] p-3 rounded-2xl shadow-2xl z-50 w-52 pointer-events-none animate-in fade-in slide-in-from-left-2 duration-150 border border-slate-800 dark:border-slate-700">
                      <span className="font-black text-xs mb-1 text-blue-400">{tab.title}</span>
                      <span className="text-slate-200 dark:text-slate-300 font-bold leading-relaxed">{tab.description}</span>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45 w-2.5 h-2.5 bg-slate-950 dark:bg-slate-800 border-r border-t border-slate-800 dark:border-slate-700" />
                    </div>
                  </button>
                );
              })}

              {/* Sidebar Save Button */}
              <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-2">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={saving}
                  data-testid="save-status"
                  data-status-state={saveStatus}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 px-4 rounded-2xl font-black text-xs shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 active:scale-98 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'در حال ذخیره...' : 'ذخیره کل تنظیمات'}
                </button>
              </div>
            </div>
          </div>

          {/* Active Tab Content */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6">
            {activeTab === 'layout' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                {/* انتخاب نوع صفحه اصلی */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
          <div 
            onClick={() => toggleSection('homePageType')}
            className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
          >
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-4.5 h-4.5 text-blue-500" />
              نوع نمایش صفحه اصلی (مسیر اصلی /)
            </h2>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.homePageType ? '' : 'rotate-180'}`} />
          </div>
          
          {!minimizedSections.homePageType && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  formData.homePageType === 'shop' 
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/50'
                }`}>
                  <input
                    type="radio"
                    name="homePageType"
                    value="shop"
                    checked={formData.homePageType === 'shop'}
                    onChange={handleChange}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="block text-[11px] font-black text-slate-800 dark:text-white">صفحه فروشگاه</span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">
                      کاربر با ورود به دامنه اصلی مستقیماً محصولات و ویترین فروشگاه را مشاهده می‌کند.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  formData.homePageType === 'custom' 
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/50'
                }`}>
                  <input
                    type="radio"
                    name="homePageType"
                    value="custom"
                    checked={formData.homePageType === 'custom'}
                    onChange={handleChange}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="block text-[11px] font-black text-slate-800 dark:text-white">صفحه اصلی اختصاصی (Landing Page) (پیش‌فرض)</span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">
                      یک صفحه اصلی مجزا و جذاب با بنر خوش‌آمدگویی، هدر، استوری‌ها و بخش‌های معرفی.
                    </span>
                  </div>
                </label>
              </div>

              {formData.homePageType === 'custom' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="block text-xs font-black text-slate-850 dark:text-white">وضعیت فعال بودن لندینگ پیج اختصاصی</label>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">در صورت غیرفعال‌سازی، خریداران با ورود به سایت به یک صفحه زیبا با علت غیرفعال بودن هدایت می‌شوند و دکمه ورود به فروشگاه را خواهند دید.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, isLandingActive: !prev.isLandingActive }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                        formData.isLandingActive ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          formData.isLandingActive ? '-translate-x-6' : '-translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {!formData.isLandingActive && (
                    <div className="space-y-2 text-xs font-bold animate-fadeIn">
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500">علت غیرفعال بودن صفحه اصلی (جهت نمایش به خریدار)</label>
                      <input
                        type="text"
                        name="inactiveReason"
                        value={formData.inactiveReason}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                        placeholder="مثال: صفحه اصلی موقتاً در دست تعمیر است. لطفاً مستقیماً وارد فروشگاه شوید."
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* اولویت‌بندی و ترتیب بخش‌های صفحه اصلی */}
        {formData.homePageType === 'custom' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
            <div 
              onClick={() => toggleSection('sectionOrdering')}
              className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
            >
              <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Sliders className="w-4.5 h-4.5 text-blue-500" />
                اولویت‌بندی و ترتیب بخش‌های صفحه اصلی
              </h2>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.sectionOrdering ? '' : 'rotate-180'}`} />
            </div>
            
            {!minimizedSections.sectionOrdering && (
              <div className="space-y-5 animate-fadeIn">
                {/* راهنمای تعاملی و ابزارها */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-600 dark:text-slate-350 font-black flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      مدیریت هوشمند چیدمان صفحه اصلی
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
                      شما می‌توانید با کشیدن و رها کردن (<span className="text-blue-600 dark:text-blue-400">Drag & Drop</span>) یا دکمه‌های بالا/پایین، ترتیب بخش‌ها را تغییر دهید. همچنین با سوئیچ هر بخش، آن را مستقیماً فعال یا غیرفعال کنید.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <button
                      type="button"
                      onClick={handleResetSectionOrder}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="بازگشت به چیدمان اولیه سیستم"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-400 animate-spin-hover" />
                      ترتیب پیش‌فرض
                    </button>
                  </div>
                </div>

                {/* آمار و فیلتر جستجو */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* آمار بخش‌ها */}
                  <div className="flex items-center gap-3 text-[10px] font-black">
                    <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-950 rounded-lg text-slate-500">
                      کل بخش‌ها: <span className="text-slate-800 dark:text-white">{(formData.sectionOrder || []).length}</span>
                    </div>
                    <div className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-blue-600 dark:text-blue-400">
                      فعال: <span className="text-blue-700 dark:text-blue-300">
                        {(formData.sectionOrder || []).filter((id: string) => {
                          const meta = ALL_SECTIONS.find(s => s.id === id);
                          if (id.startsWith('customText_')) {
                            const boxId = id.replace('customText_', '');
                            const box = (formData.customTextBoxes || []).find((b: any) => b.id === boxId);
                            return box ? box.isActive : false;
                          }
                          return meta?.toggleKey ? (formData[meta.toggleKey] ?? true) : true;
                        }).length}
                      </span>
                    </div>
                    <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-950 rounded-lg text-slate-400">
                      غیرفعال: <span className="text-slate-600 dark:text-slate-400">
                        {(formData.sectionOrder || []).filter((id: string) => {
                          const meta = ALL_SECTIONS.find(s => s.id === id);
                          if (id.startsWith('customText_')) {
                            const boxId = id.replace('customText_', '');
                            const box = (formData.customTextBoxes || []).find((b: any) => b.id === boxId);
                            return box ? !box.isActive : true;
                          }
                          return meta?.toggleKey ? !(formData[meta.toggleKey] ?? true) : false;
                        }).length}
                      </span>
                    </div>
                  </div>

                  {/* جستجوی بخش‌ها */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="جستجوی بخش..."
                      value={sectionSearchQuery}
                      onChange={(e) => setSectionSearchQuery(e.target.value)}
                      className="w-full pr-9 pl-3 py-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-blue-500/10 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* لیست بخش‌ها با قابلیت Drag & Drop */}
                <div className="grid grid-cols-1 gap-2.5">
                  {(formData.sectionOrder || [
                    'stories',
                    'slider',
                    'shoppable',
                    'specialDeals',
                    'hero',
                    'features',
                    'categoryQuickAccess',
                    'middleBanners',
                    'featuredProducts',
                    'blog',
                    'reviews',
                    'brands',
                    'customText'
                  ])
                    .map((sectionId: string, index: number) => {
                      let sectionMeta = ALL_SECTIONS.find(s => s.id === sectionId);
                      
                      // Dynamically resolve custom text box sections
                      if (!sectionMeta && sectionId.startsWith('customText_')) {
                        const boxId = sectionId.replace('customText_', '');
                        const box = (formData.customTextBoxes || []).find((b: any) => b.id === boxId);
                        if (box) {
                          sectionMeta = {
                            id: sectionId,
                            label: `باکس متنی دلخواه: ${box.title || 'بدون عنوان'}`,
                            desc: `نمایش باکس متنی دلخواه در این موقعیت از صفحه`,
                            icon: 'FileText',
                            toggleKey: null as any,
                            targetElementId: 'customTextSettings' as any
                          };
                        }
                      }

                      if (!sectionMeta) return null;
                      
                      // Check if section is active
                      let isActive = true;
                      if (sectionId.startsWith('customText_')) {
                        const boxId = sectionId.replace('customText_', '');
                        const box = (formData.customTextBoxes || []).find((b: any) => b.id === boxId);
                        isActive = box ? box.isActive : false;
                      } else if (sectionMeta.toggleKey) {
                        isActive = formData[sectionMeta.toggleKey] ?? true;
                      }

                      // Filter by search query
                      if (sectionSearchQuery) {
                        const query = sectionSearchQuery.toLowerCase();
                        const labelMatch = sectionMeta.label.toLowerCase().includes(query);
                        const descMatch = sectionMeta.desc.toLowerCase().includes(query);
                        if (!labelMatch && !descMatch) return null;
                      }
                      
                      const IconComponent = (LucideIcons as any)[sectionMeta.icon] || Sparkles;
                      const isDragged = draggedIndex === index;
                      const isDragOver = dragOverIndex === index;

                      return (
                        <div 
                          key={sectionId}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          onDrop={(e) => handleDrop(e, index)}
                          onClick={() => {
                            if (sectionMeta.targetElementId) {
                              // Find the corresponding tab for this element
                              const targetTabMap: Record<string, 'layout' | 'slides' | 'banners_features' | 'content'> = {
                                'landingDetails': 'slides',
                                'sliderSettings': 'slides',
                                'featuresSettings': 'banners_features',
                                'middleBannersSettings': 'banners_features',
                                'brandsSettings': 'banners_features',
                                'blogSettings': 'content',
                                'reviewsSettings': 'content',
                                'customTextSettings': 'content'
                              };

                              const targetTab = targetTabMap[sectionMeta.targetElementId];
                              const needsTabSwitch = targetTab && activeTab !== targetTab;

                              if (needsTabSwitch) {
                                setActiveTab(targetTab);
                              }

                              // Expand the section if minimized
                              const sectionKeyMap: Record<string, string> = {
                                'landingDetails': 'landingDetails',
                                'sliderSettings': 'slider',
                                'featuresSettings': 'features',
                                'middleBannersSettings': 'middleBanners',
                                'reviewsSettings': 'reviews',
                                'blogSettings': 'blog',
                                'customTextSettings': 'customText',
                                'brandsSettings': 'brands'
                              };
                              const minimizedKey = sectionKeyMap[sectionMeta.targetElementId];
                              if (minimizedKey) {
                                setMinimizedSections(prev => ({ ...prev, [minimizedKey]: false }));
                              }
                              
                              // Scroll to the element (using longer timeout if we just switched tabs to allow render)
                              setTimeout(() => {
                                const element = document.getElementById(sectionMeta.targetElementId!);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                                  setTimeout(() => {
                                    element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
                                  }, 2000);
                                }
                              }, needsTabSwitch ? 250 : 100);
                            }
                          }}
                          className={`p-3.5 bg-white dark:bg-slate-900 rounded-2xl border flex items-center justify-between gap-4 transition-all duration-200 select-none ${
                            isDragged 
                              ? 'opacity-40 border-dashed border-blue-500 bg-blue-50/10 scale-[0.98]' 
                              : isDragOver
                                ? 'border-blue-500 bg-blue-50/5 translate-y-1 shadow-md'
                                : isActive
                                  ? 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'
                                  : 'border-slate-100 dark:border-slate-850 opacity-75 hover:opacity-100'
                          } ${
                            sectionMeta.targetElementId ? 'cursor-pointer' : ''
                          }`}
                          title={sectionMeta.targetElementId ? "کلیک برای رفتن به بخش تنظیمات" : undefined}
                        >
                          {/* راست: هندل درگ، شماره، آیکون و جزئیات */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* هندل درگ */}
                            <div 
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing transition-all shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              title="برای جابجایی بکشید"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            {/* ردیف شماره */}
                            <span className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                              isActive 
                                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                            }`}>
                              {index + 1}
                            </span>

                            {/* آیکون بخش */}
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                              isActive
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-900/30 text-blue-500'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400'
                            }`}>
                              <IconComponent className="w-4.5 h-4.5" />
                            </div>

                            {/* عنوان و توضیحات */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`text-xs font-black transition-colors ${
                                  isActive ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                                }`}>
                                  {sectionMeta.label}
                                </h4>
                                
                                {sectionMeta.targetElementId && (
                                  <span className="text-[9px] bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded-md font-bold border border-slate-100 dark:border-slate-850">
                                    تنظیمات دارد
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold truncate">
                                {sectionMeta.desc}
                              </p>
                            </div>
                          </div>

                          {/* چپ: دکمه‌های کنترلی و سوئیچ فعال/غیرفعال */}
                          <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* سوئیچ فعال/غیرفعال */}
                            <div className="flex items-center gap-1.5 border-l border-slate-100 dark:border-slate-800 pl-3 shrink-0">
                              <span className={`text-[9px] font-black ${
                                isActive 
                                  ? 'text-blue-600 dark:text-blue-400' 
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}>
                                {isActive ? 'فعال' : 'غیرفعال'}
                              </span>
                              
                              {sectionMeta.toggleKey || sectionId.startsWith('customText_') ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSectionActive(sectionId, sectionMeta)}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                                    isActive ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
                                      isActive ? '-translate-x-4.5' : '-translate-x-1'
                                    }`}
                                  />
                                </button>
                              ) : (
                                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-black">
                                  همیشه فعال
                                </span>
                              )}
                            </div>

                            {/* دکمه‌های جابجایی دستی (برای دسترسی‌پذیری و موبایل) */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => {
                                  const newOrder = [...formData.sectionOrder];
                                  const temp = newOrder[index];
                                  newOrder[index] = newOrder[index - 1];
                                  newOrder[index - 1] = temp;
                                  setFormData((prev: any) => ({ ...prev, sectionOrder: newOrder }));
                                }}
                                className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all disabled:opacity-20 cursor-pointer border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950"
                                title="انتقال به بالا"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === (formData.sectionOrder || []).length - 1}
                                onClick={() => {
                                  const newOrder = [...formData.sectionOrder];
                                  const temp = newOrder[index];
                                  newOrder[index] = newOrder[index + 1];
                                  newOrder[index + 1] = temp;
                                  setFormData((prev: any) => ({ ...prev, sectionOrder: newOrder }));
                                }}
                                className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all disabled:opacity-20 cursor-pointer border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950"
                                title="انتقال به پایین"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
              </div>
            )}

            {activeTab === 'slides' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* بخش تنظیمات اسلایدر اصلی */}
        <div id="sliderSettings" className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 transition-all duration-300">
          <div 
            onClick={() => toggleSection('slider')}
            className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
          >
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Sliders className="w-4.5 h-4.5 text-blue-500" />
              تنظیمات نمایش اسلایدر سراسری
            </h2>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.slider ? '' : 'rotate-180'}`} />
          </div>
          
          {!minimizedSections.slider && (
            <div className="space-y-4 text-xs font-bold animate-fadeIn">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850">
                <div className="space-y-0.5 ml-4">
                  <label className="block text-xs font-black text-slate-850 dark:text-white">نمایش اسلایدر تصاویر در سایت</label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">با فعال‌سازی این گزینه، اسلایدر اصلی در صفحات مشخص شده زیر نمایش داده می‌شود.</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormData((prev: any) => ({ ...prev, showSlider: !prev.showSlider }));
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    formData.showSlider ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      formData.showSlider ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {formData.showSlider && (
                <div className="p-5 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4 animate-fadeIn">
                  <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500">اسلایدر در کدام صفحات نمایش داده شود؟</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: 'custom', label: 'فقط لندینگ پیج اختصاصی', desc: 'اسلایدر فقط در صفحه فرود اصلی (Landing) نمایش داده می‌شود.' },
                      { value: 'shop', label: 'فقط ویترین فروشگاه', desc: 'اسلایدر فقط در صفحه لیست محصولات و ویترین فروشگاه (Shop) فعال می‌گردد.' },
                      { value: 'both', label: 'هر دو صفحه (لندینگ و فروشگاه)', desc: 'اسلایدر به صورت سراسری در هر دو صفحه اصلی و فروشگاه نمایش داده می‌شود.' }
                    ].map((opt) => (
                      <label 
                        key={opt.value}
                        className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                          formData.sliderDisplayLocation === opt.value
                            ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-950/10'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="sliderDisplayLocation"
                            value={opt.value}
                            checked={formData.sliderDisplayLocation === opt.value}
                            onChange={handleChange}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-[11px] font-black text-slate-800 dark:text-white">{opt.label}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 font-bold leading-relaxed">{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* پیکربندی لندینگ پیج اختصاصی */}
        {formData.homePageType === 'custom' && (
          <div id="landingDetails" className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 animate-fadeIn transition-all duration-300">
            <div 
              onClick={() => toggleSection('landingDetails')}
              className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
            >
              <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                جزئیات و محتوای لندینگ پیج اختصاصی
              </h2>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.landingDetails ? '' : 'rotate-180'}`} />
            </div>
            
            {!minimizedSections.landingDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold animate-fadeIn">
                {formData.showHero && (
                  <>
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">عنوان بنر خوش‌آمدگویی</label>
                      <input
                        type="text"
                        name="heroTitle"
                        value={formData.heroTitle}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                        placeholder="به فروشگاه ما خوش آمدید"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">زیرعنوان بنر</label>
                      <input
                        type="text"
                        name="heroSubtitle"
                        value={formData.heroSubtitle}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                        placeholder="بهترین محصولات با بالاترین کیفیت"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">متن دکمه ورود به فروشگاه</label>
                      <input
                        type="text"
                        name="heroCtaText"
                        value={formData.heroCtaText}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                        placeholder="ورود به فروشگاه"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">لینک دکمه ورود به فروشگاه</label>
                      <input
                        type="text"
                        name="heroCtaUrl"
                        value={formData.heroCtaUrl}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all text-left font-mono"
                        dir="ltr"
                        placeholder="/shop"
                      />
                    </div>
                  </>
                )}

                <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <input
                      type="checkbox"
                      id="showStories"
                      name="showStories"
                      checked={formData.showStories}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, showStories: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showStories" className="text-[11px] font-black text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      نمایش استوری‌ها در صفحه اصلی
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <input
                      type="checkbox"
                      id="showHero"
                      name="showHero"
                      checked={formData.showHero}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, showHero: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showHero" className="text-[11px] font-black text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      نمایش بنر خوش‌آمدگویی ثابت
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <input
                      type="checkbox"
                      id="showCategoryQuickAccess"
                      name="showCategoryQuickAccess"
                      checked={formData.showCategoryQuickAccess}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, showCategoryQuickAccess: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showCategoryQuickAccess" className="text-[11px] font-black text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      نمایش دسترسی سریع دسته‌ها
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <input
                      type="checkbox"
                      id="showShoppable"
                      name="showShoppable"
                      checked={formData.showShoppable}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, showShoppable: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showShoppable" className="text-[11px] font-black text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      نمایش خرید تصویری تعاملی
                    </label>
                  </div>
                </div>

                {formData.showCategoryQuickAccess && (
                  <div className="col-span-2 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3 animate-fadeIn">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500">نوع چیدمان لیست دسته‌بندی‌ها</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.categoryQuickAccessLayout === 'row'
                          ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-950/10'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                      }`}>
                        <input
                          type="radio"
                          name="categoryQuickAccessLayout"
                          value="row"
                          checked={formData.categoryQuickAccessLayout === 'row' || !formData.categoryQuickAccessLayout}
                          onChange={(e) => setFormData((prev: any) => ({ ...prev, categoryQuickAccessLayout: e.target.value }))}
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="block text-xs font-black text-slate-800 dark:text-white">آیکون‌های دایره‌ای ردیفی (مشابه استوری)</span>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">نمایش دسته‌بندی‌ها به صورت یک نوار افقی شیک با آیکون‌های دایره‌ای.</span>
                        </div>
                      </label>

                      <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.categoryQuickAccessLayout === 'list'
                          ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-950/10'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                      }`}>
                        <input
                          type="radio"
                          name="categoryQuickAccessLayout"
                          value="list"
                          checked={formData.categoryQuickAccessLayout === 'list'}
                          onChange={(e) => setFormData((prev: any) => ({ ...prev, categoryQuickAccessLayout: e.target.value }))}
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="block text-xs font-black text-slate-800 dark:text-white">سایدبار عمودی کلاسیک (لیست کناری)</span>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">نمایش دسته‌بندی‌ها در یک ستون کناری در سمت راست محصولات.</span>
                        </div>
                      </label>
                    </div>

                    {/* انتخاب دسته‌بندی‌های صفحه اصلی */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500">انتخاب دسته‌بندی‌های صفحه اصلی</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="useSelectedCategoriesOnly"
                            checked={formData.useSelectedCategoriesOnly || false}
                            onChange={(e) => setFormData((prev: any) => ({ ...prev, useSelectedCategoriesOnly: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <label htmlFor="useSelectedCategoriesOnly" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                            فقط نمایش دسته‌بندی‌های انتخاب شده به صورت دستی
                          </label>
                        </div>
                      </div>

                      {formData.useSelectedCategoriesOnly ? (
                        <div className="space-y-4">
                          {/* List of selected categories */}
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {(formData.homeCategories || []).length === 0 ? (
                              <p className="text-[11px] text-slate-400 text-center py-4 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                هیچ دسته‌بندی انتخاب نشده است. از منوی زیر اضافه کنید.
                              </p>
                            ) : (
                              (formData.homeCategories || []).map((cat: any, index: number) => {
                                const originalCat = allCategories.find(c => c.id === cat.id);
                                return (
                                  <div key={cat.id || index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 gap-3">
                                    <div className="flex items-center gap-3">
                                      <div className="flex flex-col gap-1">
                                        <button
                                          type="button"
                                          disabled={index === 0}
                                          onClick={() => {
                                            const list = [...formData.homeCategories];
                                            const temp = list[index];
                                            list[index] = list[index - 1];
                                            list[index - 1] = temp;
                                            setFormData((prev: any) => ({ ...prev, homeCategories: list }));
                                          }}
                                          className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"
                                        >
                                          <MoveUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={index === formData.homeCategories.length - 1}
                                          onClick={() => {
                                            const list = [...formData.homeCategories];
                                            const temp = list[index];
                                            list[index] = list[index + 1];
                                            list[index + 1] = temp;
                                            setFormData((prev: any) => ({ ...prev, homeCategories: list }));
                                          }}
                                          className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"
                                        >
                                          <MoveDown className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <div>
                                        <span className="text-xs font-black text-slate-800 dark:text-white">
                                          {originalCat ? originalCat.name : 'دسته‌بندی نامشخص'}
                                        </span>
                                        <span className="block text-[9px] text-slate-400">
                                          {originalCat?.parent ? `زیرمجموعه ${originalCat.parent.name}` : 'دسته‌بندی اصلی'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3">
                                      {/* Custom image picker */}
                                      <div className="flex items-center gap-2">
                                        {cat.customImageUrl ? (
                                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
                                            <img src={cat.customImageUrl} alt="" className="w-full h-full object-cover" />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const list = [...formData.homeCategories];
                                                list[index] = { ...list[index], customImageUrl: '' };
                                                setFormData((prev: any) => ({ ...prev, homeCategories: list }));
                                              }}
                                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow"
                                            >
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setShowMediaPicker(`homecategory-${index}`)}
                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-all"
                                          >
                                            <Upload className="w-3.5 h-3.5" />
                                            عکس اختصاصی
                                          </button>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const list = (formData.homeCategories || []).filter((_: any, i: number) => i !== index);
                                          setFormData((prev: any) => ({ ...prev, homeCategories: list }));
                                        }}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                                        title="حذف از صفحه اصلی"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Add category dropdown */}
                          <div className="flex items-center gap-2">
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                const exists = (formData.homeCategories || []).some((c: any) => c.id === val);
                                if (exists) {
                                  alert('این دسته‌بندی قبلاً اضافه شده است.');
                                  e.target.value = '';
                                  return;
                                }
                                const newHomeCat = {
                                  id: val,
                                  customImageUrl: ''
                                };
                                setFormData((prev: any) => ({
                                  ...prev,
                                  homeCategories: [...(prev.homeCategories || []), newHomeCat]
                                }));
                                e.target.value = '';
                              }}
                              className="text-xs font-bold px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white"
                              defaultValue=""
                            >
                              <option value="" disabled>-- انتخاب دسته‌بندی برای اضافه کردن --</option>
                              {allCategories
                                .filter(c => !(formData.homeCategories || []).some((hc: any) => hc.id === c.id))
                                .map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} {c.parent ? `(زیرمجموعه ${c.parent.name})` : ''}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                          در این حالت، تمام دسته‌بندی‌های اصلی فعال فروشگاه به صورت خودکار در صفحه اصلی نمایش داده می‌شوند.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* مدیریت اسلایدر صفحه اصلی */}
        {formData.homePageType === 'custom' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
            <div 
              onClick={() => toggleSection('sliderManagement')}
              className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
            >
              <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Sliders className="w-4.5 h-4.5 text-blue-500" />
                مدیریت اسلایدر صفحه اصلی
              </h2>
              <div className="flex items-center gap-3">
                <a
                  href="/admin/slider"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-black text-[10px] transition-all duration-200 cursor-pointer shadow-sm"
                >
                  <Settings className="w-3.5 h-3.5" />
                  مدیریت اسلایدها در صفحه اختصاصی اسلایدر
                </a>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.sliderManagement ? '' : 'rotate-180'}`} />
              </div>
            </div>

            {!minimizedSections.sliderManagement && (
              <div className="space-y-3 animate-fadeIn">
                {slidesLoading ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-bold">در حال بارگذاری اسلایدها...</div>
                ) : slides.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center gap-2">
                    <ImageIcon className="w-10 h-10 opacity-30" />
                    <p className="text-xs font-bold">هیچ اسلایدی یافت نشد. اسلایدهای خود را در بخش مدیریت اسلایدر اضافه کنید.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {slides.map((slide) => (
                      <div key={slide.id} className="p-3.5 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center gap-4 hover:shadow-sm transition-all">
                        <div className="relative w-24 aspect-[21/9] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 flex-shrink-0">
                          <Image src={slide.imageUrl} alt={slide.title || "Slide"} fill className="object-cover" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-black text-slate-800 dark:text-white truncate">
                            {slide.title || "بدون عنوان"}
                          </h3>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-bold">
                            {slide.linkUrl && (
                              <span className="flex items-center gap-1">
                                <LinkIcon className="w-3 h-3" />
                                <span className="truncate max-w-[150px]" dir="ltr">{slide.linkUrl}</span>
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${slide.isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'}`}>
                              {slide.isActive ? 'فعال' : 'غیرفعال'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
              </div>
            )}

            {activeTab === 'banners_features' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* مدیریت بنر خوش‌آمدگویی بالای صفحه */}
        <div id="welcomeBannerSettings" className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 transition-all duration-300">
          <div 
            onClick={() => toggleSection('welcomeBanner')}
            className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
          >
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Home className="w-4.5 h-4.5 text-blue-500" />
              تنظیمات بنر خوش‌آمدگویی بالای صفحه
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormData((prev: any) => ({ ...prev, showWelcomeBanner: !prev.showWelcomeBanner }));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                  formData.showWelcomeBanner ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    formData.showWelcomeBanner ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.welcomeBanner ? '' : 'rotate-180'}`} />
            </div>
          </div>

          {!minimizedSections.welcomeBanner && (
            <div className="space-y-6 animate-fadeIn">
              {formData.showWelcomeBanner && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                  {/* Title */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500">عنوان بنر خوش‌آمدگویی</label>
                    <input
                      type="text"
                      value={formData.welcomeTitle || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, welcomeTitle: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                      placeholder="مثال: به فروشگاه رسمی {shopName} خوش آمدید"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      می‌توانید از عبارت <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-blue-500">{'{shopName}'}</code> برای درج خودکار نام فروشگاه استفاده کنید.
                    </p>
                  </div>

                  {/* Feature 1 */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500">ویژگی اول (راست)</label>
                    <input
                      type="text"
                      value={formData.welcomeFeature1 || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, welcomeFeature1: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                      placeholder="مثال: ضمانت اصالت کالا"
                    />
                  </div>

                  {/* Feature 2 */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500">ویژگی دوم (وسط)</label>
                    <input
                      type="text"
                      value={formData.welcomeFeature2 || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, welcomeFeature2: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                      placeholder="مثال: پشتیبانی سریع"
                    />
                  </div>

                  {/* Feature 3 */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500">ویژگی سوم (چپ)</label>
                    <input
                      type="text"
                      value={formData.welcomeFeature3 || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, welcomeFeature3: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                      placeholder="مثال: ارسال به سراسر کشور"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* مدیریت نوار اطلاع‌رسانی (ویژگی‌های فروشگاه) */}
        <div id="featuresSettings" className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 transition-all duration-300">
          <div 
            onClick={() => toggleSection('features')}
            className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
          >
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-blue-500" />
              مدیریت نوار اطلاع‌رسانی (ویژگی‌های فروشگاه)
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormData((prev: any) => ({ ...prev, showFeatures: !prev.showFeatures }));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                  formData.showFeatures ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    formData.showFeatures ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.features ? '' : 'rotate-180'}`} />
            </div>
          </div>

          {!minimizedSections.features && (
            <div className="space-y-6 animate-fadeIn">
              {formData.showFeatures && (
                <div className="space-y-4 text-xs font-bold">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                    این نوار به صورت افقی در صفحه اصلی نمایش داده می‌شود و مزایای رقابتی فروشگاه شما (مانند ارسال رایگان، ضمانت بازگشت کالا و ...) را به خریداران نشان می‌دهد.
                  </p>

                  {/* تب‌بندی ویژگی‌ها */}
                  <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    {(formData.features || []).map((feat: any, index: number) => (
                      <button
                        key={feat.id || index}
                        type="button"
                        onClick={() => setActiveFeatureTab(index)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                          activeFeatureTab === index
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-850'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px]">
                          {index + 1}
                        </span>
                        <span className="truncate max-w-[100px]">{feat.title || `ویژگی ${index + 1}`}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="px-3 py-2 rounded-xl text-xs font-black bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-dashed border-blue-500/30 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      جدید
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(formData.features || []).map((feat: any, index: number) => {
                      if (activeFeatureTab !== index) return null;
                      return (
                        <div key={feat.id || index} className="p-5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col gap-4 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg">
                              تنظیمات ویژگی شماره {index + 1} ({feat.title || 'بدون عنوان'})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveFeature(index, 'up')}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all disabled:opacity-30 cursor-pointer"
                                title="انتقال به بالا (تغییر ترتیب تب)"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === (formData.features || []).length - 1}
                                onClick={() => handleMoveFeature(index, 'down')}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all disabled:opacity-30 cursor-pointer"
                                title="انتقال به پایین (تغییر ترتیب تب)"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFeature(index)}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-rose-500 hover:text-rose-700 transition-all cursor-pointer"
                                title="حذف ویژگی"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* عنوان و توضیح */}
                            <div className="space-y-3 md:col-span-2">
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-slate-400 dark:text-slate-500">عنوان ویژگی</label>
                                <input
                                  type="text"
                                  value={feat.title}
                                  onChange={(e) => handleUpdateFeature(index, 'title', e.target.value)}
                                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all text-xs font-bold"
                                  placeholder="مثال: ارسال رایگان"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-slate-400 dark:text-slate-500">توضیح کوتاه</label>
                                <input
                                  type="text"
                                  value={feat.desc}
                                  onChange={(e) => handleUpdateFeature(index, 'desc', e.target.value)}
                                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all text-xs font-bold"
                                  placeholder="مثال: برای خریدهای بالای ۵۰۰ هزار تومان"
                                />
                              </div>
                            </div>

                            {/* بخش مدیریت آیکون */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] text-slate-400 dark:text-slate-500">آیکون ویژگی</label>
                              <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-xl shrink-0">
                                    {feat.iconType === 'emoji' && feat.icon}
                                    {feat.iconType === 'upload' && feat.icon && (feat.icon.startsWith('/') || feat.icon.startsWith('http')) ? (
                                      <div className="relative w-7 h-7">
                                        <Image src={feat.icon} alt="icon" fill className="object-contain" />
                                      </div>
                                    ) : feat.iconType === 'upload' ? (
                                      <ImageIcon className="w-5 h-5 text-blue-500" />
                                    ) : null}
                                    {(!feat.iconType || feat.iconType === 'lucide') && (
                                      (() => {
                                        const IconComponent = (LucideIcons as any)[feat.icon];
                                        if (IconComponent) {
                                          return <IconComponent className="w-5 h-5 text-blue-500" />;
                                        }
                                        return <Sparkles className="w-5 h-5 text-blue-500" />;
                                      })()
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="block text-[10px] font-black text-slate-700 dark:text-slate-300 truncate">
                                      {feat.iconType === 'emoji' ? 'اموجی' : feat.iconType === 'upload' ? 'تصویر آپلود شده' : 'آیکون سیستمی'}
                                    </span>
                                    <span className="block text-[9px] text-slate-400 dark:text-slate-500 truncate font-mono" dir="ltr">
                                      {feat.iconType === 'upload' ? 'media_file' : feat.icon}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setShowIconPickerForIndex(showIconPickerForIndex === index ? null : index)}
                                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shrink-0"
                                >
                                  تغییر آیکون
                                </button>
                              </div>

                              {/* پنل انتخاب آیکون */}
                              {showIconPickerForIndex === index && (
                                <div className="mt-3 p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn">
                                  {/* نوع آیکون */}
                                  <div className="grid grid-cols-3 gap-2">
                                    {[
                                      { type: 'lucide', label: 'کتابخانه آیکون', icon: Settings },
                                      { type: 'emoji', label: 'اموجی', icon: Smile },
                                      { type: 'upload', label: 'آپلود تصویر', icon: Upload }
                                    ].map((t) => (
                                      <button
                                        key={t.type}
                                        type="button"
                                        onClick={() => {
                                          handleUpdateFeature(index, 'iconType', t.type);
                                          if (t.type === 'lucide') {
                                            handleUpdateFeature(index, 'icon', 'Sparkles');
                                          } else if (t.type === 'emoji') {
                                            handleUpdateFeature(index, 'icon', '✨');
                                          } else {
                                            setShowMediaPicker(`feature-${index}`);
                                          }
                                        }}
                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-[10px] font-black transition-all cursor-pointer ${
                                          (feat.iconType || 'lucide') === t.type
                                            ? 'border-blue-500 bg-blue-50/10 text-blue-600 dark:text-blue-400'
                                            : 'border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500'
                                        }`}
                                      >
                                        <t.icon className="w-4 h-4" />
                                        {t.label}
                                      </button>
                                    ))}
                                  </div>

                                  {/* فیلد آیکون بر اساس نوع */}
                                  {feat.iconType === 'emoji' && (
                                    <div className="space-y-1.5">
                                      <label className="block text-[9px] text-slate-400 dark:text-slate-500">اموجی دلخواه را وارد کنید</label>
                                      <input
                                        type="text"
                                        value={feat.icon}
                                        onChange={(e) => handleUpdateFeature(index, 'icon', e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all text-center text-lg"
                                        placeholder="مثال: 🚚"
                                      />
                                    </div>
                                  )}

                                  {feat.iconType === 'upload' && (
                                    <div className="space-y-2">
                                      <button
                                        type="button"
                                        onClick={() => setShowMediaPicker(`feature-${index}`)}
                                        className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 py-3 rounded-xl transition-all cursor-pointer"
                                      >
                                        <Upload className="w-4 h-4 text-slate-400" />
                                        <span>انتخاب تصویر از گالری رسانه</span>
                                      </button>
                                    </div>
                                  )}

                                  {(!feat.iconType || feat.iconType === 'lucide') && (
                                    <div className="space-y-3">
                                      <div className="relative">
                                        <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                          type="text"
                                          value={iconSearchQuery}
                                          onChange={(e) => setIconSearchQuery(e.target.value)}
                                          className="w-full pr-9 pl-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all text-xs"
                                          placeholder="جستجوی آیکون..."
                                        />
                                      </div>

                                      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                                        {RECOMMENDED_ICONS.filter(i => 
                                          i.name.toLowerCase().includes(iconSearchQuery.toLowerCase()) || 
                                          i.label.includes(iconSearchQuery)
                                        ).map((i) => {
                                          const IconComp = (LucideIcons as any)[i.name];
                                          return (
                                            <button
                                              key={i.name}
                                              type="button"
                                              onClick={() => {
                                                handleUpdateFeature(index, 'icon', i.name);
                                                setShowIconPickerForIndex(null);
                                              }}
                                              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer hover:border-blue-500 hover:bg-blue-50/10 ${
                                                feat.icon === i.name
                                                  ? 'border-blue-500 bg-blue-50/10 text-blue-600 dark:text-blue-400'
                                                  : 'border-slate-100 dark:border-slate-900 text-slate-500'
                                              }`}
                                              title={i.label}
                                            >
                                              {IconComp && <IconComp className="w-5 h-5 mb-1" />}
                                              <span className="text-[8px] truncate max-w-full font-mono">{i.name}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* مدیریت بنرهای تبلیغاتی میانی */}
        <div id="middleBannersSettings" className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 transition-all duration-300">
          <div 
            onClick={() => toggleSection('middleBanners')}
            className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
          >
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Sliders className="w-4.5 h-4.5 text-blue-500" />
              مدیریت بنرهای تبلیغاتی میانی (کمپین‌ها و برندها)
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormData((prev: any) => ({ ...prev, showMiddleBanners: !prev.showMiddleBanners }));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                  formData.showMiddleBanners ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    formData.showMiddleBanners ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.middleBanners ? '' : 'rotate-180'}`} />
            </div>
          </div>

          {!minimizedSections.middleBanners && (
            <div className="space-y-6 animate-fadeIn">
              {formData.showMiddleBanners && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                      بنرهای تبلیغاتی میانی برای معرفی کمپین‌های فصلی، برندهای خاص یا تخفیف‌های ویژه در صفحه اصلی استفاده می‌شوند.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddMiddleBanner}
                      className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      افزودن بنر جدید
                    </button>
                  </div>

                  {(!formData.middleBanners || formData.middleBanners.length === 0) ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">هیچ بنری ثبت نشده است. برای شروع دکمه «افزودن بنر جدید» را بزنید.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {formData.middleBanners.map((banner: any, index: number) => (
                        <div key={banner.id || index} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-3">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">بنر شماره {index + 1}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveMiddleBanner(index, 'up')}
                                className="p-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-100 dark:border-slate-800 transition-all disabled:opacity-40 cursor-pointer"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === formData.middleBanners.length - 1}
                                onClick={() => handleMoveMiddleBanner(index, 'down')}
                                className="p-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-100 dark:border-slate-800 transition-all disabled:opacity-40 cursor-pointer"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMiddleBanner(index)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg border border-red-100/10 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                            {/* Image Picker */}
                            <div className="space-y-2">
                              <label className="block text-[10px] text-slate-400 dark:text-slate-500">تصویر بنر (دسکتاپ و موبایل)</label>
                              {banner.imageUrl ? (
                                <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group">
                                  <Image src={banner.imageUrl} alt="Banner Preview" fill className="object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                    <button
                                      type="button"
                                      onClick={() => setShowMediaPicker(`middlebanner-${index}`)}
                                      className="bg-white text-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-slate-100 transition-all cursor-pointer"
                                    >
                                      تغییر تصویر
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setShowMediaPicker(`middlebanner-${index}`)}
                                  className="w-full aspect-[3/1] flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                                >
                                  <Upload className="w-5 h-5 text-slate-400" />
                                  <span className="text-[10px] text-slate-500">انتخاب تصویر بنر</span>
                                </button>
                              )}
                            </div>

                            {/* Link URL */}
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-slate-400 dark:text-slate-500">لینک بنر (آدرس مقصد)</label>
                                <input
                                  type="text"
                                  value={banner.linkUrl || ''}
                                  onChange={(e) => handleUpdateMiddleBanner(index, 'linkUrl', e.target.value)}
                                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all text-left font-mono text-[11px]"
                                  placeholder="/shop or https://..."
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-slate-400 dark:text-slate-500">متن دکمه لینک (اختیاری)</label>
                                <input
                                  type="text"
                                  value={banner.linkText || ''}
                                  onChange={(e) => handleUpdateMiddleBanner(index, 'linkText', e.target.value)}
                                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                                  placeholder="مثال: مشاهده و خرید"
                                />
                              </div>
                            </div>

                            {/* Title */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] text-slate-400 dark:text-slate-500">عنوان بنر (اختیاری)</label>
                              <input
                                type="text"
                                value={banner.title || ''}
                                onChange={(e) => handleUpdateMiddleBanner(index, 'title', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                                placeholder="مثال: جشنواره زمستانه"
                              />
                            </div>

                            {/* Subtitle */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] text-slate-400 dark:text-slate-500">توضیح کوتاه بنر (اختیاری)</label>
                              <input
                                type="text"
                                value={banner.subtitle || ''}
                                onChange={(e) => handleUpdateMiddleBanner(index, 'subtitle', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                                placeholder="مثال: تا ۵۰٪ تخفیف روی تمامی محصولات"
                              />
                            </div>

                            {/* Badge */}
                            <div className="space-y-1.5 md:col-span-2">
                              <label className="block text-[10px] text-slate-400 dark:text-slate-500">برچسب بنر (اختیاری)</label>
                              <input
                                type="text"
                                value={banner.badge || ''}
                                onChange={(e) => handleUpdateMiddleBanner(index, 'badge', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                                placeholder="مثال: کمپین فصلی، برند خاص، پیشنهاد ویژه"
                              />
                            </div>

                            {/* Device Visibility Toggles */}
                            <div className="space-y-2 md:col-span-2 border-t border-slate-100 dark:border-slate-900 pt-4">
                              <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-2">نمایش بنر در دستگاه‌ها</label>
                              <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={banner.showOnDesktop !== false}
                                    onChange={(e) => handleUpdateMiddleBanner(index, 'showOnDesktop', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-800 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-slate-700 dark:text-slate-300">نمایش در دسکتاپ</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={banner.showOnTablet !== false}
                                    onChange={(e) => handleUpdateMiddleBanner(index, 'showOnTablet', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-800 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-slate-700 dark:text-slate-300">نمایش در تبلت</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={banner.showOnMobile !== false}
                                    onChange={(e) => handleUpdateMiddleBanner(index, 'showOnMobile', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-800 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-slate-700 dark:text-slate-300">نمایش در موبایل</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* مدیریت برندهای همکار */}
        <div id="brandsSettings" className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 transition-all duration-300">
          <div 
            onClick={() => toggleSection('brands')}
            className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
          >
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-blue-500" />
              کاروسل برندها (همکاران تجاری)
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormData((prev: any) => ({ ...prev, showBrands: !prev.showBrands }));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                  formData.showBrands ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    formData.showBrands ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.brands ? '' : 'rotate-180'}`} />
            </div>
          </div>

          {!minimizedSections.brands && (
            <div className="space-y-6 animate-fadeIn">
              {formData.showBrands && (
                <div className="space-y-6">
                  {/* Title & Subtitle inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-400 dark:text-slate-500">عنوان بخش برندها</label>
                      <input
                        type="text"
                        name="brandsTitle"
                        value={formData.brandsTitle || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                        placeholder="مثال: برندهای محبوب"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-slate-400 dark:text-slate-500">زیرعنوان بخش برندها</label>
                      <input
                        type="text"
                        name="brandsSubtitle"
                        value={formData.brandsSubtitle || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                        placeholder="توضیح کوتاه زیر عنوان"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-900 pt-4">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                      لوگوی برندهای همکار یا محبوب خود را وارد کنید تا به صورت یک کاروسل روان و مینیمال بی‌نهایت در صفحه اصلی نمایش داده شوند.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddBrand}
                      className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      افزودن برند جدید
                    </button>
                  </div>

                  {(!formData.brands || formData.brands.length === 0) ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">هیچ برندی ثبت نشده است. برای شروع دکمه «افزودن برند جدید» را بزنید.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {formData.brands.map((brand: any, index: number) => (
                        <div key={brand.id || index} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-3">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">برند شماره {index + 1}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveBrand(index, 'up')}
                                className="p-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-100 dark:border-slate-800 transition-all disabled:opacity-40 cursor-pointer"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === formData.brands.length - 1}
                                onClick={() => handleMoveBrand(index, 'down')}
                                className="p-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-100 dark:border-slate-800 transition-all disabled:opacity-40 cursor-pointer"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBrand(index)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg border border-red-100/10 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                            {/* Logo Image Picker */}
                            <div className="space-y-2">
                              <label className="block text-[10px] text-slate-400 dark:text-slate-500">لوگوی برند (تصویر با پس‌زمینه ترنسپرنت)</label>
                              {brand.logoUrl ? (
                                <div className="relative w-40 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group bg-slate-100 dark:bg-slate-900 p-2 flex items-center justify-center">
                                  <div className="relative w-full h-full">
                                    <Image src={brand.logoUrl} alt="Brand Logo Preview" fill className="object-contain" />
                                  </div>
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-xl">
                                    <button
                                      type="button"
                                      onClick={() => setShowMediaPicker(`brandlogo-${index}`)}
                                      className="bg-white text-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-slate-100 transition-all cursor-pointer"
                                    >
                                      تغییر لوگو
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setShowMediaPicker(`brandlogo-${index}`)}
                                  className="w-40 h-20 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                                >
                                  <Upload className="w-5 h-5 text-slate-400" />
                                  <span className="text-[10px] text-slate-500">انتخاب لوگو</span>
                                </button>
                              )}
                            </div>

                            {/* Info Fields */}
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-slate-400 dark:text-slate-500">نام برند (جهت سئو و آلت تصویر)</label>
                                <input
                                  type="text"
                                  value={brand.name || ''}
                                  onChange={(e) => handleUpdateBrand(index, 'name', e.target.value)}
                                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                                  placeholder="نام برند (مثال: نایکی)"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-slate-400 dark:text-slate-500">لینک برند (اختیاری - کلیک روی لوگو)</label>
                                <input
                                  type="text"
                                  value={brand.linkUrl || ''}
                                  onChange={(e) => handleUpdateBrand(index, 'linkUrl', e.target.value)}
                                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all text-left font-mono text-[11px]"
                                  placeholder="/shop or https://..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* مدیریت بخش وبلاگ در صفحه اصلی */}
        <div id="blogSettings" className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 transition-all duration-300">
          <div 
            onClick={() => toggleSection('blog')}
            className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
          >
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <BookOpen className="w-4.5 h-4.5 text-blue-500" />
              تنظیمات وبلاگ در صفحه اصلی
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormData((prev: any) => ({ ...prev, showBlog: !prev.showBlog }));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                  formData.showBlog ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    formData.showBlog ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.blog ? '' : 'rotate-180'}`} />
            </div>
          </div>

          {!minimizedSections.blog && (
            <div className="space-y-6 animate-fadeIn">
              {formData.showBlog && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500">عنوان بخش وبلاگ</label>
                    <input
                      type="text"
                      value={formData.blogTitle || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, blogTitle: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                      placeholder="مثال: آخرین مطالب وبلاگ"
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500">زیرعنوان بخش وبلاگ</label>
                    <input
                      type="text"
                      value={formData.blogSubtitle || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, blogSubtitle: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                      placeholder="مثال: جدیدترین مقالات و آموزش‌های ما"
                    />
                  </div>

                  {/* Limit */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500">حداکثر تعداد مطالب برای نمایش</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={formData.blogLimit || 6}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, blogLimit: parseInt(e.target.value) || 6 }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* مدیریت بخش نظرات مشتریان در صفحه اصلی */}
        <div id="reviewsSettings" className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 transition-all duration-300">
          <div 
            onClick={() => toggleSection('reviews')}
            className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
          >
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Smile className="w-4.5 h-4.5 text-blue-500" />
              تنظیمات نظرات مشتریان در صفحه اصلی
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormData((prev: any) => ({ ...prev, showReviews: !prev.showReviews }));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                  formData.showReviews ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    formData.showReviews ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.reviews ? '' : 'rotate-180'}`} />
            </div>
          </div>

          {!minimizedSections.reviews && (
            <div className="space-y-6 animate-fadeIn">
              {formData.showReviews && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500">عنوان بخش نظرات</label>
                    <input
                      type="text"
                      value={formData.reviewsTitle || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, reviewsTitle: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                      placeholder="مثال: نظرات مشتریان ما"
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500">زیرعنوان بخش نظرات</label>
                    <input
                      type="text"
                      value={formData.reviewsSubtitle || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, reviewsSubtitle: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                      placeholder="مثال: ببینید خریداران قبلی درباره ما چه می‌گویند"
                    />
                  </div>

                  {/* Limit */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-slate-400 dark:text-slate-500">حداکثر تعداد نظرات برای نمایش</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={formData.reviewsLimit || 6}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, reviewsLimit: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* مدیریت بخش باکس‌های متنی دلخواه در صفحه اصلی */}
        <div id="customTextSettings" className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 transition-all duration-300">
          <div 
            onClick={() => toggleSection('customText')}
            className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-3 cursor-pointer select-none"
          >
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-blue-500" />
              تنظیمات باکس‌های متنی دلخواه در صفحه اصلی
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormData((prev: any) => ({ ...prev, showCustomText: !prev.showCustomText }));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                  formData.showCustomText ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    formData.showCustomText ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${minimizedSections.customText ? '' : 'rotate-180'}`} />
            </div>
          </div>

          {!minimizedSections.customText && (
            <div className="space-y-6 animate-fadeIn">
              {formData.showCustomText && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                      می‌توانید یک یا چند باکس متنی همراه با تصویر و دکمه کال تو اکشن (CTA) برای معرفی خدمات، محصولات یا درباره فروشگاه اضافه کنید.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddCustomTextBox}
                      className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      افزودن باکس متنی جدید
                    </button>
                  </div>

                  {(!formData.customTextBoxes || formData.customTextBoxes.length === 0) ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">هیچ باکس متنی ثبت نشده است. برای شروع دکمه «افزودن باکس متنی جدید» را بزنید.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {formData.customTextBoxes.map((box: any, index: number) => (
                        <div key={box.id || index} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-3">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">باکس متنی شماره {index + 1} ({box.title || 'بدون عنوان'})</span>
                            <div className="flex items-center gap-2">
                              {/* Toggle Active status */}
                              <button
                                type="button"
                                onClick={() => handleUpdateCustomTextBox(index, 'isActive', !box.isActive)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                  box.isActive 
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' 
                                    : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500'
                                }`}
                              >
                                {box.isActive ? 'فعال' : 'غیرفعال'}
                              </button>
                              
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveCustomTextBox(index, 'up')}
                                className="p-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-100 dark:border-slate-800 transition-all disabled:opacity-40 cursor-pointer"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === formData.customTextBoxes.length - 1}
                                onClick={() => handleMoveCustomTextBox(index, 'down')}
                                className="p-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-100 dark:border-slate-800 transition-all disabled:opacity-40 cursor-pointer"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomTextBox(index)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg border border-red-100/10 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 text-xs font-bold">
                            {/* Title */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] text-slate-400 dark:text-slate-500">عنوان باکس متنی</label>
                              <input
                                type="text"
                                value={box.title || ''}
                                onChange={(e) => handleUpdateCustomTextBox(index, 'title', e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                                placeholder="مثال: درباره فروشگاه ما"
                              />
                            </div>

                            {/* Content */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] text-slate-400 dark:text-slate-500">محتوای باکس متنی (پشتیبانی از کدهای HTML و متن ساده)</label>
                              <textarea
                                rows={4}
                                value={box.content || ''}
                                onChange={(e) => handleUpdateCustomTextBox(index, 'content', e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all font-mono text-xs leading-relaxed"
                                placeholder="متن دلخواه خود را در این قسمت وارد کنید. می‌توانید از تگ‌های HTML مانند <p>، <br>، <b>، <a> و... برای زیباسازی استفاده کنید."
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Image Selector */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-slate-400 dark:text-slate-500">تصویر باکس متنی</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={box.imageUrl || ''}
                                    onChange={(e) => handleUpdateCustomTextBox(index, 'imageUrl', e.target.value)}
                                    className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                                    placeholder="آدرس تصویر یا انتخاب از گالری"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowMediaPicker(`customtextbox-${index}`)}
                                    className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                                  >
                                    <Upload className="w-4 h-4" />
                                    گالری
                                  </button>
                                </div>
                                {box.imageUrl && (
                                  <div className="mt-2 relative w-32 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                    <Image src={box.imageUrl} alt="پیش‌نمایش" fill className="object-cover" />
                                  </div>
                                )}
                              </div>

                              {/* Image Position */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-slate-400 dark:text-slate-500">موقعیت تصویر (در دسکتاپ)</label>
                                <select
                                  value={box.imagePosition || 'right'}
                                  onChange={(e) => handleUpdateCustomTextBox(index, 'imagePosition', e.target.value)}
                                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all cursor-pointer"
                                >
                                  <option value="right">راست (تصویر راست، متن چپ)</option>
                                  <option value="left">چپ (تصویر چپ، متن راست)</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* CTA Button Text */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-slate-400 dark:text-slate-500">متن دکمه کال تو اکشن (اختیاری)</label>
                                <input
                                  type="text"
                                  value={box.ctaText || ''}
                                  onChange={(e) => handleUpdateCustomTextBox(index, 'ctaText', e.target.value)}
                                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                                  placeholder="مثال: بیشتر بدانید / خرید محصول"
                                />
                              </div>

                              {/* CTA Button URL */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] text-slate-400 dark:text-slate-500">لینک دکمه کال تو اکشن (اختیاری)</label>
                                <input
                                  type="text"
                                  value={box.ctaUrl || ''}
                                  onChange={(e) => handleUpdateCustomTextBox(index, 'ctaUrl', e.target.value)}
                                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                                  placeholder="مثال: /shop یا https://..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {showMediaPicker && (
        <MediaPicker
          accepts="image/*"
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPicker(null)}
        />
      )}
    </div>
  );
}
