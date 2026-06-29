'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  Store, 
  Mail, 
  Phone, 
  MapPin, 
  Palette, 
  Globe, 
  DollarSign, 
  Package, 
  Flame, 
  Smartphone, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Trash2, 
  Sliders, 
  Sparkles,
  Home,
  Settings,
  Grid,
  ShoppingCart,
  User,
  Search,
  Heart,
  CreditCard,
  Truck,
  Menu,
  Tag,
  Percent,
  Bell,
  MessageSquare,
  Bookmark,
  Compass,
  Gift,
  HelpCircle,
  Info,
  Clock,
  Calendar,
  Check,
  CheckSquare,
  Square,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Wand2
} from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';

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
  Bookmark,
  Compass,
  MapPin,
  Gift,
  HelpCircle,
  Phone,
  Info
};

const SHOP_ICONS = [
  { name: 'Home', label: 'خانه' },
  { name: 'Grid', label: 'دسته‌بندی‌ها' },
  { name: 'ShoppingCart', label: 'سبد خرید' },
  { name: 'User', label: 'پروفایل' },
  { name: 'Search', label: 'جستجو' },
  { name: 'Heart', label: 'علاقه‌مندی‌ها' },
  { name: 'Flame', label: 'شگفت‌انگیز' },
  { name: 'Sparkles', label: 'پیشنهاد ویژه' },
  { name: 'Menu', label: 'منو' },
  { name: 'Tag', label: 'تخفیف‌ها' },
  { name: 'Percent', label: 'کوپن‌ها' },
  { name: 'Bell', label: 'اعلان‌ها' },
  { name: 'MessageSquare', label: 'پشتیبانی' },
  { name: 'Bookmark', label: 'نشان‌شده‌ها' },
  { name: 'Compass', label: 'اکسپلور' },
  { name: 'Gift', label: 'هدایا' },
  { name: 'HelpCircle', label: 'راهنما' },
  { name: 'Info', label: 'درباره ما' },
  { name: 'Plus', label: 'افزودن/مثبت' }
];

const DEFAULT_BOTTOM_NAV_CONFIG = {
  enabled: true,
  appearance: {
    backgroundColor: 'var(--background)',
    iconColor: 'var(--color-slate-400, #94a3b8)',
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
    badgeColor: 'var(--color-rose-500, #f43f5e)',
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
    { id: 'home', label: 'خانه', icon: 'Home', link: '/', visible: true, activeColor: 'var(--primary)', inactiveColor: 'var(--color-slate-400, #94a3b8)', order: 0 },
    { id: 'categories', label: 'دسته‌بندی‌ها', icon: 'Grid', link: '/categories', visible: true, activeColor: 'var(--primary)', inactiveColor: 'var(--color-slate-400, #94a3b8)', order: 1 },
    { id: 'cart', label: 'سبد خرید', icon: 'ShoppingCart', link: '/cart', visible: true, activeColor: 'var(--primary)', inactiveColor: 'var(--color-slate-400, #94a3b8)', order: 2 },
    { id: 'profile', label: 'پروفایل', icon: 'User', link: '/profile', visible: true, activeColor: 'var(--primary)', inactiveColor: 'var(--color-slate-400, #94a3b8)', order: 3 },
    { id: 'search', label: 'جستجو', icon: 'Search', link: '/search', visible: true, activeColor: 'var(--primary)', inactiveColor: 'var(--color-slate-400, #94a3b8)', order: 4 }
  ]
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [testingBale, setTestingBale] = useState(false);
  const [tokenChanged, setTokenChanged] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error' | '', text: string }>({ type: '', text: '' });
  const [testingSms, setTestingSms] = useState(false);
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsTestPattern, setSmsTestPattern] = useState('');
  const [smsTestResult, setSmsTestResult] = useState<{ type: 'success' | 'error' | '', text: string }>({ type: '', text: '' });
  const [showMediaPicker, setShowMediaPicker] = useState<'logo' | 'favicon' | 'watermark_logo' | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'homepage' | 'products' | 'contact_payment' | 'bg_removal' | 'integrations'>('general');
  const [activePackage, setActivePackage] = useState<any>(null);
  const [packageExpiresAt, setPackageExpiresAt] = useState<string | null>(null);
  const [baseDomainSuffix, setBaseDomainSuffix] = useState('.localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      if (host.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
        setBaseDomainSuffix('.' + host);
      } else {
        const parts = host.split('.');
        if (parts.length >= 2) {
          const baseDomain = parts.slice(-2).join('.');
          setBaseDomainSuffix('.' + baseDomain);
        } else {
          setBaseDomainSuffix('.' + host);
        }
      }
    }
  }, []);

  // Helper function to generate dynamic minimal & professional color suggestions based on user input
  const getDynamicColorPresets = (inputHex: string) => {
    // Basic validation and fallback
    let hex = (inputHex || '#000000').trim().replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      hex = '610028'; // default fallback
    }

    // Convert HEX to HSL
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    const hue = h * 360;
    const sat = s * 100;
    const light = l * 100;

    // Helper to convert HSL back to HEX
    const hslToHex = (hVal: number, sVal: number, lVal: number) => {
      const hDeg = (hVal % 360 + 360) % 360;
      const sPct = Math.max(0, Math.min(100, sVal)) / 100;
      const lPct = Math.max(0, Math.min(100, lVal)) / 100;

      const c = (1 - Math.abs(2 * lPct - 1)) * sPct;
      const x = c * (1 - Math.abs((hDeg / 60) % 2 - 1));
      const m = lPct - c / 2;
      let rVal = 0, gVal = 0, bVal = 0;

      if (0 <= hDeg && hDeg < 60) {
        rVal = c; gVal = x; bVal = 0;
      } else if (60 <= hDeg && hDeg < 120) {
        rVal = x; gVal = c; bVal = 0;
      } else if (120 <= hDeg && hDeg < 180) {
        rVal = 0; gVal = c; bVal = x;
      } else if (180 <= hDeg && hDeg < 240) {
        rVal = 0; gVal = x; bVal = c;
      } else if (240 <= hDeg && hDeg < 300) {
        rVal = x; gVal = 0; bVal = c;
      } else if (300 <= hDeg && hDeg < 360) {
        rVal = c; gVal = 0; bVal = x;
      }

      const rHex = Math.round((rVal + m) * 255).toString(16).padStart(2, '0');
      const gHex = Math.round((gVal + m) * 255).toString(16).padStart(2, '0');
      const bHex = Math.round((bVal + m) * 255).toString(16).padStart(2, '0');

      return `#${rHex}${gHex}${bHex}`.toUpperCase();
    };

    return [
      { color: hslToHex(hue, Math.min(sat, 65), Math.max(35, Math.min(light, 50))), name: 'نسخه ملایم و شیک (Muted)' },
      { color: hslToHex(hue, Math.min(sat, 75), Math.max(18, Math.min(light - 12, 32))), name: 'نسخه عمیق و لوکس (Deep)' },
    ];
  };

  // AI Assistant States
  const [promptInput, setPromptInput] = useState('');
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState('');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [pendingFormData, setPendingFormData] = useState<any>(null);

  const tabsRef = useRef<HTMLDivElement>(null);
  const scrollInterval = useRef<NodeJS.Timeout | null>(null);

  const startScrolling = (direction: 'left' | 'right') => {
    stopScrolling();
    scrollInterval.current = setInterval(() => {
      if (tabsRef.current) {
        // In RTL, left/right scroll directions are inverted or standard depending on browser.
        // We will scroll by -15 or 15.
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
      id: 'general',
      title: 'هویت و ظاهر',
      description: 'نام، لوگو، رنگ برند، زبان و سئو',
      icon: Store,
    },
    {
      id: 'homepage',
      title: 'صفحه اصلی و ناوبری',
      description: 'تنظیمات لندینگ پیج و نوار ناوبری موبایل',
      icon: Home,
    },
    {
      id: 'products',
      title: 'محصولات و فروشگاه',
      description: 'نوع کاتالوگ، شگفت‌انگیزها و محصولات مرتبط',
      icon: Package,
    },
    {
      id: 'contact_payment',
      title: 'ارتباطات، پرداخت و ارسال',
      description: 'اطلاعات تماس، آدرس فیزیکی، درگاه زرین‌پال و تنظیمات تیپاکس',
      icon: CreditCard,
    },
    {
      id: 'bg_removal',
      title: 'حذف پس‌زمینه با هوش مصنوعی',
      description: 'مشاهده وضعیت مصرف، اعتبار و راهنمای استفاده از هوش مصنوعی',
      icon: Sparkles,
    },
    {
      id: 'integrations',
      title: 'اتصال به سایر امکانات',
      description: 'اتصال به پیام‌رسان بله، ترب، گوگل وب‌مستر و...',
      icon: Sliders,
    }
  ];

  const [formData, setFormData] = useState({
    shopName: '',
    subdomain: '',
    description: '',
    logoUrl: '',
    faviconUrl: '',
    themeColor: 'var(--primary)',
    currency: 'IRR',
    language: 'fa',
    contactEmail: '',
    contactPhone: '',
    address: '',
    registrationNumber: '',
    economicCode: '',
    productType: 'both',
    specialDealsEnabled: false,
    specialDealsLimit: 4,
    relatedProductsEnabled: true,
    wholesaleEnabled: false,
    sitemapEnabled: true,
    robotsEnabled: true,
    zarinpalEnabled: false,
    zarinpalMerchantId: '',
    zarinpalSandbox: false,
    zibalEnabled: false,
    zibalMerchantId: '',
    zibalSandbox: false,
    digipayEnabled: false,
    digipayClientId: '',
    digipayClientSecret: '',
    digipayUsername: '',
    digipayPassword: '',
    digipaySandbox: false,
    cardToCardEnabled: false,
    cardNumber: '',
    cardHolderName: '',
    cardBankName: '',
    cardSheba: '',
    cardToCardConfig: '[]',
    tipaxEnabled: false,
    tipaxUsername: '',
    tipaxPassword: '',
    tipaxApiKey: '',
    tipaxSandbox: false,
    tipaxShippingMode: 'manual',
    bgRemovalCount: 0,
    bottomNavConfig: '',
    homePageType: 'custom',
    heroTitle: 'به فروشگاه ما خوش آمدید',
    heroSubtitle: 'بهترین محصولات با بالاترین کیفیت',
    heroCtaText: 'ورود به فروشگاه',
    heroCtaUrl: '/shop',
    showStories: true,
    showShoppable: true,
  baleIntegrationToken: '',
  baleChatId: '',
  baleOrderNotificationsEnabled: false,
  baleNotificationStatuses: ['new_order', 'status_change'],
  googleAnalyticsId: '',
  googleTagManagerId: '',
  microsoftClarityId: '',
  mahakEnabled: false,
  mahakApiKey: '',
  mahakServerUrl: '',
  mahakUsername: '',
  mahakPassword: '',
  mahakSyncProducts: false,
  mahakSyncOrders: false,
  mahakSyncCustomers: false,
  mahakSyncCustomersPhoneOnly: false,
  mahakSyncInterval: 60,
  smsConfig: {
    enabled: false,
    provider: '',
    credentials: { username: '', password: '', apiKey: '' },
    patterns: {
      order_placed_customer: '',
      order_placed_admin: '',
      order_shipped: '',
      order_cancelled: '',
      new_registration: '',
      otp: ''
    },
    adminPhone: ''
  },
  });

  const DEFAULT_IMAGE_PROCESS_CONFIG = {
    bgColor: 'var(--background)',
    dimensions: 'square',
    subjectScale: 50,
    watermarkType: 'none',
    watermarkText: '',
    watermarkLogoUrl: '',
    watermarkOpacity: 0.25,
    watermarkPosition: 'center',
  };

  const [imageProcess, setImageProcess] = useState<any>(DEFAULT_IMAGE_PROCESS_CONFIG);

  const [bottomNav, setBottomNav] = useState<any>(DEFAULT_BOTTOM_NAV_CONFIG);

  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkDiscount, setBulkDiscount] = useState<number>(15);
  const [bulkDuration, setBulkDuration] = useState<number>(24);
  const [bulkSearch, setBulkSearch] = useState('');

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/admin/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleRemoveFromSpecial = async (productId: string) => {
    try {
      const res = await fetch('/api/admin/products/bulk-special', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: [productId],
          isSpecial: false
        })
      });
      if (res.ok) {
        fetchProducts();
      } else {
        alert('خطا در حذف محصول از شگفت‌انگیزها');
      }
    } catch (error) {
      console.error('Error removing product from special:', error);
    }
  };

  const handleSaveBulkSpecial = async () => {
    if (selectedProductIds.length === 0) {
      alert('لطفاً حداقل یک محصول را انتخاب کنید.');
      return;
    }
    try {
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + Number(bulkDuration));

      const res = await fetch('/api/admin/products/bulk-special', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedProductIds,
          isSpecial: true,
          discount: bulkDiscount,
          specialEndsAt: endsAt.toISOString()
        })
      });

      if (res.ok) {
        setShowBulkModal(false);
        setSelectedProductIds([]);
        setBulkSearch('');
        fetchProducts();
      } else {
        alert('خطا در ثبت گروهی محصولات');
      }
    } catch (error) {
      console.error('Error saving bulk special deals:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (formData.themeColor) {
      document.documentElement.style.setProperty('--primary', formData.themeColor);
    }
  }, [formData.themeColor]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setActivePackage(data.settings.package || null);
          setPackageExpiresAt(data.settings.packageExpiresAt || null);

          let customHome = {
            heroTitle: 'به فروشگاه ما خوش آمدید',
            heroSubtitle: 'بهترین محصولات با بالاترین کیفیت',
            heroCtaText: 'ورود به فروشگاه',
            heroCtaUrl: '/shop',
            showStories: true,
            showShoppable: true,
          };
          if (data.settings.customHomeConfig) {
            try {
              customHome = { ...customHome, ...JSON.parse(data.settings.customHomeConfig) };
            } catch (e) {}
          }

          setFormData({
            shopName: data.settings.shopName || '',
            subdomain: data.settings.subdomain || '',
            description: data.settings.description || '',
            logoUrl: data.settings.logoUrl || '',
            faviconUrl: data.settings.faviconUrl || '',
            themeColor: data.settings.themeColor || 'var(--primary)',
            currency: data.settings.currency || 'IRR',
            language: data.settings.language || 'fa',
            contactEmail: data.settings.contactEmail || '',
            contactPhone: data.settings.contactPhone || '',
            address: data.settings.address || '',
            registrationNumber: data.settings.registrationNumber || '',
            economicCode: data.settings.economicCode || '',
            productType: data.settings.productType || 'both',
            specialDealsEnabled: data.settings.specialDealsEnabled || false,
            specialDealsLimit: data.settings.specialDealsLimit || 4,
            relatedProductsEnabled: data.settings.relatedProductsEnabled !== undefined ? data.settings.relatedProductsEnabled : true,
            wholesaleEnabled: data.settings.wholesaleEnabled || false,
            sitemapEnabled: data.settings.sitemapEnabled !== undefined ? data.settings.sitemapEnabled : true,
            robotsEnabled: data.settings.robotsEnabled !== undefined ? data.settings.robotsEnabled : true,
            zarinpalEnabled: data.settings.zarinpalEnabled || false,
            zarinpalMerchantId: data.settings.zarinpalMerchantId || '',
            zarinpalSandbox: data.settings.zarinpalSandbox || false,
            zibalEnabled: data.settings.zibalEnabled || false,
            zibalMerchantId: data.settings.zibalMerchantId || '',
            zibalSandbox: data.settings.zibalSandbox || false,
            digipayEnabled: data.settings.digipayEnabled || false,
            digipayClientId: data.settings.digipayClientId || '',
            digipayClientSecret: data.settings.digipayClientSecret || '',
            digipayUsername: data.settings.digipayUsername || '',
            digipayPassword: data.settings.digipayPassword || '',
            digipaySandbox: data.settings.digipaySandbox || false,
            cardToCardEnabled: data.settings.cardToCardEnabled || false,
            cardNumber: data.settings.cardNumber || '',
            cardHolderName: data.settings.cardHolderName || '',
            cardBankName: data.settings.cardBankName || '',
            cardSheba: data.settings.cardSheba || '',
            cardToCardConfig: data.settings.cardToCardConfig || '[]',
            tipaxEnabled: data.settings.tipaxEnabled || false,
            tipaxUsername: data.settings.tipaxUsername || '',
            tipaxPassword: data.settings.tipaxPassword || '',
            tipaxApiKey: data.settings.tipaxApiKey || '',
            tipaxSandbox: data.settings.tipaxSandbox || false,
            tipaxShippingMode: data.settings.tipaxShippingMode || 'manual',
            bgRemovalCount: data.settings.bgRemovalCount || 0,
            bottomNavConfig: data.settings.bottomNavConfig || '',
            homePageType: data.settings.homePageType || 'custom',
            heroTitle: customHome.heroTitle,
            heroSubtitle: customHome.heroSubtitle,
            heroCtaText: customHome.heroCtaText,
            heroCtaUrl: customHome.heroCtaUrl,
            showStories: customHome.showStories,
            showShoppable: customHome.showShoppable !== undefined ? customHome.showShoppable : true,
            baleIntegrationToken: data.settings.baleIntegrationToken || '',
            baleChatId: data.settings.baleChatId || '',
            baleOrderNotificationsEnabled: data.settings.baleOrderNotificationsEnabled || false,
            baleNotificationStatuses: data.settings.baleNotificationStatuses ? JSON.parse(data.settings.baleNotificationStatuses) : ['new_order', 'status_change'],
            googleAnalyticsId: data.settings.googleAnalyticsId || '',
            googleTagManagerId: data.settings.googleTagManagerId || '',
            microsoftClarityId: data.settings.microsoftClarityId || '',
            mahakEnabled: data.settings.mahakEnabled || false,
            mahakApiKey: data.settings.mahakApiKey || '',
            mahakServerUrl: data.settings.mahakServerUrl || '',
            mahakUsername: data.settings.mahakUsername || '',
            mahakPassword: data.settings.mahakPassword || '',
            mahakSyncProducts: data.settings.mahakSyncProducts || false,
            mahakSyncOrders: data.settings.mahakSyncOrders || false,
            mahakSyncCustomers: data.settings.mahakSyncCustomers || false,
            mahakSyncCustomersPhoneOnly: data.settings.mahakSyncCustomersPhoneOnly || false,
            mahakSyncInterval: data.settings.mahakSyncInterval || 60,
            smsConfig: data.settings.smsConfig ? (typeof data.settings.smsConfig === 'string' ? JSON.parse(data.settings.smsConfig) : data.settings.smsConfig) : {
              enabled: false,
              provider: '',
              credentials: { username: '', password: '', apiKey: '' },
              patterns: {
                order_placed_customer: '',
              order_placed_admin: '',
              order_shipped: '',
              order_cancelled: '',
              new_registration: '',
              otp: ''
            },
              adminPhone: ''
            },
          });

          if (data.settings.bottomNavConfig) {
            try {
              const parsed = JSON.parse(data.settings.bottomNavConfig);
              setBottomNav({
                ...DEFAULT_BOTTOM_NAV_CONFIG,
                ...parsed,
                appearance: { ...DEFAULT_BOTTOM_NAV_CONFIG.appearance, ...parsed.appearance },
                behavior: { ...DEFAULT_BOTTOM_NAV_CONFIG.behavior, ...parsed.behavior },
                badge: { ...DEFAULT_BOTTOM_NAV_CONFIG.badge, ...parsed.badge },
                specialButton: { ...DEFAULT_BOTTOM_NAV_CONFIG.specialButton, ...parsed.specialButton },
                items: parsed.items ? parsed.items : DEFAULT_BOTTOM_NAV_CONFIG.items
              });
            } catch (e) {
              setBottomNav(DEFAULT_BOTTOM_NAV_CONFIG);
            }
          } else {
            setBottomNav(DEFAULT_BOTTOM_NAV_CONFIG);
          }

          if (data.settings.imageProcessConfig) {
            try {
              const parsed = JSON.parse(data.settings.imageProcessConfig);
              setImageProcess({
                ...DEFAULT_IMAGE_PROCESS_CONFIG,
                ...parsed,
              });
            } catch (e) {
              setImageProcess(DEFAULT_IMAGE_PROCESS_CONFIG);
            }
          } else {
            setImageProcess(DEFAULT_IMAGE_PROCESS_CONFIG);
          }
        }
      }
    } catch (error) {
      console.error('[ERROR] [Settings]: Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFeatureEnabled = (featureKey: string): boolean => {
    if (!activePackage) {
      if (featureKey === 'physicalProducts') return true;
      return false;
    }
    try {
      const features = JSON.parse(activePackage.features);
      return !!features[featureKey];
    } catch (e) {
      return false;
    }
  };

  const getFeatureLimit = (featureKey: string): number => {
    if (!activePackage) return 0;
    try {
      const features = JSON.parse(activePackage.features);
      return parseInt(features[featureKey]) || 0;
    } catch (e) {
      return 0;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [newExcludedPage, setNewExcludedPage] = useState('');
  const [activeIconPickerIndex, setActiveIconPickerIndex] = useState<number | null>(null);

  const updateBottomNavField = (field: string, value: any) => {
    setBottomNav((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateBottomNavAppearance = (field: string, value: any) => {
    setBottomNav((prev: any) => ({
      ...prev,
      appearance: { ...prev.appearance, [field]: value }
    }));
  };

  const updateBottomNavBehavior = (field: string, value: any) => {
    setBottomNav((prev: any) => ({
      ...prev,
      behavior: { ...prev.behavior, [field]: value }
    }));
  };

  const updateBottomNavBadge = (field: string, value: any) => {
    setBottomNav((prev: any) => ({
      ...prev,
      badge: { ...prev.badge, [field]: value }
    }));
  };

  const updateBottomNavSpecialButton = (field: string, value: any) => {
    setBottomNav((prev: any) => ({
      ...prev,
      specialButton: { ...prev.specialButton, [field]: value }
    }));
  };

  const updateNavItem = (index: number, field: string, value: any) => {
    setBottomNav((prev: any) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    setBottomNav((prev: any) => {
      const newItems = [...prev.items];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newItems.length) return prev;
      
      const temp = newItems[index];
      newItems[index] = newItems[targetIndex];
      newItems[targetIndex] = temp;

      newItems.forEach((item, idx) => {
        item.order = idx;
      });

      return { ...prev, items: newItems };
    });
  };

  const addExcludedPage = () => {
    if (!newExcludedPage) return;
    setBottomNav((prev: any) => {
      if (prev.excludedPages.includes(newExcludedPage)) return prev;
      return { ...prev, excludedPages: [...prev.excludedPages, newExcludedPage] };
    });
    setNewExcludedPage('');
  };

  const removeExcludedPage = (page: string) => {
    setBottomNav((prev: any) => ({
      ...prev,
      excludedPages: prev.excludedPages.filter((p: string) => p !== page)
    }));
  };

  const handleApplyAiControl = async () => {
    if (!promptInput.trim()) return;

    setControlling(true);
    setControlError('');
    setControlSuccessMessage('');

    try {
      const res = await fetch('/api/admin/settings/ai-control', {
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const getRes = await fetch('/api/settings');
      if (getRes.ok) {
        const getData = await getRes.json();
        const existing = getData.settings || {};
        
        let existingCustomHomeConfig = {};
        if (existing.customHomeConfig) {
          try {
            existingCustomHomeConfig = JSON.parse(existing.customHomeConfig);
          } catch (e) {}
        }

        const customHomeConfigObj = {
          ...existingCustomHomeConfig,
          heroTitle: formData.heroTitle,
          heroSubtitle: formData.heroSubtitle,
          heroCtaText: formData.heroCtaText,
          heroCtaUrl: formData.heroCtaUrl,
          showStories: formData.showStories,
          showShoppable: formData.showShoppable,
        };

        const payload = {
          ...formData,
          baleNotificationStatuses: JSON.stringify(formData.baleNotificationStatuses),
          customHomeConfig: JSON.stringify(customHomeConfigObj),
          bottomNavConfig: JSON.stringify(bottomNav),
          imageProcessConfig: JSON.stringify(imageProcess),
          smsConfig: JSON.stringify(formData.smsConfig)
        };

        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setMessage({ type: 'success', text: 'تنظیمات با موفقیت ذخیره شد.' });
          setTokenChanged(false);
        } else {
          throw new Error('خطا در ذخیره تنظیمات');
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'خطا در ارتباط با سرور.' });
    } finally {
      setSaving(false);
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleGenerateBaleToken = () => {
    // Generate an 8-character unique uppercase random token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = 'BALE-';
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, baleIntegrationToken: token }));
    setTokenChanged(true);
  };

  const handleSendTestSms = async () => {
    if (!smsTestPhone || !smsTestPattern) {
      setSmsTestResult({ type: 'error', text: 'لطفاً شماره موبایل تست و کد الگو/قالب را وارد کنید.' });
      return;
    }

    setTestingSms(true);
    setSmsTestResult({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/settings/test-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: formData.smsConfig.provider,
          credentials: formData.smsConfig.credentials,
          patternCode: smsTestPattern,
          testPhone: smsTestPhone,
          patterns: formData.smsConfig.patterns,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSmsTestResult({ type: 'success', text: `پیامک تستی با موفقیت ارسال شد. شناسه پیامک: ${data.messageId}` });
      } else {
        setSmsTestResult({ type: 'error', text: data.error || 'خطا در ارسال پیامک تستی.' });
      }
    } catch (err: any) {
      setSmsTestResult({ type: 'error', text: err?.message || 'خطای شبکه در ارسال پیامک تستی.' });
    } finally {
      setTestingSms(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3 select-none">
        <div className="w-10 h-10 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
        <span className="text-xs font-bold text-slate-450 dark:text-slate-500">در حال بارگذاری تنظیمات فروشگاه...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 select-none">
      
      {/* Header Banner - Floating Box Layout */}
      <div className="bg-gradient-to-r from-blue-600/[0.07] via-blue-600/[0.03] to-transparent dark:from-blue-500/10 dark:via-blue-500/5 dark:to-transparent rounded-3xl p-6 border border-blue-500/10 dark:border-blue-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <Store className="w-6 h-6 text-blue-500" />
            تنظیمات عمومی فروشگاه سازمانی
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">پیکربندی هویت تجاری، تم رنگی، اطلاعات تماس، دامین‌ها و بومی‌سازی فروشگاه شما</p>
        </div>
        <button
          onClick={() => handleSubmit()}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98 hover:shadow-md shrink-0 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'در حال ذخیره‌سازی...' : 'ذخیره کل پیکربندی'}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl text-xs font-black shadow-sm border ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* AI Assistant Card */}
      <div id="ai-assistant-section" className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 animate-in fade-in duration-300 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-600 text-white">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 dark:text-white">دستیار هوشمند تنظیمات عمومی و فروشگاهی</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
              با نوشتن پرامپت، هر بخشی از تنظیمات عمومی، فروشگاهی، پرداخت، ارسال یا بله را که می‌خواهید تغییر دهید (مثال: "نام فروشگاه را بگذار شیک‌پوش، رنگ تمپلیت را قرمز کن و درگاه زرین‌پال را فعال کن")
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="مثال: نام فروشگاه را بگذار 'گالری مدرن'، رنگ تم را بنفش کن و کارت به کارت را با شماره کارت ۵۰۲۲... فعال کن..."
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
            'نام فروشگاه را بگذار گالری شیک‌پوش و رنگ تم را سبز کن',
            'درگاه پرداخت زرین‌پال را فعال کن و مرچنت آی‌دی را بگذار ۱۲۳۴-۵۶۷۸',
            'ارسال با تیپاکس را فعال کن و حالت محاسبه هزینه را روی اتوماتیک بذار',
            'ارسال نوتیفیکیشن سفارشات به پیام‌رسان بله را فعال کن'
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
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-450">
            {controlError}
          </div>
        )}

        {controlSuccessMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400">
            {controlSuccessMessage}
          </div>
        )}
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
                تغییرات پس از تایید شما در فرم اعمال می‌شوند. برای ذخیره نهایی در دیتابیس باید روی دکمه «ذخیره کل پیکربندی» کلیک کنید.
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
                    setControlSuccessMessage('تغییرات با موفقیت در فرم اعمال شد. برای ثبت نهایی روی دکمه «ذخیره کل پیکربندی» کلیک کنید.');
                    setPromptInput('');
                    setTimeout(() => setControlSuccessMessage(''), 8000);
                  }
                  setShowAiConfirmModal(false);
                  setPendingFormData(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition-all cursor-pointer shadow-sm"
              >
                تایید و اعمال
              </button>
            </div>
          </div>
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
                className="absolute left-12 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 dark:bg-slate-900/90 border border-slate-150 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Right Scroll Button */}
              <button
                type="button"
                onClick={() => handleScroll('right')}
                onMouseEnter={() => startScrolling('right')}
                onMouseLeave={stopScrolling}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 dark:bg-slate-900/90 border border-slate-150 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200"
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
                      className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-xs shrink-0 snap-center transition-all border ${
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
                className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl shadow-md shadow-blue-500/10 transition-all active:scale-95 shrink-0 flex items-center justify-center"
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
                    className={`group relative flex items-center gap-3.5 p-3 rounded-2xl text-right transition-all border w-full ${
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
                      <span className={`block text-[9px] font-bold mt-0.5 truncate ${isActive ? 'text-blue-500/80' : 'text-slate-400'}`}>
                        {tab.description}
                      </span>
                    </div>

                    {/* Beautiful Tooltip on Hover for Tablet/Desktop */}
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
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 px-4 rounded-2xl font-black text-xs shadow-md shadow-blue-500/10 hover:shadow-lg transition-all duration-200 active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'در حال ذخیره...' : 'ذخیره کل تنظیمات'}
                </button>
              </div>
            </div>
          </div>

          {/* Active Tab Content */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6">
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                {/* اطلاعات پایه - Independent rounded card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
            <Store className="w-4.5 h-4.5 text-blue-500" />
            اطلاعات پایه و هویت تجاری فروشگاه
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">نام تجاری فروشگاه (عنوان اصلی)</label>
              <input
                type="text"
                name="shopName"
                value={formData.shopName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all"
                required
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">آدرس ساب‌دامین اختصاصی (یکتا)</label>
              <div className="flex items-center">
                <input
                  type="text"
                  name="subdomain"
                  value={formData.subdomain}
                  onChange={handleChange}
                  dir="ltr"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-r-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all text-left font-bold"
                  placeholder="my-shop"
                />
                <span className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-800 rounded-l-2xl text-slate-400 dark:text-slate-500 font-mono text-[11px] select-none">
                  {baseDomainSuffix}
                </span>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1 bg-slate-50/50 dark:bg-slate-950/20 p-4.5 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">لوگو و نشان تجاری فروشگاه</label>
              <div className="flex items-center gap-4">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-350 dark:text-slate-650 flex items-center justify-center font-bold text-[10px]">بدون لوگو</div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker('logo')}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-colors text-[10px] font-black shadow-sm"
                  >
                    انتخاب از رسانه‌ها
                  </button>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                      className="px-2 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors text-[10px] font-black"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1 bg-slate-50/50 dark:bg-slate-950/20 p-4.5 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">فاوآیکون ( Favicon مرورگر )</label>
              <div className="flex items-center gap-4">
                {formData.faviconUrl ? (
                  <img src={formData.faviconUrl} alt="Favicon" className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-350 dark:text-slate-650 flex items-center justify-center font-bold text-[10px]">بدون فاو</div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker('favicon')}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition-colors text-[10px] font-black shadow-sm"
                  >
                    انتخاب از رسانه‌ها
                  </button>
                  {formData.faviconUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, faviconUrl: '' }))}
                      className="px-2 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors text-[10px] font-black"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">توضیحات کلی فروشگاه (متا دیسکریپشن برای سئو گوگل)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all resize-none font-bold"
              ></textarea>
            </div>
          </div>
        </div>

        {/* ظاهر و بومی‌سازی - Independent rounded card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
            <Palette className="w-4.5 h-4.5 text-purple-500" />
            ظاهر، برندسازی و بومی‌سازی فروشگاه
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-bold">
            <div>
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">رنگ اصلی برند (Dynamic CSS Variable)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="themeColor"
                  value={formData.themeColor}
                  onChange={handleChange}
                  className="h-10 w-10 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 overflow-hidden shrink-0"
                />
                <input
                  type="text"
                  name="themeColor"
                  value={formData.themeColor}
                  onChange={handleChange}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all font-mono text-[11px] text-left"
                  dir="ltr"
                />
              </div>

              <div className="mt-3 space-y-2">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black block">پیشنهاد هوش مصنوعی بر اساس رنگ انتخابی شما:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {getDynamicColorPresets(formData.themeColor).map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, themeColor: preset.color }))}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                        formData.themeColor.toUpperCase() === preset.color.toUpperCase()
                          ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/10'
                          : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-md border border-black/10 dark:border-white/10 block shrink-0"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                <Globe className="w-4 h-4 text-slate-400" /> زبان پیش‌فرض خریداران
              </label>
              <select
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 dark:text-slate-300 font-black cursor-pointer transition-all"
              >
                <option value="fa">فارسی (RTL)</option>
                <option value="en">English (LTR)</option>
                <option value="ar">العربية (RTL)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-slate-400" /> واحد پولی پیش‌فرض
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 dark:text-slate-300 font-black cursor-pointer transition-all"
              >
                <option value="IRR">ریال ایران</option>
                <option value="IRT">تومان ایران</option>
                <option value="USD">دلار آمریکا ($)</option>
              </select>
            </div>
          </div>
        </div>
        </div>
        )}

        {/* تنظیمات صفحه اصلی و لندینگ پیج - Independent rounded card */}
        {activeTab === 'homepage' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
              <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
            <Home className="w-4.5 h-4.5 text-blue-500" />
            تنظیمات صفحه اصلی و لندینگ پیج
          </h2>
          
          <div className="space-y-5 text-xs font-bold">
            <div>
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">نوع صفحه اصلی (مسیر اصلی /)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      یک صفحه اصلی مجزا و جذاب با بنر خوش‌آمدگویی، هدر، استوری‌ها و منوی تنظیمات.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {formData.homePageType === 'custom' && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-blue-50/20 dark:bg-blue-950/10 p-4 rounded-2xl border border-blue-500/10">
                <div>
                  <h3 className="text-[11px] font-black text-blue-600 dark:text-blue-400">تنظیمات پیشرفته لندینگ پیج اختصاصی</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">برای مدیریت بنر خوش‌آمدگویی، استوری‌ها، دکمه ورود و سایر بخش‌های لندینگ پیج اختصاصی، به صفحه مدیریت مجزا بروید.</p>
                </div>
                <a
                  href="/admin/settings/custom-home"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-black text-[10px] shadow-sm transition-all duration-200 active:scale-98 shrink-0"
                >
                  <Settings className="w-3.5 h-3.5" />
                  مدیریت و پیکربندی لندینگ پیج
                </a>
              </div>
            )}
          </div>
        </div>
        </div>
        )}

        {/* اطلاعات تماس و حقوقی - Independent rounded card */}
        {activeTab === 'contact_payment' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
            <Mail className="w-4.5 h-4.5 text-blue-500" />
            اطلاعات تماس، پشتیبانی و آدرس فیزیکی دفتر
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold">
            <div>
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                <Mail className="w-4 h-4 text-slate-400" /> ایمیل پشتیبانی و رسمی
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all text-left dir-ltr font-medium"
                placeholder="support@myshop.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                <Phone className="w-4 h-4 text-slate-400" /> تلفن تماس و پاسخ‌گویی پشتیبانی
              </label>
              <input
                type="text"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all text-left dir-ltr font-bold"
                placeholder="۰۲۱-۱۲۳۴۵۶۷۸"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" /> نشانی فیزیکی رسمی (نمایش در هدر و فوتر فروشگاه)
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all"
                placeholder="استان، شهر، خیابان اصلی..."
              />
            </div>
          </div>
        </div>
        </div>
        )}

        {/* تنظیمات مالیاتی و ساختار محصولات - Independent rounded card */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
            <Package className="w-4.5 h-4.5 text-blue-500" />
            تنظیمات حقوقی، مالیاتی و نوع محصولات
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs font-bold">
            <div>
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">نوع کاتالوگ فروشگاه</label>
              <select
                name="productType"
                value={formData.productType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 dark:text-slate-300 font-black cursor-pointer transition-all"
              >
                {isFeatureEnabled('physicalProducts') && isFeatureEnabled('digitalProducts') && (
                  <option value="both">ترکیبی (فیزیکی و دانلودی)</option>
                )}
                {isFeatureEnabled('physicalProducts') && (
                  <option value="physical">فقط محصولات فیزیکی</option>
                )}
                {isFeatureEnabled('digitalProducts') && (
                  <option value="digital">فقط فایل و خدمات دانلودی</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">شماره ثبت شرکت / کد صنفی</label>
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">کد اقتصادی (حقوقی)</label>
              <input
                type="text"
                name="economicCode"
                value={formData.economicCode}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* بخش پیشنهاد شگفت‌انگیز روز (محصولات ویژه) */}
        {isFeatureEnabled('specialDeals') ? (
          <div className="bg-gradient-to-br from-red-500/[0.02] via-orange-500/[0.01] to-transparent dark:from-red-950/10 dark:via-orange-950/5 dark:to-transparent p-6 rounded-3xl shadow-md border border-red-500/20 dark:border-red-500/10 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-48 h-48 bg-red-500/5 rounded-full -translate-x-24 -translate-y-24 blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-100 dark:border-red-950/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-red-500 to-orange-500 p-2.5 rounded-2xl shadow-sm shadow-red-500/20">
                <Flame className="w-5 h-5 text-white fill-white/10" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  ماژول شگفت‌انگیزهای روزانه (پیشنهاد ویژه)
                  <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">ویژه</span>
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold">نمایش جذاب محصولات با تخفیف‌های زمان‌دار و شمارش معکوس در هوم‌پیج</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-slate-950 px-4 py-2 rounded-2xl border border-red-100/50 dark:border-red-950/20 shadow-sm">
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">تعداد نمایش دسکتاپ:</span>
                <select
                  name="specialDealsLimit"
                  value={formData.specialDealsLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialDealsLimit: parseInt(e.target.value) || 4 }))}
                  className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
                >
                  <option value="2">۲ کالا</option>
                  <option value="3">۳ کالا</option>
                  <option value="4">۴ کالا</option>
                  <option value="6">۶ کالا</option>
                  <option value="8">۸ کالا</option>
                </select>
              </div>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">وضعیت ماژول:</span>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, specialDealsEnabled: !prev.specialDealsEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                  formData.specialDealsEnabled ? 'bg-red-500 shadow-sm shadow-red-500/30' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    formData.specialDealsEnabled ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {formData.specialDealsEnabled && (
            <div className="space-y-5">
              {/* Actions & Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-red-500/[0.03] dark:bg-red-950/10 p-4 rounded-2xl border border-red-500/10">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  تعداد کل شگفت‌انگیزها: <span className="font-black text-red-600 dark:text-red-400">{products.filter(p => p.isSpecial).length} محصول</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductIds(products.filter(p => p.isSpecial).map(p => p.id));
                    setShowBulkModal(true);
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white px-4.5 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  افزودن / ویرایش دسته‌ای شگفت‌انگیزها
                </button>
              </div>

              {/* Active Deals List */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-700 dark:text-slate-300">محصولات شگفت‌انگیز فعال در حال حاضر:</h3>
                {products.filter(p => p.isSpecial).length === 0 ? (
                  <div className="text-center p-8 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold">
                    هیچ محصولی در حال حاضر به عنوان شگفت‌انگیز ثبت نشده است. با دکمه بالا محصولات را دسته‌ای اضافه کنید!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.filter(p => p.isSpecial).map((product) => {
                      const finalPrice = product.discount 
                        ? product.price - product.discount 
                        : product.price;
                      return (
                        <div key={product.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm hover:shadow transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 dark:border-slate-800 overflow-hidden shrink-0">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100 dark:bg-slate-800">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-slate-800 dark:text-white line-clamp-1">{product.title}</h4>
                              <div className="flex items-center gap-2 text-[10px] font-bold">
                                <span className="text-red-500">تخفیف: {product.discount ? Math.round((product.discount / product.price) * 100) : 0}%</span>
                                <span className="text-slate-400 line-through">{product.price.toLocaleString('fa-IR')}</span>
                                <span className="text-slate-700 dark:text-slate-300 font-black">{finalPrice.toLocaleString('fa-IR')} تومان</span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromSpecial(product.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                            title="حذف از شگفت‌انگیزها"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bulk Add Modal */}
          {showBulkModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
              <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-red-500/5 to-orange-500/5">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-red-500 p-2 rounded-xl text-white">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white">افزودن دسته‌ای محصولات به شگفت‌انگیز روز</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">محصولات مورد نظر را انتخاب کرده و تخفیف و زمان پایان را گروهی اعمال کنید</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkModal(false);
                      setSelectedProductIds([]);
                      setBulkSearch('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
                  {/* Search & Selection Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="جستجو در محصولات..."
                        value={bulkSearch}
                        onChange={(e) => setBulkSearch(e.target.value)}
                        className="w-full pl-4 pr-9 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-red-500/20 outline-none text-xs font-bold text-slate-800 dark:text-white focus:border-red-500 transition-all"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const filteredIds = products
                            .filter(p => p.title.toLowerCase().includes(bulkSearch.toLowerCase()))
                            .map(p => p.id);
                          setSelectedProductIds(filteredIds);
                        }}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-[11px] font-black text-slate-600 dark:text-slate-300 transition-all"
                      >
                        انتخاب همه نتایج
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProductIds([])}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-[11px] font-black text-slate-600 dark:text-slate-300 transition-all"
                      >
                        پاک کردن انتخاب‌ها
                      </button>
                    </div>
                  </div>

                  {/* Products List with Checkboxes */}
                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl max-h-60 overflow-y-auto custom-scrollbar divide-y divide-slate-50 dark:divide-slate-800/40">
                    {loadingProducts ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-bold">در حال بارگذاری محصولات...</div>
                    ) : products.filter(p => p.title.toLowerCase().includes(bulkSearch.toLowerCase())).length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-bold">محصولی یافت نشد!</div>
                    ) : (
                      products
                        .filter(p => p.title.toLowerCase().includes(bulkSearch.toLowerCase()))
                        .map((product) => {
                          const isSelected = selectedProductIds.includes(product.id);
                          return (
                            <div
                              key={product.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                                } else {
                                  setSelectedProductIds(prev => [...prev, product.id]);
                                }
                              }}
                              className={`flex items-center justify-between p-3 cursor-pointer transition-all ${
                                isSelected ? 'bg-red-500/[0.03] dark:bg-red-950/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-slate-400">
                                  {isSelected ? (
                                    <CheckSquare className="w-5 h-5 text-red-500" />
                                  ) : (
                                    <Square className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="w-10 h-12 rounded-lg bg-slate-50 border border-slate-100 dark:border-slate-800 overflow-hidden shrink-0">
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100 dark:bg-slate-800">
                                      <Package className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-800 dark:text-white line-clamp-1">{product.title}</h4>
                                  <span className="text-[10px] text-slate-400 font-bold">{product.price.toLocaleString('fa-IR')} تومان</span>
                                </div>
                              </div>
                              {product.isSpecial && (
                                <span className="text-[9px] font-black bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 px-2 py-0.5 rounded-md">از قبل شگفت‌انگیز</span>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* Bulk Configuration Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                        <Percent className="w-4 h-4 text-red-500" /> درصد تخفیف شگفت‌انگیز (گروهی)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={bulkDiscount}
                          onChange={(e) => setBulkDiscount(Math.min(99, Math.max(1, parseInt(e.target.value) || 0)))}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-red-500/20 outline-none text-xs font-black text-slate-850 dark:text-white focus:border-red-500 transition-all"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">%</span>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {[10, 15, 20, 30, 50].map((pct) => (
                          <button
                            type="button"
                            key={pct}
                            onClick={() => setBulkDiscount(pct)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                              bulkDiscount === pct
                                ? 'bg-red-500 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                        <Clock className="w-4 h-4 text-red-500" /> مدت زمان اعتبار پیشنهاد شگفت‌انگیز
                      </label>
                      <select
                        value={bulkDuration}
                        onChange={(e) => setBulkDuration(parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:ring-2 focus:ring-red-500/20 outline-none text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer transition-all"
                      >
                        <option value="12">۱۲ ساعت</option>
                        <option value="24">۲۴ ساعت (۱ روز)</option>
                        <option value="48">۴۸ ساعت (۲ روز)</option>
                        <option value="72">۷۲ ساعت (۳ روز)</option>
                        <option value="168">۱۶۸ ساعت (۱ هفته)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="font-black text-red-500">{selectedProductIds.length}</span> محصول انتخاب شده است.
                  </span>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBulkModal(false);
                        setSelectedProductIds([]);
                        setBulkSearch('');
                      }}
                      className="px-4.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-400 transition-all"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBulkSpecial}
                      disabled={selectedProductIds.length === 0}
                      className="px-5 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-red-500/10 transition-all"
                    >
                      اعمال و ذخیره نهایی
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-dashed border-red-200 dark:border-red-950 text-center py-10 space-y-3">
                <Flame className="w-10 h-10 text-red-400 mx-auto animate-pulse" />
                <h3 className="text-xs font-black text-slate-850 dark:text-white">ماژول شگفت‌انگیزهای روزانه (پیشنهاد ویژه) غیرفعال است</h3>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto font-bold leading-relaxed">برای فعال‌سازی و تعریف تخفیف‌های زمان‌دار شگفت‌انگیز همراه با تایمر معکوس در صفحه اول، لطفا پکیج خود را ارتقا دهید یا با مدیریت اصلی تماس بگیرید.</p>
              </div>
            )}
          </div>
        )}

        {/* تنظیمات درگاه پرداخت زرین‌پال */}
        {activeTab === 'contact_payment' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {isFeatureEnabled('zarinpal') ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
            <CreditCard className="w-4.5 h-4.5 text-blue-500" />
            تنظیمات درگاه پرداخت زرین‌پال (ZarinPal Gateway)
          </h2>
          
          <div className="flex items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
            <div className="space-y-0.5 ml-4">
              <label className="block text-xs font-black text-slate-850 dark:text-white">فعال‌سازی درگاه زرین‌پال</label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">با فعال‌سازی این بخش، خریداران می‌توانند سفارش خود را به صورت آنلاین از طریق درگاه مستقیم زرین‌پال پرداخت نمایند.</span>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, zarinpalEnabled: !prev.zarinpalEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                formData.zarinpalEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  formData.zarinpalEnabled ? '-translate-x-6' : '-translate-x-1'
                }`}
              />
            </button>
          </div>

          {formData.zarinpalEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">کد مرچنت زرین‌پال (Merchant ID)</label>
                <input
                  type="text"
                  name="zarinpalMerchantId"
                  value={formData.zarinpalMerchantId}
                  onChange={handleChange}
                  dir="ltr"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  required={formData.zarinpalEnabled}
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-sans">کد مرچنت ۳۶ کاراکتری دریافت شده از پنل کاربری زرین‌پال شما.</span>
              </div>

              <div className="col-span-2 md:col-span-1 flex flex-col justify-end p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 ml-4">
                    <label className="block text-xs font-black text-slate-850 dark:text-white">محیط تست (Sandbox / شبیه‌ساز)</label>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">برای انجام تراکنش‌های تستی بدون نیاز به پرداخت پول واقعی، این بخش را فعال کنید.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, zarinpalSandbox: !prev.zarinpalSandbox }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                      formData.zarinpalSandbox ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        formData.zarinpalSandbox ? '-translate-x-6' : '-translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-10 space-y-3">
                <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-xs font-black text-slate-800 dark:text-white">درگاه پرداخت آنلاین زرین‌پال غیرفعال است</h3>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto font-bold leading-relaxed">برای فعال‌سازی درگاه آنلاین مستقیم زرین‌پال، لطفا پکیج خود را ارتقا دهید یا با مدیریت اصلی تماس بگیرید.</p>
              </div>
            )}

            {/* تنظیمات درگاه پرداخت زیبال */}
            {isFeatureEnabled('zibal') ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
                <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
                  <CreditCard className="w-4.5 h-4.5 text-blue-500" />
                  تنظیمات درگاه پرداخت زیبال (Zibal Gateway)
                </h2>
                
                <div className="flex items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                  <div className="space-y-0.5 ml-4">
                    <label className="block text-xs font-black text-slate-850 dark:text-white">فعال‌سازی درگاه زیبال</label>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">با فعال‌سازی این بخش، خریداران می‌توانند سفارش خود را به صورت آنلاین از طریق درگاه مستقیم زیبال پرداخت نمایند.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, zibalEnabled: !prev.zibalEnabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                      formData.zibalEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        formData.zibalEnabled ? '-translate-x-6' : '-translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {formData.zibalEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">کد مرچنت زیبال (Merchant ID)</label>
                      <input
                        type="text"
                        name="zibalMerchantId"
                        value={formData.zibalMerchantId}
                        onChange={handleChange}
                        dir="ltr"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
                        placeholder="zibal"
                        required={formData.zibalEnabled}
                      />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-sans">کد مرچنت دریافت شده از پنل کاربری زیبال شما (برای تست می‌توانید از zibal استفاده کنید).</span>
                    </div>

                    <div className="col-span-2 md:col-span-1 flex flex-col justify-end p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 ml-4">
                          <label className="block text-xs font-black text-slate-850 dark:text-white">محیط تست (Sandbox / شبیه‌ساز)</label>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">برای انجام تراکنش‌های تستی بدون نیاز به پرداخت پول واقعی، این بخش را فعال کنید.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, zibalSandbox: !prev.zibalSandbox }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                            formData.zibalSandbox ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              formData.zibalSandbox ? '-translate-x-6' : '-translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-10 space-y-3">
                <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-xs font-black text-slate-800 dark:text-white">درگاه پرداخت آنلاین زیبال غیرفعال است</h3>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto font-bold leading-relaxed">برای فعال‌سازی درگاه آنلاین مستقیم زیبال، لطفا پکیج خود را ارتقا دهید یا با مدیریت اصلی تماس بگیرید.</p>
              </div>
            )}

            {/* تنظیمات درگاه پرداخت اقساطی دیجی‌پی */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
              <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
                <CreditCard className="w-4.5 h-4.5 text-blue-500" />
                تنظیمات سیستم پرداخت اقساطی دیجی‌پی (DigiPay UPG)
              </h2>
              
              <div className="flex items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                <div className="space-y-0.5 ml-4">
                  <label className="block text-xs font-black text-slate-850 dark:text-white">فعال‌سازی پرداخت اقساطی دیجی‌پی</label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">با فعال‌سازی این بخش، خریداران می‌توانند سفارش خود را به صورت اقساطی یا اعتباری از طریق دیجی‌پی پرداخت نمایند.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, digipayEnabled: !prev.digipayEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    formData.digipayEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      formData.digipayEnabled ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {formData.digipayEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">شناسه کلاینت (Client ID)</label>
                    <input
                      type="text"
                      name="digipayClientId"
                      value={formData.digipayClientId}
                      onChange={handleChange}
                      dir="ltr"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
                      placeholder="client-id"
                      required={formData.digipayEnabled}
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">رمز کلاینت (Client Secret)</label>
                    <input
                      type="password"
                      name="digipayClientSecret"
                      value={formData.digipayClientSecret}
                      onChange={handleChange}
                      dir="ltr"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
                      placeholder="••••••••"
                      required={formData.digipayEnabled}
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">نام کاربری (Username)</label>
                    <input
                      type="text"
                      name="digipayUsername"
                      value={formData.digipayUsername}
                      onChange={handleChange}
                      dir="ltr"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
                      placeholder="username"
                      required={formData.digipayEnabled}
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">رمز عبور (Password)</label>
                    <input
                      type="password"
                      name="digipayPassword"
                      value={formData.digipayPassword}
                      onChange={handleChange}
                      dir="ltr"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
                      placeholder="••••••••"
                      required={formData.digipayEnabled}
                    />
                  </div>

                  <div className="col-span-2 flex flex-col justify-end p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 ml-4">
                        <label className="block text-xs font-black text-slate-850 dark:text-white">محیط تست (Sandbox / شبیه‌ساز)</label>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">برای انجام تراکنش‌های تستی در محیط UAT دیجی‌پی، این بخش را فعال کنید.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, digipaySandbox: !prev.digipaySandbox }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                          formData.digipaySandbox ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            formData.digipaySandbox ? '-translate-x-6' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* تنظیمات پرداخت کارت به کارت */}
            {isFeatureEnabled('cardToCard') ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
              <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
                <CreditCard className="w-4.5 h-4.5 text-blue-500" />
                تنظیمات پرداخت کارت به کارت (کارت به کارت)
              </h2>
              
              <div className="flex items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                <div className="space-y-0.5 ml-4">
                  <label className="block text-xs font-black text-slate-850 dark:text-white">فعال‌سازی روش کارت به کارت</label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">با فعال‌سازی این بخش، مشتریان می‌توانند مبلغ سفارش را به صورت کارت به کارت پرداخت کرده و رسید خود را بارگذاری نمایند.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, cardToCardEnabled: !prev.cardToCardEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    formData.cardToCardEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      formData.cardToCardEnabled ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {formData.cardToCardEnabled && (
                <div className="space-y-6">
                  {/* تعریف کارت‌های بانکی متعدد */}
                  <div className="border border-slate-100 dark:border-slate-800 p-4.5 rounded-2xl bg-slate-50/30 dark:bg-slate-950/10 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xs font-black text-slate-850 dark:text-white">تعریف کارت‌های بانکی مقصد</h3>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block mt-0.5">می‌توانید چندین کارت اضافه کنید. با عبور سقف دریافتی موفق ماهانه هر کارت، سیستم به صورت خودکار کارت بعدی را نمایش می‌دهد.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const config = formData.cardToCardConfig ? JSON.parse(formData.cardToCardConfig) : [];
                          const newCard = {
                            id: Date.now().toString(),
                            cardNumber: '',
                            cardHolderName: '',
                            cardBankName: '',
                            cardSheba: '',
                            monthlyLimit: 10000000, // ۱۰ میلیون تومان پیش‌فرض
                            isActive: true
                          };
                          setFormData(prev => ({
                            ...prev,
                            cardToCardConfig: JSON.stringify([...config, newCard])
                          }));
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        افزودن کارت جدید
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(() => {
                        let configList = [];
                        try {
                          configList = formData.cardToCardConfig ? JSON.parse(formData.cardToCardConfig) : [];
                        } catch(e) {}
                        
                        if (configList.length === 0) {
                          return (
                            <div className="text-center py-6 text-slate-400 font-bold text-[11px] border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                              هیچ کارتی تعریف نشده است. جهت کارکرد صحیح روش کارت به کارت حداقل یک کارت فعال اضافه کنید.
                            </div>
                          );
                        }

                        return configList.map((card: any, idx: number) => (
                          <div key={card.id || idx} className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-3 relative group animate-in fade-in-50 duration-200">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = configList.filter((c: any) => c.id !== card.id);
                                setFormData(prev => ({
                                  ...prev,
                                  cardToCardConfig: JSON.stringify(updated)
                                }));
                              }}
                              className="absolute left-4 top-4 text-slate-400 hover:text-red-500 transition-colors p-1"
                              title="حذف کارت"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                              <span>کارت شماره {idx + 1}</span>
                              {!card.isActive && <span className="bg-red-100 text-red-700 px-1 py-0.5 rounded">غیرفعال</span>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-1">شماره کارت بانک (۱۶ رقم)</label>
                                <input
                                  type="text"
                                  value={card.cardNumber || ''}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    const updated = configList.map((c: any) => c.id === card.id ? { ...c, cardNumber: val } : c);
                                    setFormData(prev => ({ ...prev, cardToCardConfig: JSON.stringify(updated) }));
                                  }}
                                  maxLength={16}
                                  dir="ltr"
                                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-blue-500"
                                  placeholder="6037xxxxxxxxxxxx"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-1">نام صاحب کارت</label>
                                <input
                                  type="text"
                                  value={card.cardHolderName || ''}
                                  onChange={(e) => {
                                    const updated = configList.map((c: any) => c.id === card.id ? { ...c, cardHolderName: e.target.value } : c);
                                    setFormData(prev => ({ ...prev, cardToCardConfig: JSON.stringify(updated) }));
                                  }}
                                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                                  placeholder="نام و نام خانوادگی صاحب کارت"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-1">نام بانک</label>
                                <input
                                  type="text"
                                  value={card.cardBankName || ''}
                                  onChange={(e) => {
                                    const updated = configList.map((c: any) => c.id === card.id ? { ...c, cardBankName: e.target.value } : c);
                                    setFormData(prev => ({ ...prev, cardToCardConfig: JSON.stringify(updated) }));
                                  }}
                                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                                  placeholder="مثلا: ملی، پاسارگاد"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-1">شماره شبا (بدون IR)</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={card.cardSheba || ''}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                                      const updated = configList.map((c: any) => c.id === card.id ? { ...c, cardSheba: val } : c);
                                      setFormData(prev => ({ ...prev, cardToCardConfig: JSON.stringify(updated) }));
                                    }}
                                    maxLength={24}
                                    dir="ltr"
                                    className="w-full pl-3 pr-8 py-2 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs focus:ring-1 focus:ring-blue-500"
                                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">IR</span>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-1">سقف واریز ماهانه (تومان)</label>
                                <input
                                  type="number"
                                  value={card.monthlyLimit || 10000000}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    const updated = configList.map((c: any) => c.id === card.id ? { ...c, monthlyLimit: val } : c);
                                    setFormData(prev => ({ ...prev, cardToCardConfig: JSON.stringify(updated) }));
                                  }}
                                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-blue-500"
                                  placeholder="مثلا: 10000000"
                                />
                              </div>

                              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 mt-5">
                                <span className="text-[10px] text-slate-500">وضعیت فعالیت کارت:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = configList.map((c: any) => c.id === card.id ? { ...c, isActive: !c.isActive } : c);
                                    setFormData(prev => ({ ...prev, cardToCardConfig: JSON.stringify(updated) }));
                                  }}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                                    card.isActive ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
                                      card.isActive ? '-translate-x-5' : '-translate-x-0.5'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <div className="text-[11px] font-bold p-3 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                    نکته: کارت اصلی وارد شده در بالا به عنوان کارت پیش‌فرض و پشتیبان (Fallback) استفاده خواهد شد اگر هیچ کدام از کارت‌های بالا واجد شرایط نباشند.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold border-t border-slate-100 dark:border-slate-850 pt-6">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">شماره کارت پیش‌فرض (پشتیبان)</label>
                    <input
                      type="text"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleChange}
                      maxLength={16}
                      dir="ltr"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
                      placeholder="6037-xxxx-xxxx-xxxx"
                      required={formData.cardToCardEnabled}
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">نام صاحب حساب/کارت</label>
                    <input
                      type="text"
                      name="cardHolderName"
                      value={formData.cardHolderName}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all"
                      placeholder="مثلا: علی محمدی"
                      required={formData.cardToCardEnabled}
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">نام بانک</label>
                    <input
                      type="text"
                      name="cardBankName"
                      value={formData.cardBankName}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all"
                      placeholder="مثلا: بانک ملی، بانک پاسارگاد"
                      required={formData.cardToCardEnabled}
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">شماره شبا (بدون IR)</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="cardSheba"
                        value={formData.cardSheba}
                        onChange={handleChange}
                        maxLength={24}
                        dir="ltr"
                        className="w-full pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
                        placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">IR</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-10 space-y-3">
                <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-xs font-black text-slate-800 dark:text-white">پرداخت کارت به کارت غیرفعال است</h3>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto font-bold leading-relaxed">برای فعال‌سازی درگاه پرداخت کارت به کارت آفلاین، لطفا پکیج خود را ارتقا دهید یا با مدیریت اصلی تماس بگیرید.</p>
              </div>
            )}

            {/* تنظیمات وب‌سرویس تیپاکس */}
            {isFeatureEnabled('tipax') ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
              <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
                <Truck className="w-4.5 h-4.5 text-blue-500" />
                تنظیمات اتصال به وب‌سرویس تیپاکس (Tipax API)
              </h2>

              <div className="flex items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                <div className="space-y-0.5 ml-4">
                  <label className="block text-xs font-black text-slate-850 dark:text-white">فعال‌سازی ارسال با تیپاکس</label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">با فعال‌سازی این بخش، گزینه ارسال از طریق تیپاکس در فاکتورها فعال شده و قابلیت اتصال به وب‌سرویس پدیدار می‌شود.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tipaxEnabled: !prev.tipaxEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                    formData.tipaxEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      formData.tipaxEnabled ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {formData.tipaxEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">نام کاربری پنل ای‌تیپاکس (Username)</label>
                    <input
                      type="text"
                      name="tipaxUsername"
                      value={formData.tipaxUsername}
                      onChange={handleChange}
                      dir="ltr"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
                      placeholder="e-tipax username"
                      required={formData.tipaxEnabled}
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">رمز عبور پنل ای‌تیپاکس (Password)</label>
                    <input
                      type="password"
                      name="tipaxPassword"
                      value={formData.tipaxPassword}
                      onChange={handleChange}
                      dir="ltr"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
                      placeholder="••••••••"
                      required={formData.tipaxEnabled}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">کلید خصوصی وب‌سرویس API (Private Key)</label>
                    <input
                      type="text"
                      name="tipaxApiKey"
                      value={formData.tipaxApiKey}
                      onChange={handleChange}
                      dir="ltr"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono"
                      placeholder="Private API Key from e-Tipax panel"
                      required={formData.tipaxEnabled}
                    />
                  </div>

                  <div className="col-span-2 flex flex-col justify-end p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 ml-4">
                        <label className="block text-xs font-black text-slate-850 dark:text-white">محیط تست تیپاکس (Sandbox / شبیه‌ساز)</label>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">جهت آزمایش اتصال بدون ثبت سفارش واقعی و کسر هزینه در پنل تیپاکس، این بخش را فعال کنید تا درخواست‌ها به سرور تستی تیپاکس (omtestapi.tipax.ir) هدایت شوند.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, tipaxSandbox: !prev.tipaxSandbox }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                          formData.tipaxSandbox ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            formData.tipaxSandbox ? '-translate-x-6' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">نحوه ثبت و پردازش مرسولات (مدیریت نحوه ارسال)</label>
                    <select
                      name="tipaxShippingMode"
                      value={formData.tipaxShippingMode}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer transition-all"
                    >
                      <option value="manual">دستی (مدیریت به صورت دستی در پنل سفارشات بدون وب‌سرویس)</option>
                      <option value="api">اتصال به وب‌سرویس (ثبت خودکار مرسوله و دریافت خودکار بارکد رهگیری)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-sans">
                      در حالت دستی، تمام هماهنگی‌ها را خودتان انجام داده و کد رهگیری را دستی وارد می‌کنید. در حالت وب‌سرویس، دکمه «ثبت در تیپاکس» به سفارشات اضافه می‌شود تا با یک کلیک، بارکد صادر شود.
                    </span>
                  </div>
                </div>
              )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-10 space-y-3">
                <Truck className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-xs font-black text-slate-800 dark:text-white">اتصال به وب‌سرویس تیپاکس غیرفعال است</h3>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto font-bold leading-relaxed">برای فعال‌سازی وب‌سرویس ارسال و صدور بارکد تیپاکس، لطفا پکیج خود را ارتقا دهید یا با مدیریت اصلی تماس بگیرید.</p>
              </div>
            )}
          </div>
        )}

        {/* بخش محصولات مرتبط (کاروسل استوری) */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {isFeatureEnabled('relatedProducts') ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
                <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
                  <Package className="w-4.5 h-4.5 text-blue-500 fill-blue-500/10" />
                  تنظیمات نمایش محصولات مرتبط (کاروسل استوری)
                </h2>
                
                <div className="flex items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                  <div className="space-y-0.5 ml-4">
                    <label className="block text-xs font-black text-slate-850 dark:text-white">فعال‌سازی محصولات مرتبط در جزئیات محصول</label>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">با فعال‌سازی این بخش، کاروسلی شکیل شبیه به استوری‌ها جهت نمایش محصولات مرتبط در پایین صفحه هر محصول به خریداران نمایش داده می‌شود.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, relatedProductsEnabled: !prev.relatedProductsEnabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                      formData.relatedProductsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        formData.relatedProductsEnabled ? '-translate-x-6' : '-translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-10 space-y-3">
                <Package className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-xs font-black text-slate-850 dark:text-white">نمایش هوشمند محصولات مرتبط غیرفعال است</h3>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto font-bold leading-relaxed">جهت اتصال هوشمند کالاها و نمایش بخش کاروسل محصولات مرتبط زیر هر کالا، لطفا پکیج خود را ارتقا دهید یا با مدیریت اصلی تماس بگیرید.</p>
              </div>
            )}
          </div>
        )}

        {/* تنظیمات عمده فروشی */}
        {activeTab === 'products' && (
          <div className="mt-6 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
              <Store className="w-4.5 h-4.5 text-blue-500 fill-blue-500/10" />
              تنظیمات سامانه عمده‌فروشی (B2B)
            </h2>
            
            <div className="flex items-center justify-between p-4.5 bg-blue-500/[0.02] dark:bg-blue-950/10 rounded-2xl border border-blue-100/30 dark:border-blue-950/20">
              <div className="space-y-0.5 ml-4">
                <label className="block text-xs font-black text-slate-850 dark:text-white">فعال‌سازی قابلیت عمده‌فروشی در فروشگاه</label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                  با فعال کردن این بخش، تب تنظیمات عمده‌فروشی به محصولات شما اضافه شده و می‌توانید قیمت‌گذاری پله‌ای، حداقل تعداد خرید (MOQ)، فروش بر اساس کارتن/پالت، پرداخت اعتباری و باربری حجمی/وزنی را مدیریت کنید.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, wholesaleEnabled: !prev.wholesaleEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                  formData.wholesaleEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    formData.wholesaleEnabled ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* تنظیمات سئو و سایت‌مپ خودکار */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {isFeatureEnabled('seoTools') ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
                <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
                  <Search className="w-4.5 h-4.5 text-blue-500" />
                  تنظیمات سئو و سایت‌مپ خودکار (SEO & Sitemap)
                </h2>
                
                <div className="space-y-4">
                  {/* فعال‌سازی سایت‌مپ */}
                  <div className="flex items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                    <div className="space-y-0.5 ml-4">
                      <label className="block text-xs font-black text-slate-850 dark:text-white">فعال‌سازی سایت‌مپ خودکار (Sitemap.xml)</label>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                        با فعال‌سازی این بخش، فایل نقشه سایت به صورت خودکار و کاملاً پویا برای تمامی محصولات، دسته‌بندی‌ها و مقالات وبلاگ ساخته شده و در اختیار موتورهای جستجو قرار می‌گیرد.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, sitemapEnabled: !prev.sitemapEnabled }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                        formData.sitemapEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          formData.sitemapEnabled ? '-translate-x-6' : '-translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* فعال‌سازی فایل ربات‌ها */}
                  <div className="flex items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                    <div className="space-y-0.5 ml-4">
                      <label className="block text-xs font-black text-slate-850 dark:text-white">فعال‌سازی فایل راهنمای ربات‌ها (Robots.txt)</label>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                        با فعال‌سازی این بخش، فایل راهنمای موتورهای جستجو فعال شده و دسترسی به صفحات حساس مانند سبد خرید و پنل مدیریت را مسدود و دسترسی به صفحات عمومی را مجاز می‌کند.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, robotsEnabled: !prev.robotsEnabled }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                        formData.robotsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          formData.robotsEnabled ? '-translate-x-6' : '-translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-10 space-y-3">
                <Search className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-xs font-black text-slate-800 dark:text-white">ابزارهای حرفه‌ای سئو (Sitemap & Robots) غیرفعال است</h3>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto font-bold leading-relaxed">برای فعال‌سازی نقشه سایت خودکار و مدیریت فایل Robots.txt، لطفاً پکیج خود را ارتقا دهید یا با مدیریت اصلی تماس بگیرید.</p>
              </div>
            )}
          </div>
        )}

        {/* تنظیمات نوار ناوبری موبایل (Bottom Navigation Bar) */}
        {bottomNav && activeTab === 'homepage' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
              <Smartphone className="w-4.5 h-4.5 text-blue-500" />
              تنظیمات نوار ناوبری موبایل (Bottom Navigation Bar)
            </h2>

            {/* فعال / غیرفعال سازی کل نوار ناوبری */}
            <div className="flex items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
              <div className="space-y-0.5 ml-4">
                <label className="block text-xs font-black text-slate-850 dark:text-white">فعال‌سازی نوار ناوبری موبایل</label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">با فعال‌سازی این بخش، نوار ناوبری چسبان در پایین صفحه در دستگاه‌های موبایل نمایش داده می‌شود.</span>
              </div>
              <button
                type="button"
                onClick={() => updateBottomNavField('enabled', !bottomNav.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                  bottomNav.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    bottomNav.enabled ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>

            {bottomNav.enabled && (
              <div className="space-y-6">
                {/* بخش تنظیمات ظاهری و رفتاری */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* تنظیمات ظاهری */}
                  <div className="bg-slate-50/30 dark:bg-slate-950/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4">
                    <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <Palette className="w-4 h-4 text-purple-500" />
                      تنظیمات ظاهری نوار
                    </h3>
                    
                    <div className="space-y-3 text-xs font-bold">
                      <div>
                        <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">رنگ پس‌زمینه نوار ناوبری</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={bottomNav.appearance.backgroundColor}
                            onChange={(e) => updateBottomNavAppearance('backgroundColor', e.target.value)}
                            className="h-8 w-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 overflow-hidden shrink-0"
                          />
                          <input
                            type="text"
                            value={bottomNav.appearance.backgroundColor}
                            onChange={(e) => updateBottomNavAppearance('backgroundColor', e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none font-mono text-[11px] text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">رنگ آیکون (حالت عادی)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={bottomNav.appearance.iconColor}
                              onChange={(e) => updateBottomNavAppearance('iconColor', e.target.value)}
                              className="h-8 w-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 overflow-hidden shrink-0"
                            />
                            <input
                              type="text"
                              value={bottomNav.appearance.iconColor}
                              onChange={(e) => updateBottomNavAppearance('iconColor', e.target.value)}
                              className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none font-mono text-[11px] text-left"
                              dir="ltr"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">رنگ آیکون (حالت فعال)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={bottomNav.appearance.activeIconColor}
                              onChange={(e) => updateBottomNavAppearance('activeIconColor', e.target.value)}
                              className="h-8 w-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 overflow-hidden shrink-0"
                            />
                            <input
                              type="text"
                              value={bottomNav.appearance.activeIconColor}
                              onChange={(e) => updateBottomNavAppearance('activeIconColor', e.target.value)}
                              className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none font-mono text-[11px] text-left"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-2 border-t border-slate-100/50 dark:border-slate-800/50">
                        <label className="text-[11px] text-slate-600 dark:text-slate-400">نمایش برچسب متنی زیر آیکون‌ها</label>
                        <button
                          type="button"
                          onClick={() => updateBottomNavAppearance('showLabels', !bottomNav.appearance.showLabels)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                            bottomNav.appearance.showLabels ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${bottomNav.appearance.showLabels ? '-translate-x-5' : '-translate-x-0.5'}`} />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">سبک نمایش آیکون فعال</label>
                        <select
                          value={bottomNav.appearance.activeStyle}
                          onChange={(e) => updateBottomNavAppearance('activeStyle', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-xl outline-none text-slate-700 dark:text-slate-300 font-black cursor-pointer"
                        >
                          <option value="color">تغییر رنگ ساده</option>
                          <option value="underline">خط زیر آیکون (Underline)</option>
                          <option value="circle">دایره دور آیکون (Circle)</option>
                          <option value="background">پس‌زمینه ملایم کپسولی (Pill Background)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* تنظیمات رفتاری و Badge */}
                  <div className="space-y-6">
                    {/* تنظیمات رفتاری */}
                    <div className="bg-slate-50/30 dark:bg-slate-950/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4">
                      <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <Sliders className="w-4 h-4 text-blue-500" />
                        تنظیمات رفتاری
                      </h3>
                      
                      <div className="space-y-3 text-xs font-bold">
                        <div className="flex items-center justify-between py-1">
                          <div className="space-y-0.5">
                            <label className="text-[11px] text-slate-600 dark:text-slate-400">مخفی شدن خودکار هنگام اسکرول به پایین</label>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">هنگام اسکرول به پایین مخفی و با اسکرول به بالا مجدداً ظاهر می‌شود.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateBottomNavBehavior('autoHideOnScroll', !bottomNav.behavior.autoHideOnScroll)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                              bottomNav.behavior.autoHideOnScroll ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${bottomNav.behavior.autoHideOnScroll ? '-translate-x-5' : '-translate-x-0.5'}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-1 border-t border-slate-100/50 dark:border-slate-800/50">
                          <div className="space-y-0.5">
                            <label className="text-[11px] text-slate-600 dark:text-slate-400">ثابت و چسبان بودن همیشه (Sticky)</label>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">همیشه در پایین صفحه فیکس بماند.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateBottomNavBehavior('sticky', !bottomNav.behavior.sticky)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                              bottomNav.behavior.sticky ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${bottomNav.behavior.sticky ? '-translate-x-5' : '-translate-x-0.5'}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* تنظیمات Badge سبد خرید */}
                    <div className="bg-slate-50/30 dark:bg-slate-950/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4">
                      <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        تنظیمات نشان (Badge) سبد خرید
                      </h3>
                      
                      <div className="space-y-3 text-xs font-bold">
                        <div className="flex items-center justify-between py-1">
                          <label className="text-[11px] text-slate-600 dark:text-slate-400">نمایش تعداد آیتم‌های سبد خرید</label>
                          <button
                            type="button"
                            onClick={() => updateBottomNavBadge('showCount', !bottomNav.badge.showCount)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                              bottomNav.badge.showCount ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${bottomNav.badge.showCount ? '-translate-x-5' : '-translate-x-0.5'}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-1 border-t border-slate-100/50 dark:border-slate-800/50">
                          <label className="text-[11px] text-slate-600 dark:text-slate-400">انیمیشن ضربان هنگام افزودن محصول</label>
                          <button
                            type="button"
                            onClick={() => updateBottomNavBadge('animate', !bottomNav.badge.animate)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                              bottomNav.badge.animate ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${bottomNav.badge.animate ? '-translate-x-5' : '-translate-x-0.5'}`} />
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">رنگ نشان (Badge)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={bottomNav.badge.badgeColor}
                              onChange={(e) => updateBottomNavBadge('badgeColor', e.target.value)}
                              className="h-8 w-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 overflow-hidden shrink-0"
                            />
                            <input
                              type="text"
                              value={bottomNav.badge.badgeColor}
                              onChange={(e) => updateBottomNavBadge('badgeColor', e.target.value)}
                              className="flex-1 px-2 py-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none font-mono text-[11px] text-left"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* مدیریت آیتم‌های نوار ناوبری */}
                <div className="bg-slate-50/30 dark:bg-slate-950/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4">
                  <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Sliders className="w-4 h-4 text-blue-500" />
                    مدیریت و چیدمان آیتم‌های نوار ناوبری (حداکثر ۵ آیتم)
                  </h3>

                  <div className="space-y-3">
                    {bottomNav.items.map((item: any, index: number) => (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
                          item.visible 
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' 
                            : 'bg-slate-100/50 dark:bg-slate-950/30 border-slate-150 dark:border-slate-850 opacity-60'
                        } ${item.isSpecial ? 'ring-2 ring-blue-500/50 dark:ring-blue-500/30' : ''}`}
                      >
                        {/* ستون اول: اطلاعات اولیه و ترتیب */}
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveNavItem(index, 'up')}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={index === bottomNav.items.length - 1}
                              onClick={() => moveNavItem(index, 'down')}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-400 w-5 text-center">#{index + 1}</span>
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-xl">
                              {(() => {
                                const IconComp = IconMap[item.icon] || Home;
                                return <IconComp size={20} />;
                              })()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-800 dark:text-white block">{item.label}</span>
                                {item.isSpecial && (
                                  <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded-full">ویژه مرکزی</span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono" dir="ltr">{item.link}</span>
                            </div>
                          </div>
                        </div>

                        {/* ستون دوم: تنظیمات فیلدها */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 text-xs font-bold items-end">
                          <div className="md:col-span-4">
                            <label className="block text-[9px] text-slate-400 dark:text-slate-500 mb-1">عنوان آیتم</label>
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => updateNavItem(index, 'label', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none"
                            />
                          </div>

                          <div className="md:col-span-4 relative">
                            <label className="block text-[9px] text-slate-400 dark:text-slate-500 mb-1">آیکون فعلی</label>
                            <button
                              type="button"
                              onClick={() => setActiveIconPickerIndex(activeIconPickerIndex === index ? null : index)}
                              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none hover:bg-slate-50 dark:hover:bg-slate-850 transition-all text-right"
                            >
                              <span className="flex items-center gap-2">
                                {(() => {
                                  const IconComp = IconMap[item.icon] || Home;
                                  return <IconComp size={16} className="text-blue-500" />;
                                })()}
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {SHOP_ICONS.find(ico => ico.name === item.icon)?.label || item.icon}
                                </span>
                              </span>
                              <span className="text-[10px] text-blue-500 font-black">تغییر آیکون</span>
                            </button>

                            {/* پاپ‌آپ مینیمال انتخاب آیکون */}
                            {activeIconPickerIndex === index && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 w-[280px] sm:w-[320px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2 mb-2.5">
                                  <span className="text-[10px] font-black text-slate-400">یک آیکون انتخاب کنید</span>
                                  <button 
                                    type="button" 
                                    onClick={() => setActiveIconPickerIndex(null)}
                                    className="text-[10px] text-rose-500 hover:underline font-black"
                                  >
                                    بستن
                                  </button>
                                </div>
                                <div className="grid grid-cols-5 gap-2 max-h-[220px] overflow-y-auto p-0.5">
                                  {SHOP_ICONS.map((ico) => {
                                    const IconComp = IconMap[ico.name] || Home;
                                    const isSelected = item.icon === ico.name;
                                    return (
                                      <button
                                        key={ico.name}
                                        type="button"
                                        title={ico.label}
                                        onClick={() => {
                                          updateNavItem(index, 'icon', ico.name);
                                          setActiveIconPickerIndex(null);
                                        }}
                                        className={`p-2.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 border ${
                                          isSelected 
                                            ? 'bg-blue-600 text-white border-blue-600 scale-105 shadow-md' 
                                            : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                                        }`}
                                      >
                                        <IconComp size={18} />
                                        <span className={`text-[8px] font-black truncate w-full text-center ${isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                          {ico.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="md:col-span-4">
                            <label className="block text-[9px] text-slate-400 dark:text-slate-500 mb-1">لینک مقصد</label>
                            <input
                              type="text"
                              value={item.link}
                              onChange={(e) => updateNavItem(index, 'link', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none text-left"
                              dir="ltr"
                            />
                          </div>
                        </div>

                        {/* ستون سوم: رنگ‌ها و نمایش */}
                        <div className="flex items-center gap-4 text-xs font-bold">
                          <div className="flex flex-col items-center gap-1">
                            <label className="text-[9px] text-slate-400 dark:text-slate-500">دکمه ویژه مرکزی</label>
                            <button
                              type="button"
                              onClick={() => {
                                setBottomNav((prev: any) => {
                                  const newItems = prev.items.map((it: any, idx: number) => ({
                                    ...it,
                                    isSpecial: idx === index ? !it.isSpecial : false
                                  }));
                                  return { ...prev, items: newItems };
                                });
                              }}
                              className={`px-2.5 py-1 rounded-lg transition-all text-[10px] border ${
                                item.isSpecial 
                                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40 font-black' 
                                  : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-850'
                              }`}
                            >
                              {item.isSpecial ? 'ویژه (بزرگ)' : 'عادی'}
                            </button>
                          </div>

                          <div className="flex flex-col items-center gap-1">
                            <label className="text-[9px] text-slate-400 dark:text-slate-500">وضعیت نمایش</label>
                            <button
                              type="button"
                              onClick={() => updateNavItem(index, 'visible', !item.visible)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                item.visible 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                                  : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                              }`}
                            >
                              {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* صفحات مستثنی شده (بدون نوار ناوبری) */}
                <div className="bg-slate-50/30 dark:bg-slate-950/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4">
                  <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <EyeOff className="w-4 h-4 text-rose-500" />
                    صفحاتی که نوار ناوبری در آن‌ها نمایش داده نشود (Exclusions)
                  </h3>

                  <div className="space-y-3 text-xs font-bold">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">در این صفحات نوار ناوبری موبایل به طور کامل پنهان می‌شود تا کاربر تمرکز بیشتری داشته باشد (مثلاً صفحات پرداخت و تسویه حساب).</p>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newExcludedPage}
                        onChange={(e) => setNewExcludedPage(e.target.value)}
                        placeholder="مثال: /checkout"
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none text-left"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={addExcludedPage}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-black text-xs"
                      >
                        افزودن مسیر
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {bottomNav.excludedPages.map((page: string) => (
                        <span 
                          key={page} 
                          className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-750 font-mono text-[11px]"
                          dir="ltr"
                        >
                          {page}
                          <button
                            type="button"
                            onClick={() => removeExcludedPage(page)}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-0.5 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {activeTab === 'bg_removal' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {isFeatureEnabled('bgRemovalEnabled') ? (
              <div className="space-y-6">
                {/* 1. Status & Limits Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
                  <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
                    <Sparkles className="w-4.5 h-4.5 text-blue-500" />
                    سرویس هوشمند حذف پس‌زمینه تصاویر (AI Background Removal)
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status & Limits */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 space-y-4">
                      <h3 className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        وضعیت سرویس: <span className="text-emerald-600">فعال</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                        سرویس حذف پس‌زمینه با هوش مصنوعی Poof در پکیج فعال شما در دسترس است. شما می‌توانید با استفاده از این ابزار، پس‌زمینه تصاویر محصولات یا گالری خود را با یک کلیک حذف کنید.
                      </p>
                      
                      {/* Progress bar */}
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-600 dark:text-slate-400">میزان مصرف:</span>
                          <span className="text-slate-900 dark:text-white font-mono">
                            {formData.bgRemovalCount} از {getFeatureLimit('bgRemovalLimit') > 0 ? `${getFeatureLimit('bgRemovalLimit')} عدد مجاز` : 'نامحدود'}
                          </span>
                        </div>
                        
                        {getFeatureLimit('bgRemovalLimit') > 0 && (
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full rounded-full transition-all duration-350"
                              style={{ width: `${Math.min(100, (formData.bgRemovalCount / getFeatureLimit('bgRemovalLimit')) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Usage Instructions */}
                    <div className="bg-blue-50/[0.15] dark:bg-blue-950/[0.05] p-5 rounded-2xl border border-blue-100/50 dark:border-blue-900/10 space-y-3 text-xs font-bold text-slate-700 dark:text-slate-350">
                      <h3 className="text-xs font-black text-blue-600 dark:text-blue-400">💡 نحوه استفاده و اعمال روی محصولات</h3>
                      <ul className="list-disc list-inside space-y-2 text-[10px] leading-relaxed text-right">
                        <li>به منوی <strong className="text-blue-600 dark:text-blue-400">کتابخانه رسانه</strong> مراجعه کنید.</li>
                        <li>روی تصویر محصول مورد نظر کلیک کنید تا پنجره جزئیات آن باز شود.</li>
                        <li>بر روی دکمه‌ی جادویی <strong className="text-blue-600 dark:text-blue-400">«حذف پس‌زمینه با هوش مصنوعی»</strong> کلیک کنید.</li>
                        <li>همچنین می‌توانید از منوی کتابخانه رسانه، دکمه **«پردازش گروهی تصاویر»** را بزنید تا کارها به صورت خودکار و دسته‌جمعی ویرایش شوند.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 2. Default Configuration Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6 text-right">
                  <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3">
                    <Sliders className="w-4.5 h-4.5 text-blue-500" />
                    تنظیمات پیش‌فرض پردازش و استانداردسازی کاتالوگ تصاویر
                  </h2>

                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                    تنظیمات زیر به عنوان قالب پیش‌فرض استانداردسازی تصاویر در کتابخانه رسانه و پردازش‌های گروهی استفاده می‌شوند تا تمامی تصاویر سایت شما از نظر ابعاد، فاصله سوژه و واتر‌مارک یکدست و حرفه‌ای شوند.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold">
                    {/* Dimension Selection */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">ابعاد استاندارد کاتالوگ تصاویر (ابعاد خروجی)</label>
                      <select
                        value={imageProcess.dimensions}
                        onChange={(e) => setImageProcess({ ...imageProcess, dimensions: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none text-slate-700 dark:text-slate-300 font-black cursor-pointer"
                      >
                        <option value="square">مربع ۱:۱ (۱۰۰۰ × ۱۰۰۰ پیکسل) - استاندارد وب‌سایت</option>
                        <option value="portrait">پرتره ۳:۴ (۱۰۰۰ × ۱۳۳۳ پیکسل) - مناسب پوشاک و مد</option>
                        <option value="landscape">افقی ۴:۳ (۱۰۰۰ × ۷۵۰ پیکسل) - مناسب تصاویر افقی</option>
                        <option value="original">ابعاد اصلی (ابعاد فابریک تصویر را حفظ کن)</option>
                      </select>
                    </div>

                    {/* Default Background Color */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">رنگ پس‌زمینه پیش‌فرض (کانواس خالی)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={imageProcess.bgColor}
                          onChange={(e) => setImageProcess({ ...imageProcess, bgColor: e.target.value })}
                          className="h-10 w-10 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 overflow-hidden shrink-0"
                        />
                        <input
                          type="text"
                          value={imageProcess.bgColor}
                          onChange={(e) => setImageProcess({ ...imageProcess, bgColor: e.target.value })}
                          className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none font-mono text-[11px] text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* Subject Scale Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[11px] font-black text-slate-400 dark:text-slate-500">مقیاس استاندارد سوژه در تصویر (Scale & Padding)</label>
                        <span className="text-[10px] text-blue-600 font-mono font-bold">{imageProcess.subjectScale}% کانواس</span>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
                        <input
                          type="range"
                          min="50"
                          max="95"
                          step="5"
                          value={imageProcess.subjectScale}
                          onChange={(e) => setImageProcess({ ...imageProcess, subjectScale: parseInt(e.target.value) || 50 })}
                          className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1 font-bold">هوش مصنوعی سوژه را در هر فاصله‌ای که باشد، تراز کرده و دقیقاً به میزان مشخص‌شده در مرکز کادر بزرگ/کوچک می‌کند تا فاصله پدینگ دور تمام محصولات یکسان شود.</p>
                    </div>

                    {/* Watermark Type */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 mb-2">نوع واترمارک محافظتی پیش‌فرض</label>
                      <select
                        value={imageProcess.watermarkType}
                        onChange={(e) => setImageProcess({ ...imageProcess, watermarkType: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none text-slate-700 dark:text-slate-300 font-black cursor-pointer"
                      >
                        <option value="none">بدون واترمارک (تصویر تمیز)</option>
                        <option value="text">افزودن متن متنی (ساده و سبک)</option>
                        <option value="logo">افزودن لوگوی فروشگاه (از گالری رسانه‌ها)</option>
                      </select>
                    </div>

                    {/* Conditional Watermark Fields */}
                    {imageProcess.watermarkType === 'text' && (
                      <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 dark:bg-slate-950/10 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">متن واترمارک</label>
                          <input
                            type="text"
                            value={imageProcess.watermarkText}
                            onChange={(e) => setImageProcess({ ...imageProcess, watermarkText: e.target.value })}
                            placeholder="مثلا: فروشگاه آنلاین کفش"
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">موقعیت قرارگیری</label>
                          <select
                            value={imageProcess.watermarkPosition}
                            onChange={(e) => setImageProcess({ ...imageProcess, watermarkPosition: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none"
                          >
                            <option value="center">مرکز (چرخیده شده)</option>
                            <option value="bottom-right">پایین راست</option>
                            <option value="bottom-left">پایین چپ</option>
                            <option value="top-right">بالا راست</option>
                            <option value="top-left">بالا چپ</option>
                          </select>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] text-slate-400 dark:text-slate-500">میزان شفافیت (Opacity)</label>
                            <span className="text-[10px] font-mono text-blue-600 font-bold">{Math.round(imageProcess.watermarkOpacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="0.4"
                            step="0.05"
                            value={imageProcess.watermarkOpacity}
                            onChange={(e) => setImageProcess({ ...imageProcess, watermarkOpacity: parseFloat(e.target.value) || 0.25 })}
                            className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer accent-blue-600"
                          />
                        </div>
                      </div>
                    )}

                    {imageProcess.watermarkType === 'logo' && (
                      <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 dark:bg-slate-950/10 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">آدرس فایل لوگو (از گالری رسانه‌ها)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={imageProcess.watermarkLogoUrl}
                              onChange={(e) => setImageProcess({ ...imageProcess, watermarkLogoUrl: e.target.value })}
                              placeholder="/uploads/logo.png"
                              dir="ltr"
                              className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none text-left"
                            />
                            <button
                              type="button"
                              onClick={() => setShowMediaPicker('watermark_logo')}
                              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl border border-blue-100 transition-colors font-bold text-[11px]"
                            >
                              انتخاب
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">موقعیت قرارگیری</label>
                          <select
                            value={imageProcess.watermarkPosition}
                            onChange={(e) => setImageProcess({ ...imageProcess, watermarkPosition: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none"
                          >
                            <option value="center">مرکز تصویر</option>
                            <option value="bottom-right">پایین راست</option>
                            <option value="bottom-left">پایین چپ</option>
                            <option value="top-right">بالا راست</option>
                            <option value="top-left">بالا چپ</option>
                          </select>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] text-slate-400 dark:text-slate-500">میزان شفافیت لوگو (Opacity)</label>
                            <span className="text-[10px] font-mono text-blue-600 font-bold">{Math.round(imageProcess.watermarkOpacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="0.4"
                            step="0.05"
                            value={imageProcess.watermarkOpacity}
                            onChange={(e) => setImageProcess({ ...imageProcess, watermarkOpacity: parseFloat(e.target.value) || 0.25 })}
                            className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer accent-blue-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-12 space-y-4">
                <Sparkles className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-black text-slate-850 dark:text-white">سرویس هوشمند حذف پس‌زمینه در پکیج شما فعال نیست</h3>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto font-bold leading-relaxed">
                  با استفاده از این ماژول می‌توانید پس‌زمینه کاتالوگ کالاهای خود را بردارید تا ظاهری کاملاً حرفه‌ای و منسجم پیدا کنند. برای فعال‌سازی نقشه سایت خودکار و مدیریت فایل Robots.txt، لطفاً پکیج خود را ارتقا دهید یا با مدیریت اصلی تماس بگیرید.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header Description */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-2">
              <h2 className="text-sm font-black text-slate-850 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-500" />
                اتصال به سایر امکانات و سرویس‌های جانبی
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed max-w-3xl">
                فروشگاه خود را به سایر سرویس‌ها و ابزارهای محبوب متصل کنید. در این بخش می‌توانید سرویس‌های پیام‌رسان بله، درگاه‌های ثبت سفارش، سیستم‌های سئو گوگل و کاتالوگ‌های ترب را مدیریت و همگام‌سازی کنید.
              </p>
            </div>

            {/* List of services */}
            <div className="grid grid-cols-1 gap-6">
              {/* 1. BALE Service */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 dark:border-slate-850 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 shrink-0">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-2">
                        پیام‌رسان بله (Bale Messenger)
                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full">
                          {formData.baleOrderNotificationsEnabled && formData.baleChatId ? 'متصل شده' : 'آماده اتصال'}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                        فعال‌سازی ارسال گزارشات و اعلان سفارشات جدید از طریق ربات مرکزی پلتفرم در پیام‌رسان بله
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Centralized Bot Connection Card */}
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 p-6 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 space-y-5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4.5 h-4.5 text-blue-500" />
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">اتصال به ربات مرکزی بله</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, baleOrderNotificationsEnabled: !prev.baleOrderNotificationsEnabled }))}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          formData.baleOrderNotificationsEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            formData.baleOrderNotificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                      دیگر نیازی به ساخت ربات شخصی در BotFather ندارید! از طریق اتصال امن به ربات مرکزی، سفارشات جدید و گزارشات را مستقیماً در اکانت شخصی بله خود دریافت کنید.
                    </p>

                    {formData.baleOrderNotificationsEnabled && (
                      <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Token Gen/View Section */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-black text-slate-650 dark:text-slate-350">رمز اتصال یکتا (Bale Integration Token)</label>
                            <div className="relative group inline-block">
                              <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-pointer transition-colors" />
                              <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl shadow-xl border border-slate-800 hidden group-hover:block transition-all duration-200 z-50 text-[10px] leading-relaxed">
                                <div className="font-black text-blue-400 mb-1.5 flex items-center gap-1 border-b border-slate-800 pb-1">
                                  <span>آموزش گام‌به‌گام اتصال به ربات مرکزی:</span>
                                </div>
                                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-bold">
                                  <li>رمز اتصال زیر را تولید کنید. (تنظیمات را ذخیره کنید)</li>
                                  <li>وارد ربات مرکزی پلتفرم در بله شوید.</li>
                                  <li>شماره موبایل ثبت‌شده در پنل خود را وارد کنید.</li>
                                  <li>رمز اتصال زیر را برای ربات بفرستید تا حساب شما متصل شود!</li>
                                </ol>
                                <div className="absolute top-full right-4 w-2 h-2 bg-slate-900 dark:bg-slate-950 border-r border-b border-slate-800 transform rotate-45" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={formData.baleIntegrationToken || ''}
                              className="grow text-[11px] font-mono p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-350 focus:outline-none select-all text-center tracking-widest font-black"
                              placeholder="رمزی هنوز ساخته نشده است"
                            />
                            <button
                              type="button"
                              onClick={handleGenerateBaleToken}
                              className="px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 rounded-xl text-[10px] font-black transition-colors shrink-0"
                            >
                              ساخت رمز جدید
                            </button>
                          </div>

                          {tokenChanged && (
                            <p className="text-[9.5px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/20 p-2.5 rounded-xl animate-pulse leading-normal">
                              ⚠️ رمز اتصال تغییر کرد. برای ثبت نهایی حتماً روی دکمه <strong>«ذخیره تغییرات»</strong> در بالای صفحه کلیک کنید.
                            </p>
                          )}
                        </div>

                        {/* Linked Chat ID Status */}
                        <div className="bg-slate-100/60 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-500">وضعیت اتصال چت بله:</span>
                            {formData.baleChatId ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-black">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                متصل شده (شناسه چت: {formData.baleChatId})
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-black">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                منتظر تایید در ربات
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Customization Checklist */}
                        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <label className="text-[10px] font-black text-slate-650 dark:text-slate-350 block">مراحل و وضعیت‌های سفارش ارسالی به بله:</label>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            {[
                              { id: 'new_order', label: '🛒 ثبت سفارش جدید' },
                              { id: 'paid', label: '✅ پرداخت شده' },
                              { id: 'shipped', label: '🚚 ارسال شده' },
                              { id: 'delivered', label: '📦 تحویل شده' },
                              { id: 'cancelled', label: '❌ لغو شده' },
                            ].map((statusItem) => {
                              const isChecked = Array.isArray(formData.baleNotificationStatuses) 
                                ? formData.baleNotificationStatuses.includes(statusItem.id)
                                : false;
                              return (
                                <label key={statusItem.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-100/40 dark:hover:bg-slate-950/20 rounded-lg transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const current = Array.isArray(formData.baleNotificationStatuses) ? [...formData.baleNotificationStatuses] : [];
                                      let updated;
                                      if (e.target.checked) {
                                        updated = [...current, statusItem.id];
                                      } else {
                                        updated = current.filter(x => x !== statusItem.id);
                                      }
                                      setFormData(prev => ({ ...prev, baleNotificationStatuses: updated }));
                                    }}
                                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                  />
                                  <span>{statusItem.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Informational Guidance Box */}
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 p-6 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 space-y-4 flex flex-col justify-center">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Sparkles className="w-4.5 h-4.5 text-blue-500" />
                      مکانیزم یکپارچه و امن ربات مرکزی
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                      سیستم هوشمند ربات مرکزی پلتفرم ما به صورت کاملاً ایزوله و رمزنگاری شده اجرا می‌شود. هر فروشگاه دارای یک رمز امنیتی یکتای تصادفی است. با به اشتراک‌گذاری این رمز منحصراً با ربات مرکزی، چت‌آیدی شما به صورت رمزگذاری شده متصل شده و تمامی گزارشات سفارشات شما در بستری فوق‌العاده امن، سریع و بدون تاخیر ارسال خواهد شد.
                    </p>
                    <div className="text-[9.5px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      <span>برای شروع، دکمه «اعلان‌های بات سفارشات بله» را در کارت روبه‌رو فعال کرده و رمز اتصال بسازید.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SMS Notification Service */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 dark:border-slate-850 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 shrink-0">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-2">
                        سامانه پیامک هوشمند (SMS Notification)
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          formData.smsConfig?.enabled && formData.smsConfig?.provider ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {formData.smsConfig?.enabled && formData.smsConfig?.provider ? 'فعال' : 'غیرفعال'}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                        ارسال خودکار پیامک اطلاع‌رسانی به مشتریان و مدیر فروشگاه در زمان ثبت سفارش، ارسال، لغو و ثبت‌نام کاربر جدید
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      smsConfig: {
                        ...prev.smsConfig,
                        enabled: !prev.smsConfig?.enabled
                      }
                    }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.smsConfig?.enabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.smsConfig?.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {formData.smsConfig?.enabled && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Provider & Credentials Card */}
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 p-6 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 space-y-4">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Sliders className="w-4.5 h-4.5 text-blue-500" />
                          تنظیمات پنل پیامک
                        </h4>

                        {/* Provider Select */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-650 dark:text-slate-350 block">انتخاب ارائه‌دهنده پیامک</label>
                          <select
                            value={formData.smsConfig?.provider || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              smsConfig: {
                                ...prev.smsConfig,
                                provider: e.target.value
                              }
                            }))}
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- انتخاب کنید --</option>
                            <option value="melipayamak">ملی پیامک (Melipayamak)</option>
                            <option value="smsir">SMS.ir</option>
                          </select>
                        </div>

                        {/* Admin Phone */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-650 dark:text-slate-350 block">شماره موبایل مدیر (جهت دریافت اعلان سفارش جدید)</label>
                          <input
                            type="text"
                            value={formData.smsConfig?.adminPhone || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              smsConfig: {
                                ...prev.smsConfig,
                                adminPhone: e.target.value
                              }
                            }))}
                            placeholder="مثال: 09123456789"
                            className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left font-mono"
                          />
                        </div>

                        {/* Melipayamak Credentials */}
                        {formData.smsConfig?.provider === 'melipayamak' && (
                          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-650 dark:text-slate-350 block">نام کاربری ملی پیامک</label>
                              <input
                                type="text"
                                value={formData.smsConfig?.credentials?.username || ''}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  smsConfig: {
                                    ...prev.smsConfig,
                                    credentials: {
                                      ...prev.smsConfig.credentials,
                                      username: e.target.value
                                    }
                                  }
                                }))}
                                placeholder={formData.smsConfig?.credentials?.username ? '********' : 'نام کاربری پنل'}
                                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left font-mono"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-650 dark:text-slate-350 block">کلمه عبور ملی پیامک</label>
                              <input
                                type="password"
                                value={formData.smsConfig?.credentials?.password || ''}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  smsConfig: {
                                    ...prev.smsConfig,
                                    credentials: {
                                      ...prev.smsConfig.credentials,
                                      password: e.target.value
                                    }
                                  }
                                }))}
                                placeholder={formData.smsConfig?.credentials?.password ? '********' : 'کلمه عبور پنل'}
                                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {/* SMS.ir Credentials */}
                        {formData.smsConfig?.provider === 'smsir' && (
                          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                            <label className="text-[10px] font-black text-slate-650 dark:text-slate-350 block">کلید وب‌سرویس (API Key) سامانه SMS.ir</label>
                            <input
                              type="password"
                              value={formData.smsConfig?.credentials?.apiKey || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                  smsConfig: {
                                    ...prev.smsConfig,
                                    credentials: {
                                      ...prev.smsConfig.credentials,
                                      apiKey: e.target.value
                                    }
                                  }
                              }))}
                              placeholder={formData.smsConfig?.credentials?.apiKey ? '********' : 'کلید وب‌سرویس ۳۲ کاراکتری'}
                              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left font-mono"
                            />
                          </div>
                        )}
                      </div>

                      {/* Test SMS Card */}
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 p-6 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 space-y-4 flex flex-col justify-between">
                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Sparkles className="w-4.5 h-4.5 text-blue-500" />
                            ارسال پیامک تستی
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                            قبل از فعال‌سازی نهایی، می‌توانید یک پیامک تستی ارسال کنید تا مطمئن شوید اطلاعات ورود و کدهای الگو به درستی وارد شده‌اند.
                          </p>

                          <div className="space-y-3">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-650 dark:text-slate-350 block">شماره موبایل دریافت‌کننده تست</label>
                              <input
                                type="text"
                                value={smsTestPhone}
                                onChange={(e) => setSmsTestPhone(e.target.value)}
                                placeholder="مثال: 09123456789"
                                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left font-mono"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-650 dark:text-slate-350 block">کد الگو/قالب جهت تست</label>
                              <input
                                type="text"
                                value={smsTestPattern}
                                onChange={(e) => setSmsTestPattern(e.target.value)}
                                placeholder="کد عددی الگو"
                                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-4">
                          {smsTestResult.text && (
                            <div className={`p-3 rounded-xl text-[10px] font-bold leading-normal border ${
                              smsTestResult.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/20 text-rose-600 dark:text-rose-400'
                            }`}>
                              {smsTestResult.text}
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={testingSms || !formData.smsConfig?.provider}
                            onClick={handleSendTestSms}
                            className="w-full py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {testingSms ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                در حال ارسال تست...
                              </>
                            ) : (
                              <>
                                <Smartphone className="w-4 h-4" />
                                ارسال پیامک تستی
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Pattern Registration Instructions */}
                    {formData.smsConfig?.provider && (
                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-2">
                          <Info className="w-4.5 h-4.5 text-blue-500" />
                          راهنمای ثبت الگوها در پنل پیامک
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                          برای ارسال سریع پیامک‌ها بدون معطلی در بلک‌لیست مخابرات، باید متن‌های زیر را دقیقاً کپی کرده و در بخش <strong>«ارسال بر اساس الگو / وب‌سرویس خدماتی»</strong> در پنل پیامک خود ثبت کنید. پس از تایید توسط پنل، کد الگوی دریافتی را در فیلدهای روبه‌رو وارد کنید.
                        </p>

                        <div className="grid grid-cols-1 gap-4">
                          {[
                            {
                              id: 'order_placed_customer',
                              title: '🛒 ثبت سفارش جدید (مشتری)',
                              melipayamak: `سلام {0}، سفارش {1} با مبلغ {2} تومان در فروشگاه {3} ثبت شد.`,
                              smsir: `سلام {customerName}، سفارش {orderNumber} با مبلغ {totalAmount} تومان در فروشگاه {storeName} ثبت شد.`
                            },
                            {
                              id: 'order_placed_admin',
                              title: '🔔 ثبت سفارش جدید (مدیر فروشگاه)',
                              melipayamak: `یک سفارش جدید با شماره {0} به مبلغ {1} تومان در فروشگاه {2} ثبت شد.`,
                              smsir: `یک سفارش جدید با شماره {orderNumber} به مبلغ {totalAmount} تومان در فروشگاه {storeName} ثبت شد.`
                            },
                            {
                              id: 'order_shipped',
                              title: '🚚 ارسال سفارش (مشتری)',
                              melipayamak: `سلام {0}، سفارش {1} ارسال شد. کد رهگیری پستی: {2}`,
                              smsir: `سلام {customerName}، سفارش {orderNumber} ارسال شد. کد رهگیری پستی: {trackingCode}`
                            },
                            {
                              id: 'order_cancelled',
                              title: '❌ لغو سفارش (مشتری)',
                              melipayamak: `سلام {0}، سفارش {1} لغو شد.`,
                              smsir: `سلام {customerName}، سفارش {orderNumber} لغو شد.`
                            },
                            {
                              id: 'new_registration',
                              title: '👤 ثبت‌نام کاربر جدید (مشتری)',
                              melipayamak: `سلام {0}، به فروشگاه {1} خوش آمدید!`,
                              smsir: `سلام {customerName}، به فروشگاه {storeName} خوش آمدید!`
                            },
                            {
                              id: 'otp',
                              title: '🔑 ارسال کد تایید ورود/ثبت‌نام (مشتری و مدیر)',
                              melipayamak: `کد تایید شما: {0}`,
                              smsir: `کد تایید شما: {code}`
                            }
                          ].map((item) => {
                            const templateText = formData.smsConfig?.provider === 'melipayamak' ? item.melipayamak : item.smsir;
                            return (
                              <div key={item.id} className="bg-slate-50/30 dark:bg-slate-950/10 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="space-y-2 grow max-w-2xl">
                                  <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block">{item.title}</span>
                                  <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850 text-[10.5px] font-bold text-slate-600 dark:text-slate-400 select-all leading-relaxed">
                                    {templateText}
                                  </div>
                                </div>
                                <div className="flex md:flex-col items-stretch gap-2 shrink-0 w-full md:w-48">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(templateText);
                                      alert('متن الگو در حافظه کپی شد!');
                                    }}
                                    className="grow py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black transition-colors"
                                  >
                                    کپی متن الگو
                                  </button>
                                  <input
                                    type="text"
                                    value={formData.smsConfig?.patterns?.[item.id] || ''}
                                    onChange={(e) => setFormData(prev => ({
                                      ...prev,
                                      smsConfig: {
                                        ...prev.smsConfig,
                                        patterns: {
                                          ...prev.smsConfig.patterns,
                                          [item.id]: e.target.value
                                        }
                                      }
                                    }))}
                                    placeholder="کد الگوی تایید شده"
                                    className="grow text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono"
                                  />
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

              {/* 2. Google Search Console & Webmaster (Google Analytics & Tag Manager) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 dark:border-slate-850 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 shrink-0">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-2">
                        گوگل آنالیتیکس و تگ منیجر (Google Analytics & GTM)
                        {(formData.googleAnalyticsId?.startsWith('G-') || formData.googleTagManagerId?.startsWith('GTM-') || formData.microsoftClarityId) ? (
                          <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full">
                            فعال و آماده رهگیری
                          </span>
                        ) : (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full">
                            غیرفعال
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                        اتصال مستقیم به ابزارهای گوگل آنالیتیکس، گوگل تگ منیجر و مایکروسافت کلاریتی برای رهگیری، تحلیل رفتار خریداران و بهینه‌سازی فروش
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Settings card */}
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 p-6 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 space-y-5">
                    <div className="space-y-4">
                      {/* Google Analytics ID */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-black text-slate-650 dark:text-slate-350">شناسه اندازه‌گیری گوگل آنالیتیکس (GA4 Measurement ID)</label>
                          <div className="relative group inline-block">
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-pointer transition-colors" />
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl shadow-xl border border-slate-800 hidden group-hover:block transition-all duration-200 z-50 text-[10px] leading-relaxed">
                              <div className="font-black text-blue-400 mb-1.5 flex items-center gap-1 border-b border-slate-800 pb-1">
                                <span>چگونه شناسه را دریافت کنیم؟</span>
                              </div>
                              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-bold">
                                <li>وارد پنل Google Analytics خود شوید.</li>
                                <li>به بخش Admin و سپس Data Streams بروید.</li>
                                <li>جریان وب خود را انتخاب کنید.</li>
                                <li>مقدار MEASUREMENT ID را کپی کنید (این شناسه معمولاً با -G شروع می‌شود).</li>
                              </ol>
                              <div className="absolute top-full right-4 w-2 h-2 bg-slate-900 dark:bg-slate-950 border-r border-b border-slate-800 transform rotate-45" />
                            </div>
                          </div>
                        </div>

                        <input
                          type="text"
                          name="googleAnalyticsId"
                          value={formData.googleAnalyticsId || ''}
                          onChange={handleChange}
                          dir="ltr"
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono text-center font-black tracking-widest"
                          placeholder="G-XXXXXXXXXX"
                          maxLength={20}
                        />
                      </div>

                      {/* Google Tag Manager ID */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-black text-slate-650 dark:text-slate-350">شناسه کانتینر گوگل تگ منیجر (GTM Container ID)</label>
                          <div className="relative group inline-block">
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-pointer transition-colors" />
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl shadow-xl border border-slate-800 hidden group-hover:block transition-all duration-200 z-50 text-[10px] leading-relaxed">
                              <div className="font-black text-blue-400 mb-1.5 flex items-center gap-1 border-b border-slate-800 pb-1">
                                <span>چگونه شناسه GTM را دریافت کنیم؟</span>
                              </div>
                              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-bold">
                                <li>وارد پنل Google Tag Manager خود شوید.</li>
                                <li>در بالای صفحه اصلی پنل، شناسه شروع‌شده با -GTM را بردارید.</li>
                                <li>این کانتینر به شما امکان مدیریت آسان تگ‌های یکتای دیگر و ابزارهای رهگیری مثل یکتانت، فیسبوک پیکسل و... را می‌دهد.</li>
                              </ol>
                              <div className="absolute top-full right-4 w-2 h-2 bg-slate-900 dark:bg-slate-950 border-r border-b border-slate-800 transform rotate-45" />
                            </div>
                          </div>
                        </div>

                        <input
                          type="text"
                          name="googleTagManagerId"
                          value={formData.googleTagManagerId || ''}
                          onChange={handleChange}
                          dir="ltr"
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono text-center font-black tracking-widest"
                          placeholder="GTM-XXXXXXX"
                          maxLength={20}
                        />
                      </div>

                      {/* Microsoft Clarity Project ID */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-black text-slate-650 dark:text-slate-350">شناسه پروژه مایکروسافت کلاریتی (Clarity Project ID)</label>
                          <div className="relative group inline-block">
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-pointer transition-colors" />
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl shadow-xl border border-slate-800 hidden group-hover:block transition-all duration-200 z-50 text-[10px] leading-relaxed">
                              <div className="font-black text-blue-400 mb-1.5 flex items-center gap-1 border-b border-slate-800 pb-1">
                                <span>چگونه شناسه Clarity را پیدا کنیم؟</span>
                              </div>
                              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-bold">
                                <li>وارد پنل Microsoft Clarity خود شوید.</li>
                                <li>یک پروژه جدید برای دامنه فروشگاه خود بسازید.</li>
                                <li>به بخش Settings و سپس Setup بروید.</li>
                                <li>در بخش کدهای اسکریپت، شناسه منحصربفرد پروژه خود را (که یک کد ترکیبی کوتاه مانند `abcdefgh12` است) پیدا کرده و وارد کنید.</li>
                              </ol>
                              <div className="absolute top-full right-4 w-2 h-2 bg-slate-900 dark:bg-slate-950 border-r border-b border-slate-800 transform rotate-45" />
                            </div>
                          </div>
                        </div>

                        <input
                          type="text"
                          name="microsoftClarityId"
                          value={formData.microsoftClarityId || ''}
                          onChange={handleChange}
                          dir="ltr"
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-850 dark:text-white focus:border-blue-500 transition-all font-mono text-center font-black tracking-widest"
                          placeholder="xxxxxxxxxx"
                          maxLength={25}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informational Box */}
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 p-6 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 space-y-4 flex flex-col justify-center">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Sparkles className="w-4.5 h-4.5 text-blue-500" />
                      رهگیری حرفه‌ای ترافیک و تحلیل نقشه حرارتی
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                      با فعال‌سازی گوگل تگ منیجر و مایکروسافت کلاریتی، فروشگاه شما مجهز به پیشرفته‌ترین ابزارهای سئو و واکاوی کاربر می‌شود. با Clarity می‌توانید فیلم ضبط‌شده جلسات خریداران، هیت‌مپ‌ها (نقشه‌های حرارتی کلیک‌ها) و بن‌بست‌های خرید را تحلیل کرده و نرخ تبدیل فروشگاه خود را تا ۵ برابر ارتقا دهید.
                    </p>
                    <div className="text-[9.5px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      <span>برای ذخیره شناسه‌های وارد شده، دکمه «ذخیره تغییرات» را در بالای صفحه کلیک کنید.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Mahak Accounting Software */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 dark:border-slate-850 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-2xl bg-black flex items-center justify-center p-1 shrink-0 border border-slate-800">
                      <img src="/mahak-logo.png" alt="لوگو محک" className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-850 dark:text-white flex items-center gap-2">
                        سیستم حسابداری محک (Mahak Accounting)
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          formData.mahakEnabled 
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-450' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {formData.mahakEnabled ? 'فعال شده' : 'غیرفعال'}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                        همگام‌سازی خودکار محصولات، سفارشات و مشتریان با سیستم حسابداری محک
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, mahakEnabled: !prev.mahakEnabled }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.mahakEnabled ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.mahakEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {formData.mahakEnabled && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Step-by-Step Guide */}
                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Info size={14} className="shrink-0" />
                        <span className="text-xs font-black">راهنمای گام‌به‌گام راه‌اندازی و اتصال به حسابداری محک:</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-500 font-black">
                            <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[9px]">۱</span>
                            <span>فعال‌سازی کلی</span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-relaxed">سوییچ «فعالسازی کلی اتصال» را در بالا روشن کنید.</p>
                        </div>

                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-500 font-black">
                            <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[9px]">۲</span>
                            <span>دریافت اطلاعات API</span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-relaxed">آدرس سرور و کلید امنیتی (API Key) را از پشتیبانی محک دریافت و وارد کنید.</p>
                        </div>

                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-500 font-black">
                            <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[9px]">۳</span>
                            <span>ذخیره تنظیمات</span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-relaxed">تنظیمات وب‌سرویس و همگام‌سازی را پر کرده و دکمه ذخیره در بالای صفحه را بزنید.</p>
                        </div>

                        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-500 font-black">
                            <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[9px]">۴</span>
                            <span>مدیریت و تست اتصال</span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-relaxed">برای تست اتصال زنده و همگام‌سازی محصولات و سفارشات به منوی «حسابداری» و زیرمنوی «سیستم حسابداری محک» مراجعه کنید.</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Connection Form */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-6 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">تنظیمات وب‌سرویس محک</h4>
                      
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-650 dark:text-slate-350">آدرس سرور / وب‌سرویس (Server URL)</label>
                          <input
                            type="text"
                            name="mahakServerUrl"
                            value={formData.mahakServerUrl || ''}
                            onChange={handleChange}
                            dir="ltr"
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs text-slate-850 dark:text-white focus:border-amber-500 transition-all"
                            placeholder="http://127.0.0.1:8080/mahak-api"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-650 dark:text-slate-350">کلید امنیتی API (API Key)</label>
                          <input
                            type="password"
                            name="mahakApiKey"
                            value={formData.mahakApiKey || ''}
                            onChange={handleChange}
                            dir="ltr"
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs text-slate-850 dark:text-white focus:border-amber-500 transition-all"
                            placeholder="توکن امنیتی وب‌سرویس"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-650 dark:text-slate-350">نام کاربری (Username)</label>
                            <input
                              type="text"
                              name="mahakUsername"
                              value={formData.mahakUsername || ''}
                              onChange={handleChange}
                              dir="ltr"
                              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs text-slate-850 dark:text-white focus:border-amber-500 transition-all"
                              placeholder="نام کاربری"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-650 dark:text-slate-350">رمز عبور (Password)</label>
                            <input
                              type="password"
                              name="mahakPassword"
                              value={formData.mahakPassword || ''}
                              onChange={handleChange}
                              dir="ltr"
                              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs text-slate-850 dark:text-white focus:border-amber-500 transition-all"
                              placeholder="رمز عبور"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sync Settings */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-6 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 space-y-5">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">تنظیمات همگام‌سازی</h4>
                      
                      <div className="space-y-3">
                        <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-100/40 dark:hover:bg-slate-950/20 rounded-xl transition-colors">
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">همگام‌سازی خودکار محصولات</span>
                          <input
                            type="checkbox"
                            checked={formData.mahakSyncProducts}
                            onChange={(e) => setFormData(prev => ({ ...prev, mahakSyncProducts: e.target.checked }))}
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4"
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-100/40 dark:hover:bg-slate-950/20 rounded-xl transition-colors">
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">همگام‌سازی خودکار سفارشات</span>
                          <input
                            type="checkbox"
                            checked={formData.mahakSyncOrders}
                            onChange={(e) => setFormData(prev => ({ ...prev, mahakSyncOrders: e.target.checked }))}
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4"
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-100/40 dark:hover:bg-slate-950/20 rounded-xl transition-colors">
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">همگام‌سازی خودکار مشتریان</span>
                          <input
                            type="checkbox"
                            checked={formData.mahakSyncCustomers}
                            onChange={(e) => setFormData(prev => ({ ...prev, mahakSyncCustomers: e.target.checked }))}
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4"
                          />
                        </label>

                        {formData.mahakSyncCustomers && (
                          <label className="flex items-center justify-between cursor-pointer p-2 pr-4 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl transition-colors mr-4 border-r-2 border-amber-500">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black text-slate-700 dark:text-slate-300">همگام‌سازی فقط با شماره تماس</span>
                              <span className="text-[8px] font-bold text-slate-400">نام و اطلاعات خرید اجباری نباشد (فقط تطبیق شماره تلفن)</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={formData.mahakSyncCustomersPhoneOnly}
                              onChange={(e) => setFormData(prev => ({ ...prev, mahakSyncCustomersPhoneOnly: e.target.checked }))}
                              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4"
                            />
                          </label>
                        )}

                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          <div className="flex justify-between text-[10px] font-black text-slate-650 dark:text-slate-350">
                            <span>بازه زمانی همگام‌سازی خودکار</span>
                            <span className="text-amber-500">{(formData.mahakSyncInterval || 60).toLocaleString('fa-IR')} دقیقه</span>
                          </div>
                          <input
                            type="range"
                            min="15"
                            max="1440"
                            step="15"
                            value={formData.mahakSyncInterval || 60}
                            onChange={(e) => setFormData(prev => ({ ...prev, mahakSyncInterval: parseInt(e.target.value) }))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>

              {/* 3. TOROB Service PLACEHOLDER */}
              <div className="bg-slate-100/50 dark:bg-slate-950/20 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 opacity-75 relative overflow-hidden">
                <div className="absolute top-3 left-3 bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400 text-[8px] font-black px-2 py-0.5 rounded-full">
                  به زودی (سیستم فروش)
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-700 dark:text-slate-300">
                      موتور جستجوی ترب (Torob Integration)
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                      تولید خودکار فایل فید محصولات با استاندارد ترب (JSON/XML Feed) جهت نمایش و بروزرسانی خودکار کالاها و قیمت‌ها در ترب
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </form>

      {/* Picker dialogs */}
      {showMediaPicker && (
        <MediaPicker
          onSelect={(url) => {
            if (showMediaPicker === 'watermark_logo') {
              setImageProcess((prev: any) => ({ ...prev, watermarkLogoUrl: url }));
            } else {
              setFormData(prev => ({
                ...prev,
                [showMediaPicker === 'logo' ? 'logoUrl' : 'faviconUrl']: url,
              }));
            }
            setShowMediaPicker(null);
          }}
          onClose={() => setShowMediaPicker(null)}
        />
      )}
    </div>
  );
}
