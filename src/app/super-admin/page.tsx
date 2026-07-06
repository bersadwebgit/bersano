'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Store, 
  CheckCircle, 
  XCircle, 
  Power, 
  PowerOff, 
  LogOut, 
  Plus, 
  Headphones, 
  MessageSquare, 
  Send, 
  Shield, 
  User, 
  Clock, 
  Calendar, 
  AlertCircle, 
  ChevronLeft,
  ChevronRight,
  Paperclip,
  X,
  LayoutDashboard,
  Search,
  Menu,
  Filter,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
  Gift,
  Users,
  Award,
  Edit3,
  Settings,
  Sparkles,
  Key,
  FileText,
  HelpCircle,
  Trash2,
  Eye,
  Zap,
  Lock
} from 'lucide-react';
import CollaboratorsTab from '@/components/super-admin/CollaboratorsTab';

function decodeToken(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'shops' | 'tickets' | 'packages' | 'settings' | 'collaborators'>('overview');
  const [userSession, setUserSession] = useState<{ name: string; role: string } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [baseDomainSuffix, setBaseDomainSuffix] = useState('.localhost:3000');
  const [baseDomainOnly, setBaseDomainOnly] = useState('localhost:3000');

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('super_admin_token='))
      ?.split('=')[1];
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUserSession({ name: decoded.name || 'همکار', role: decoded.role });
        // Set proper default active tab based on role
        if (decoded.role === 'sales') {
          setActiveTab('overview');
        } else if (decoded.role === 'content_manager' || decoded.role === 'seo_manager') {
          setActiveTab('overview');
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      if (host.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
        setBaseDomainSuffix('.' + host);
        setBaseDomainOnly(host);
      } else {
        const parts = host.split('.');
        if (parts.length >= 2) {
          const baseDomain = parts.slice(-2).join('.');
          setBaseDomainSuffix('.' + baseDomain);
          setBaseDomainOnly(baseDomain);
        } else {
          setBaseDomainSuffix('.' + host);
          setBaseDomainOnly(host);
        }
      }
    }
  }, []);
  
  // Shops State
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newShopData, setNewShopData] = useState({
    shopName: '',
    subdomain: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [shopFilter, setShopFilter] = useState<'all' | 'active' | 'inactive' | 'approved' | 'pending'>('all');

  // Packages State
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null); // null means adding, object means editing
  const [packageError, setPackageError] = useState('');
  const [packageSubmitting, setPackageSubmitting] = useState(false);
  const [packageData, setPackageData] = useState({
    name: '',
    months: 1,
    price: 0,
    features: {
      physicalProducts: true,
      digitalProducts: false,
      specialDeals: false,
      relatedProducts: false,
      zarinpal: false,
      zibal: false,
      cardToCard: false,
      tipax: false,
      productSets: false,
      customerClub: false,
      seoTools: false,
      aiSeoEnabled: false,
      aiArticleEnabled: false,
      aiFaqsEnabled: false,
      aiAgentEnabled: false,
      aiRequestsLimit: 0,
      maxProducts: 0,
      bgRemovalEnabled: false,
      bgRemovalLimit: 0,
      staffEnabled: false,
      maxStaff: 0,
      onlineChatEnabled: false,
      customDomainEnabled: false,
      maxDomains: 1,
    }
  });

  // Shop Package Assignment State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedShopToAssign, setSelectedShopToAssign] = useState<any>(null);
  const [assignPackageId, setAssignPackageId] = useState('');
  const [assignExpiresAt, setAssignExpiresAt] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Shop Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedShopToDelete, setSelectedShopToDelete] = useState<any>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Shop Details & Password Change State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedShopForDetails, setSelectedShopForDetails] = useState<any>(null);
  const [ownerNewPassword, setOwnerNewPassword] = useState('');
  const [ownerNewPhone, setOwnerNewPhone] = useState('');
  const [ownerNewName, setOwnerNewName] = useState('');
  const [ownerNewEmail, setOwnerNewEmail] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');

  // Tickets State
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loadingTicketDetail, setLoadingTicketDetail] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all');

  // System Settings State
  const [poofApiKey, setPoofApiKey] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [openrouterModel, setOpenrouterModel] = useState('google/gemini-2.5-flash');
  const [openrouterControlModel, setOpenrouterControlModel] = useState('');
  const [openrouterBlogModel, setOpenrouterBlogModel] = useState('google/gemini-2.5-flash');
  const [aiModelRouter, setAiModelRouter] = useState('');
  const [aiModelSimple, setAiModelSimple] = useState('');
  const [aiModelComplex, setAiModelComplex] = useState('');
  const [aiModelContent, setAiModelContent] = useState('');
  const [aiModelChat, setAiModelChat] = useState('');
  const [aiModelEmbedding, setAiModelEmbedding] = useState('');
  const [aiModelFallback, setAiModelFallback] = useState('');
  const [aiModelWholesale, setAiModelWholesale] = useState('');
  const [aiEmbeddingBaseUrl, setAiEmbeddingBaseUrl] = useState('');
  const [aiEmbeddingApiKey, setAiEmbeddingApiKey] = useState('');
  const [platformBlogIdeaModel, setPlatformBlogIdeaModel] = useState('');
  const [platformBlogOutlineModel, setPlatformBlogOutlineModel] = useState('');
  const [platformBlogSectionModel, setPlatformBlogSectionModel] = useState('');
  const [platformBlogSeoModel, setPlatformBlogSeoModel] = useState('');
  const [platformBlogGeoModel, setPlatformBlogGeoModel] = useState('');
  const [platformBlogRewriteModel, setPlatformBlogRewriteModel] = useState('');
  const [platformBlogFaqModel, setPlatformBlogFaqModel] = useState('');
  const [blogAiChunkSize, setBlogAiChunkSize] = useState(800);
  const [blogAiOverlapTokens, setBlogAiOverlapTokens] = useState(200);
  const [blogAiMaxChunks, setBlogAiMaxChunks] = useState(5);
  const [blogAiAutoContinue, setBlogAiAutoContinue] = useState(true);
  const [aiProvider, setAiProvider] = useState<'openrouter'>('openrouter');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [centralBaleBotToken, setCentralBaleBotToken] = useState('');
  const [centralBaleBotApiKey, setCentralBaleBotApiKey] = useState('');
  const [centralTelegramBotToken, setCentralTelegramBotToken] = useState('');
  const [centralTelegramBotApiKey, setCentralTelegramBotApiKey] = useState('');
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [embedStats, setEmbedStats] = useState<{
    totalProducts: number;
    embeddedProducts: number;
    pendingProducts: number;
    progress?: {
      isProcessing: boolean;
      totalToProcess: number;
      processedCount: number;
      failedCount: number;
      startedAt: string | null;
      lastError: string | null;
    } | null;
  } | null>(null);
  const [isEmbeddingLoading, setIsEmbeddingLoading] = useState(false);
  const [embeddingMessage, setEmbeddingMessage] = useState('');
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'api_keys' | 'central_bale' | 'central_telegram' | 'base_prompts' | 'advanced_prompts' | 'article_prompts' | 'faq_prompts' | 'change_password' | 'security_settings'>('api_keys');

  // High Security & SMS Settings State
  const [globalSmsUsername, setGlobalSmsUsername] = useState('');
  const [globalSmsPassword, setGlobalSmsPassword] = useState('');
  const [globalSmsPatternCode, setGlobalSmsPatternCode] = useState('');
  const [smsEncryptionKeyStatus, setSmsEncryptionKeyStatus] = useState<'configured' | 'warning' | ''>('');
  const [otpHashSecretStatus, setOtpHashSecretStatus] = useState<'configured' | 'warning' | ''>('');
  const [totalSmsLogs, setTotalSmsLogs] = useState(0);
  const [clearingLogs, setClearingLogs] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // OTP Countdown Timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    fetchShops();
    fetchTickets();
    fetchPackages();
    fetchSystemSettings();
    fetchEmbeddingStats();
  }, []);

  const fetchEmbeddingStats = async () => {
    try {
      const res = await fetch('/api/super-admin/embeddings/batch');
      if (res.ok) {
        const data = await res.json();
        setEmbedStats(data);
      }
    } catch (error) {
      console.error('Error fetching embedding stats:', error);
    }
  };

  // Poll embedding progress when active
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (embedStats?.progress?.isProcessing) {
      timer = setTimeout(() => {
        fetchEmbeddingStats();
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [embedStats?.progress?.isProcessing, embedStats?.progress?.processedCount, embedStats?.progress?.failedCount]);

  const handleStartBatchEmbedding = async () => {
    setIsEmbeddingLoading(true);
    setEmbeddingMessage('در حال شروع پردازش دسته‌ای Embeddingها در پس‌زمینه...');
    try {
      const res = await fetch('/api/super-admin/embeddings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 20 }), // Use 20 as default batch size for safety
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(`پاسخ نامعتبر از سرور (کد وضعیت: ${res.status})`);
      }
      if (res.ok && data.success) {
        setEmbeddingMessage('پردازش دسته‌ای در پس‌زمینه آغاز شد. درصد پیشرفت به صورت خودکار بروزرسانی می‌شود.');
        await fetchEmbeddingStats();
      } else {
        setEmbeddingMessage(`خطا در شروع پردازش: ${data.error || 'خطای ناشناخته'}`);
      }
    } catch (error: any) {
      setEmbeddingMessage(`خطا در ارتباط با سرور: ${error?.message || error}`);
    } finally {
      setIsEmbeddingLoading(false);
    }
  };

  const fetchSystemSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch('/api/super-admin/settings');
      if (res.ok) {
        const data = await res.json();
        setPoofApiKey(data.apiKey || '');
        setOpenrouterApiKey(data.openrouterApiKey || '');
        setOpenrouterModel(data.openrouterModel || 'google/gemini-2.5-flash');
        setOpenrouterControlModel(data.openrouterControlModel || '');
        setOpenrouterBlogModel(data.openrouterBlogModel || 'google/gemini-2.5-flash');
        setBlogAiChunkSize(Number(data.blogAiChunkSize || 800));
        setBlogAiOverlapTokens(Number(data.blogAiOverlapTokens || 200));
        setBlogAiMaxChunks(Number(data.blogAiMaxChunks || 5));
        setBlogAiAutoContinue(data.blogAiAutoContinue !== undefined ? data.blogAiAutoContinue : true);
        setAiProvider('openrouter');
        setAiEnabled(data.aiEnabled !== undefined ? data.aiEnabled : true);
        setCentralBaleBotToken(data.centralBaleBotToken || '');
        setCentralBaleBotApiKey(data.centralBaleBotApiKey || '');
        setCentralTelegramBotToken(data.centralTelegramBotToken || '');
        setCentralTelegramBotApiKey(data.centralTelegramBotApiKey || '');
        setPrompts(data.prompts || {});
        setAccountInfo(data.accountInfo || null);
        setAiModelRouter(data.aiModelRouter || '');
        setAiModelSimple(data.aiModelSimple || '');
        setAiModelComplex(data.aiModelComplex || '');
        setAiModelContent(data.aiModelContent || '');
        setAiModelChat(data.aiModelChat || '');
        setAiModelEmbedding(data.aiModelEmbedding || '');
        setAiModelFallback(data.aiModelFallback || '');
        setAiModelWholesale(data.aiModelWholesale || '');
        setAiEmbeddingBaseUrl(data.aiEmbeddingBaseUrl || '');
        setAiEmbeddingApiKey(data.aiEmbeddingApiKey || '');
        setPlatformBlogIdeaModel(data.platformBlogIdeaModel || '');
        setPlatformBlogOutlineModel(data.platformBlogOutlineModel || '');
        setPlatformBlogSectionModel(data.platformBlogSectionModel || '');
        setPlatformBlogSeoModel(data.platformBlogSeoModel || '');
        setPlatformBlogGeoModel(data.platformBlogGeoModel || '');
        setPlatformBlogRewriteModel(data.platformBlogRewriteModel || '');
        setPlatformBlogFaqModel(data.platformBlogFaqModel || '');
        setGlobalSmsUsername(data.globalSmsUsername || '');
        setGlobalSmsPassword(data.globalSmsPassword || '');
        setGlobalSmsPatternCode(data.globalSmsPatternCode || '');
        setSmsEncryptionKeyStatus(data.smsEncryptionKeyStatus || '');
        setOtpHashSecretStatus(data.otpHashSecretStatus || '');
        setTotalSmsLogs(data.totalSmsLogs || 0);
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage('');
    setSettingsError('');

    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKey: poofApiKey,
          openrouterApiKey,
          openrouterModel,
          openrouterControlModel,
          openrouterBlogModel,
          blogAiChunkSize,
          blogAiOverlapTokens,
          blogAiMaxChunks,
          blogAiAutoContinue,
          aiProvider: 'openrouter',
          aiEnabled,
          prompts,
          centralBaleBotToken,
          centralBaleBotApiKey,
          centralTelegramBotToken,
          centralTelegramBotApiKey,
          aiModelRouter,
          aiModelSimple,
          aiModelComplex,
          aiModelContent,
          aiModelChat,
          aiModelEmbedding,
          aiModelFallback,
          aiModelWholesale,
          aiEmbeddingBaseUrl,
          aiEmbeddingApiKey,
          platformBlogIdeaModel,
          platformBlogOutlineModel,
          platformBlogSectionModel,
          platformBlogSeoModel,
          platformBlogGeoModel,
          platformBlogRewriteModel,
          platformBlogFaqModel,
          globalSmsUsername,
          globalSmsPassword,
          globalSmsPatternCode
        }),
      });

      if (res.ok) {
        setSettingsMessage('تنظیمات با موفقیت ذخیره شد.');
        fetchSystemSettings();
      } else {
        const data = await res.json();
        setSettingsError(data.error || 'خطا در ذخیره‌سازی تنظیمات');
      }
    } catch (error) {
      setSettingsError('خطای سرور در برقراری ارتباط');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearSmsLogs = async (deleteOldOnly = false) => {
    if (!window.confirm(deleteOldOnly ? 'آیا از حذف لاگ‌های قدیمی‌تر از ۳۰ روز اطمینان دارید؟' : 'آیا از حذف تمامی لاگ‌های سیستم پیامک اطمینان دارید؟')) {
      return;
    }
    setClearingLogs(true);
    setSettingsMessage('');
    setSettingsError('');
    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clearSmsLogs: !deleteOldOnly,
          deleteOldSmsLogs: deleteOldOnly,
        }),
      });
      if (res.ok) {
        setSettingsMessage(deleteOldOnly ? 'لاگ‌های قدیمی‌تر از ۳۰ روز با موفقیت حذف شدند.' : 'تمامی لاگ‌های سیستم پیامک با موفقیت حذف شدند.');
        fetchSystemSettings();
      } else {
        const data = await res.json();
        setSettingsError(data.error || 'خطا در حذف لاگ‌ها');
      }
    } catch (error) {
      setSettingsError('خطای ارتباط با سرور');
    } finally {
      setClearingLogs(false);
    }
  };

  const handleSendPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!adminPhone) {
      setPasswordError('لطفا شماره موبایل خود را وارد کنید');
      return;
    }

    try {
      const res = await fetch('/api/super-admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-otp', phone: adminPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ارسال کد تایید');
      }

      setOtpSent(true);
      setOtpCountdown(120);
      setPasswordSuccess(data.message || 'کد تایید با موفقیت ارسال شد');
      if (data.devCode) {
        console.log('Dev Code:', data.devCode);
        setPasswordSuccess(`${data.message || 'کد تایید ارسال شد'} (کد تست: ${data.devCode})`);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'خطا در ارسال کد تایید');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword || !adminPhone || !otpCode) {
      setPasswordError('لطفا تمام فیلدها را پر کنید');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('رمز عبور جدید و تکرار آن با هم مطابقت ندارند');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('رمز عبور جدید باید حداقل ۶ کاراکتر باشد');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch('/api/super-admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-password',
          phone: adminPhone,
          code: otpCode,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در تغییر رمز عبور');
      }

      setPasswordSuccess('رمز عبور با موفقیت تغییر یافت');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setOtpSent(false);
      setOtpCountdown(0);
    } catch (err: any) {
      setPasswordError(err.message || 'خطا در تغییر رمز عبور');
    } finally {
      setChangingPassword(false);
    }
  };

  // Refetch tickets on filter change
  useEffect(() => {
    fetchTickets();
  }, [ticketStatusFilter]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setReplyError('لطفا فقط فایل تصویر (عکس) انتخاب کنید.');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setReplyError('حجم فایل نباید بیشتر از ۵ مگابایت باشد.');
        return;
      }
      setFile(selectedFile);
      setReplyError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  const fetchShops = async () => {
    setLoadingShops(true);
    try {
      const res = await fetch('/api/super-admin/shops');
      if (res.status === 401) {
        window.location.href = '/super-admin/login';
        return;
      }
      const data = await res.json();
      setShops(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoadingShops(false);
    }
  };

  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const res = await fetch('/api/super-admin/packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPackageError('');
    setPackageSubmitting(true);

    try {
      const url = editingPackage 
        ? `/api/super-admin/packages/${editingPackage.id}`
        : '/api/super-admin/packages';
      
      const method = editingPackage ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: packageData.name,
          months: packageData.months,
          price: packageData.price,
          features: packageData.features
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ذخیره‌سازی پکیج');
      }

      setIsPackageModalOpen(false);
      setEditingPackage(null);
      setPackageData({
        name: '',
        months: 1,
        price: 0,
        features: {
          physicalProducts: true,
          digitalProducts: false,
          specialDeals: false,
          relatedProducts: false,
          zarinpal: false,
          zibal: false,
          cardToCard: false,
          tipax: false,
          productSets: false,
          customerClub: false,
          seoTools: false,
          aiSeoEnabled: false,
          aiArticleEnabled: false,
          aiFaqsEnabled: false,
          aiAgentEnabled: false,
          aiRequestsLimit: 0,
          maxProducts: 0,
          bgRemovalEnabled: false,
          bgRemovalLimit: 0,
          staffEnabled: false,
          maxStaff: 0,
          onlineChatEnabled: false,
          customDomainEnabled: false,
          maxDomains: 1,
        }
      });
      fetchPackages();
    } catch (err: any) {
      setPackageError(err.message || 'خطا در ارتباط با سرور.');
    } finally {
      setPackageSubmitting(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!window.confirm('آیا از حذف این پکیج اطمینان دارید؟')) return;

    try {
      const res = await fetch(`/api/super-admin/packages/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchPackages();
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در حذف پکیج');
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('خطای سرور در حذف پکیج');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError('');
    setAssignSubmitting(true);

    try {
      const res = await fetch(`/api/super-admin/shops/${selectedShopToAssign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: assignPackageId || null,
          packageExpiresAt: assignExpiresAt || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در تخصیص پکیج');
      }

      setIsAssignModalOpen(false);
      setSelectedShopToAssign(null);
      setAssignPackageId('');
      setAssignExpiresAt('');
      fetchShops();
    } catch (err: any) {
      setAssignError(err.message || 'خطا در ارتباط با سرور.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch(`/api/super-admin/system-tickets?status=${ticketStatusFilter === 'all' ? '' : ticketStatusFilter}`);
      if (res.status === 401) {
        window.location.href = '/super-admin/login';
        return;
      }
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchTicketDetail = async (ticketId: string) => {
    setLoadingTicketDetail(true);
    setReplyError('');
    setReplyMessage('');
    setFile(null);
    setFilePreview(null);
    try {
      const res = await fetch(`/api/super-admin/system-tickets/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
      }
    } catch (error) {
      console.error('Error fetching ticket detail:', error);
    } finally {
      setLoadingTicketDetail(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyMessage.trim() && !file) || !selectedTicket) return;

    setSubmittingReply(true);
    setReplyError('');
    try {
      let attachmentUrl = '';

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/media', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('خطا در آپلود فایل ضمیمه');
        }

        const uploadData = await uploadRes.json();
        attachmentUrl = uploadData.url;
      }

      const res = await fetch(`/api/super-admin/system-tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: replyMessage,
          attachmentUrl
        })
      });

      if (res.ok) {
        setReplyMessage('');
        setFile(null);
        setFilePreview(null);
        fetchTicketDetail(selectedTicket.id);
        fetchTickets();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'خطا در ارسال پاسخ');
      }
    } catch (error: any) {
      console.error('Error sending reply:', error);
      setReplyError(error.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/super-admin/system-tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setSelectedTicket({ ...selectedTicket, status });
        fetchTickets();
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const handleUpdateTicketPriority = async (priority: string) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/super-admin/system-tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      });
      if (res.ok) {
        setSelectedTicket({ ...selectedTicket, priority });
        fetchTickets();
      }
    } catch (error) {
      console.error('Error updating ticket priority:', error);
    }
  };

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/super-admin/shops/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: !currentStatus }),
      });
      fetchShops();
    } catch (error) {
      console.error('Error updating shop:', error);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/super-admin/shops/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      fetchShops();
    } catch (error) {
      console.error('Error updating shop:', error);
    }
  };

  const handleDeleteShop = async (id: string) => {
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/super-admin/shops/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در حذف فروشگاه');
      }
      setIsDeleteModalOpen(false);
      setSelectedShopToDelete(null);
      fetchShops();
    } catch (error: any) {
      console.error('Error deleting shop:', error);
      setDeleteError(error.message || 'خطای سرور در حذف فروشگاه');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleUpdateOwnerInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForDetails) return;

    setIsChangingPassword(true);
    setChangePasswordError('');
    setChangePasswordSuccess('');

    try {
      const payload: any = {};
      if (ownerNewPassword) {
        if (ownerNewPassword.length < 6) {
          setChangePasswordError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
          setIsChangingPassword(false);
          return;
        }
        payload.ownerPassword = ownerNewPassword;
      }
      
      payload.ownerPhone = ownerNewPhone;
      payload.ownerName = ownerNewName;
      payload.ownerEmail = ownerNewEmail;

      const res = await fetch(`/api/super-admin/shops/${selectedShopForDetails.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در بروزرسانی اطلاعات مالک');
      }

      setChangePasswordSuccess('اطلاعات مالک با موفقیت بروزرسانی شد.');
      setOwnerNewPassword('');
      
      // Update local state for modal
      setSelectedShopForDetails((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          owner: {
            ...prev.owner,
            phone: ownerNewPhone,
            name: ownerNewName,
            email: ownerNewEmail
          }
        };
      });

      // Refresh shops list
      fetchShops();
    } catch (error: any) {
      console.error('Error updating owner info:', error);
      setChangePasswordError(error.message || 'خطای سرور در بروزرسانی اطلاعات');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    document.cookie = "super_admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/super-admin/login');
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/super-admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShopData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطا در ایجاد فروشگاه');
      }

      setIsAddModalOpen(false);
      setNewShopData({
        shopName: '',
        subdomain: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: ''
      });
      fetchShops();
    } catch (error: any) {
      setAddError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter shops based on search query and status filter
  const filteredShops = (Array.isArray(shops) ? shops : []).filter(shop => {
    const matchesSearch = 
      shop.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.subdomain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.owner?.name && shop.owner.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (shop.owner?.email && shop.owner.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (shopFilter === 'active') return shop.isActive;
    if (shopFilter === 'inactive') return !shop.isActive;
    if (shopFilter === 'approved') return shop.isApproved;
    if (shopFilter === 'pending') return !shop.isApproved;

    return true;
  });

  // Overview Stats
  const stats = {
    totalShops: Array.isArray(shops) ? shops.length : 0,
    activeShops: Array.isArray(shops) ? shops.filter(s => s.isActive).length : 0,
    pendingShops: Array.isArray(shops) ? shops.filter(s => !s.isApproved).length : 0,
    openTickets: Array.isArray(tickets) ? tickets.filter(t => t.status !== 'closed').length : 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            جدید
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            در حال بررسی
          </span>
        );
      case 'answered':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            پاسخ داده شده
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
            بسته شده
          </span>
        );
      default:
        return <span className="text-[10px] font-bold text-gray-400">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <span className="text-[9px] font-bold text-gray-400">اولویت: پایین</span>;
      case 'normal':
        return <span className="text-[9px] font-bold text-slate-400">اولویت: عادی</span>;
      case 'high':
        return <span className="text-[9px] font-bold text-amber-600/80">اولویت: مهم</span>;
      case 'urgent':
        return <span className="text-[9px] font-bold text-red-500/90 animate-pulse">اولویت: بحرانی</span>;
      default:
        return <span className="text-[9px] font-bold text-gray-400">{priority}</span>;
    }
  };

  const getTicketCardClasses = (status: string, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-slate-50 border-r-2 border-slate-800 shadow-2xs';
    }
    return 'bg-white hover:bg-slate-50/50 border-r-2 border-transparent';
  };

  const getDashboardTicketClasses = (status: string) => {
    return 'bg-white hover:bg-slate-50/50 border border-slate-100';
  };

  const sidebarItems = [];
  const currentRole = userSession?.role || 'superadmin';

  if (currentRole === 'superadmin') {
    sidebarItems.push(
      { id: 'overview', label: 'پیشخوان', icon: LayoutDashboard },
      { id: 'shops', label: 'فروشگاه‌ها', icon: Store, badge: shops.length },
      { id: 'packages', label: 'پکیج‌های اشتراک', icon: Award, badge: packages.length > 0 ? packages.length : null },
      { id: 'tickets', label: 'تیکت‌های پشتیبانی', icon: Headphones, badge: stats.openTickets > 0 ? stats.openTickets : null },
      { id: 'collaborators', label: 'همکاران پلتفرم', icon: Users },
      { id: 'blog', label: 'وبلاگ اصلی پلتفرم', icon: FileText, isLink: true, href: '/super-admin/blog' },
      { id: 'settings', label: 'تنظیمات سیستم', icon: Settings }
    );
  } else if (currentRole === 'sales') {
    sidebarItems.push(
      { id: 'overview', label: 'پیشخوان', icon: LayoutDashboard },
      { id: 'tickets', label: 'تیکت‌های پشتیبانی', icon: Headphones, badge: stats.openTickets > 0 ? stats.openTickets : null }
    );
  } else if (currentRole === 'content_manager' || currentRole === 'seo_manager') {
    sidebarItems.push(
      { id: 'overview', label: 'پیشخوان', icon: LayoutDashboard },
      { id: 'blog', label: 'وبلاگ اصلی پلتفرم', icon: FileText, isLink: true, href: '/super-admin/blog' }
    );
  }

  if (loadingShops && activeTab === 'overview') {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 font-bold text-gray-500 gap-3" dir="rtl">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-xs">در حال بارگذاری پنل مدیریت کل...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row-reverse" dir="rtl">
      
      {/* Mobile Top Navbar */}
      <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex justify-between items-center sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-sm text-gray-800">مدیریت کل سیستم</span>
        </div>
        <button 
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-1.5 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Sidebar Overlay for Mobile */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Menu (Minimalist & Lightweight) */}
      <aside className={`
        fixed md:sticky top-0 right-0 z-50 md:z-20
        w-64 h-screen bg-white border-l border-gray-100
        flex flex-col justify-between p-5 shrink-0
        transition-transform duration-300 ease-in-out
        ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="space-y-6">
          {/* Logo / Title */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-none">پنل مدیریت کل</h1>
                <span className="text-[10px] text-gray-400 font-medium mt-1 block">سامانه فروشگاه‌ساز</span>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-1 text-gray-400 hover:bg-gray-50 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.isLink && item.href) {
                      router.push(item.href);
                    } else {
                      setActiveTab(item.id as any);
                    }
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50/70 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge !== null && (
                    <span className={`
                      px-1.5 py-0.5 rounded-full text-[9px] font-bold
                      ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-gray-50 space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-600 font-bold text-xs">
              مدیر
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-gray-800 leading-none">مدیر اصلی پلتفرم</p>
              <span className="text-[9px] text-gray-400 mt-1 block">superadmin@platform.com</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50/50 transition-colors border border-transparent"
          >
            <LogOut className="w-4 h-4 text-gray-400 hover:text-red-500" />
            <span>خروج از حساب</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen flex flex-col overflow-hidden">
        
        {/* Desktop Header */}
        <header className="hidden md:flex justify-between items-center px-8 py-4 bg-white border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-800">
              {activeTab === 'overview' && 'داشبورد پیشخوان'}
              {activeTab === 'shops' && 'مدیریت و نظارت بر فروشگاه‌ها'}
              {activeTab === 'packages' && 'تعریف و طراحی پکیج‌های اشتراک'}
              {activeTab === 'tickets' && 'پشتیبانی و تیکت‌های سیستمی'}
              {activeTab === 'settings' && 'تنظیمات سیستم'}
              {activeTab === 'collaborators' && 'همکاران پلتفرم'}
            </h2>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {activeTab === 'overview' && 'خلاصه وضعیت کلی سیستم و فروشگاه‌های فعال'}
              {activeTab === 'shops' && 'ایجاد، تایید، غیرفعال‌سازی و جستجوی فروشگاه‌ها'}
              {activeTab === 'packages' && 'ایجاد، ویرایش، حذف و مدیریت پکیج‌های اشتراک فروشگاهی'}
              {activeTab === 'tickets' && 'پاسخگویی به تیکت‌های ارسالی از سمت ادمین‌های فروشگاه‌ها'}
              {activeTab === 'settings' && 'مدیریت کلیدهای API و ارتباط با پلتفرم‌های جانبی'}
              {activeTab === 'collaborators' && 'مدیریت و نظارت بر دسترسی همکاران پلتفرم'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-left">
              <span className="text-[10px] text-gray-400 font-bold block">امروز</span>
              <span className="text-xs font-bold text-gray-700 mt-0.5 block flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {new Date().toLocaleDateString('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="w-px h-8 bg-gray-100" />
            <button 
              onClick={() => {
                fetchShops();
                fetchTickets();
                fetchPackages();
              }}
              className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl transition-colors text-gray-500"
              title="بروزرسانی داده‌ها"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          
          {/* ==================== 1. OVERVIEW TAB ==================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Stat 1 */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block">کل فروشگاه‌ها</span>
                    <span className="text-2xl font-black text-gray-900 block">{stats.totalShops}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100/50">
                    <Store className="w-5 h-5 text-blue-600" />
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block">فروشگاه‌های فعال</span>
                    <span className="text-2xl font-black text-green-600 block">{stats.activeShops}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center border border-green-100/50">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block">در انتظار تایید</span>
                    <span className="text-2xl font-black text-amber-600 block">{stats.pendingShops}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100/50">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold block">تیکت‌های باز پشتیبانی</span>
                    <span className="text-2xl font-black text-indigo-600 block">{stats.openTickets}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
                    <Headphones className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>

              </div>

              {/* Visual Widgets Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Recent Shops */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4.5 h-4.5 text-blue-600" />
                      <h3 className="text-xs font-bold text-gray-800">آخرین فروشگاه‌های ثبت شده</h3>
                    </div>
                    <button 
                      onClick={() => setActiveTab('shops')}
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>مشاهده همه</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {shops.slice(0, 5).map((shop) => (
                      <div key={shop.id} className="py-3 flex items-center justify-between hover:bg-gray-50/30 px-1 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">
                            {shop.shopName?.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-800 block">{shop.shopName}</span>
                            <span className="text-[9px] text-gray-400 font-medium dir-ltr text-right mt-0.5 block">
                              {shop.subdomain}.localhost
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-left hidden sm:block">
                            <span className="text-[10px] text-gray-800 font-bold block">{shop.owner?.name || 'بدون مالک'}</span>
                            <span className="text-[9px] text-gray-400 mt-0.5 block">{shop.owner?.email}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${shop.isActive ? 'bg-green-50 text-green-600 border border-green-100/50' : 'bg-red-50 text-red-600 border border-red-100/50'}`}>
                            {shop.isActive ? 'فعال' : 'غیرفعال'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {shops.length === 0 && (
                      <div className="py-8 text-center text-gray-400 text-xs font-bold">هیچ فروشگاهی ثبت نشده است.</div>
                    )}
                  </div>
                </div>

                {/* Right Column: Recent Tickets & Status Breakdown */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4.5 h-4.5 text-indigo-600" />
                      <h3 className="text-xs font-bold text-gray-800">تیکت‌های اخیر</h3>
                    </div>
                    <button 
                      onClick={() => setActiveTab('tickets')}
                      className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>پاسخگویی</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {tickets.slice(0, 4).map((ticket) => (
                      <div 
                        key={ticket.id} 
                        onClick={() => {
                          setActiveTab('tickets');
                          fetchTicketDetail(ticket.id);
                        }}
                        className={`p-3 rounded-xl cursor-pointer transition-all flex flex-col gap-2 ${getDashboardTicketClasses(ticket.status)}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold text-gray-800 truncate flex-1">{ticket.subject}</span>
                          <span className="shrink-0">{getPriorityBadge(ticket.priority)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold">
                          <span>فروشگاه: {ticket.shop?.shopName}</span>
                          <span>{getStatusBadge(ticket.status)}</span>
                        </div>
                      </div>
                    ))}
                    {tickets.length === 0 && (
                      <div className="py-8 text-center text-gray-400 text-xs font-bold">تیکت پشتیبانی وجود ندارد.</div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==================== 2. SHOPS TAB ==================== */}
          {activeTab === 'shops' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
              
              {/* Table Header & Controls */}
              <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center shrink-0">
                
                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="جستجوی فروشگاه (نام، ساب‌دامین، ایمیل مالک...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Filter Select */}
                  <div className="relative shrink-0">
                    <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <select
                      value={shopFilter}
                      onChange={(e) => setShopFilter(e.target.value as any)}
                      className="pr-9 pl-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="all">همه وضعیت‌ها</option>
                      <option value="active">فعال</option>
                      <option value="inactive">غیرفعال</option>
                      <option value="approved">تایید شده</option>
                      <option value="pending">در انتظار تایید</option>
                    </select>
                  </div>
                </div>

                {/* Add Shop Button */}
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  افزودن فروشگاه جدید
                </button>
              </div>

              {/* Shops Table */}
              <div className="overflow-x-auto">
                {loadingShops ? (
                  <div className="p-12 text-center text-gray-400 text-xs font-bold flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    <span>در حال دریافت لیست فروشگاه‌ها...</span>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-100 text-right text-xs font-bold">
                    <thead className="bg-gray-50/50 text-gray-400">
                      <tr>
                        <th scope="col" className="px-6 py-4 font-bold">نام فروشگاه</th>
                        <th scope="col" className="px-6 py-4 font-bold">آدرس (ساب‌دامین)</th>
                        <th scope="col" className="px-6 py-4 font-bold">مالک فروشگاه</th>
                        <th scope="col" className="px-6 py-4 font-bold">شماره تماس</th>
                        <th scope="col" className="px-6 py-4 font-bold text-center">پکیج اشتراک</th>
                        <th scope="col" className="px-6 py-4 font-bold text-center">وضعیت تایید</th>
                        <th scope="col" className="px-6 py-4 font-bold text-center">وضعیت فعالیت</th>
                        <th scope="col" className="px-6 py-4 font-bold text-left">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                      {filteredShops.map((shop) => (
                        <tr key={shop.id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-bold text-gray-900">{shop.shopName}</div>
                            <div className="text-[9px] text-gray-400 mt-1 font-medium">{shop.shopId}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a 
                              href={shop.customDomain ? `https://${shop.customDomain}` : `http://${shop.subdomain}${baseDomainSuffix}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 dir-ltr"
                            >
                              <span>{shop.customDomain || `${shop.subdomain}${baseDomainSuffix}`}</span>
                              <ExternalLink className="w-3 h-3 text-blue-400" />
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs text-gray-800">{shop.owner?.name || 'نامشخص'}</div>
                            <div className="text-[10px] text-gray-400 font-medium mt-0.5">{shop.owner?.email || 'نامشخص'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {shop.owner?.phone && (
                              <div className="text-xs text-gray-800 dir-ltr text-right">مالک: {shop.owner.phone}</div>
                            )}
                            {shop.contactPhone && (
                              <div className="text-[10px] text-gray-400 font-medium mt-0.5 dir-ltr text-right">فروشگاه: {shop.contactPhone}</div>
                            )}
                            {!shop.owner?.phone && !shop.contactPhone && (
                              <span className="text-[10px] text-gray-400 font-bold">ثبت نشده</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {shop.package ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                                  {shop.package.name}
                                </span>
                                {shop.packageExpiresAt && (
                                  <span className={`text-[9px] font-bold ${new Date(shop.packageExpiresAt) < new Date() ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                                    {new Date(shop.packageExpiresAt) < new Date() ? 'منقضی شده' : `تا ${new Date(shop.packageExpiresAt).toLocaleDateString('fa-IR')}`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-bold">بدون پکیج</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2.5 py-1 inline-flex text-[10px] font-bold rounded-full ${shop.isApproved ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                              {shop.isApproved ? 'تایید شده' : 'در انتظار تایید'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2.5 py-1 inline-flex text-[10px] font-bold rounded-full ${shop.isActive ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                              {shop.isActive ? 'فعال' : 'غیرفعال'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold flex gap-3 justify-end items-center">
                            <button
                              onClick={() => {
                                setSelectedShopForDetails(shop);
                                setChangePasswordSuccess('');
                                setChangePasswordError('');
                                setOwnerNewPassword('');
                                setOwnerNewPhone(shop.owner?.phone || '');
                                setOwnerNewName(shop.owner?.name || '');
                                setOwnerNewEmail(shop.owner?.email || '');
                                setIsDetailModalOpen(true);
                              }}
                              className="flex items-center text-[10px] py-1 px-2.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50/30 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 ml-1" />
                              جزئیات
                            </button>
                            <button
                              onClick={() => {
                                setSelectedShopToAssign(shop);
                                setAssignPackageId(shop.packageId || '');
                                setAssignExpiresAt(shop.packageExpiresAt ? new Date(shop.packageExpiresAt).toISOString().split('T')[0] : '');
                                setIsAssignModalOpen(true);
                              }}
                              className="flex items-center text-[10px] py-1 px-2.5 rounded-lg border border-purple-200 text-purple-600 bg-purple-50/30 hover:bg-purple-50 transition-colors cursor-pointer"
                            >
                              <Gift className="w-3.5 h-3.5 ml-1" />
                              تغییر پکیج
                            </button>
                            <button
                              onClick={() => toggleApproval(shop.id, shop.isApproved)}
                              className={`flex items-center text-[10px] py-1 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                                shop.isApproved 
                                  ? 'text-amber-600 bg-amber-50/30 border-amber-100 hover:bg-amber-50' 
                                  : 'text-green-600 bg-green-50/30 border-green-100 hover:bg-green-50'
                              }`}
                            >
                              {shop.isApproved ? <XCircle className="w-3.5 h-3.5 ml-1" /> : <CheckCircle className="w-3.5 h-3.5 ml-1" />}
                              {shop.isApproved ? 'لغو تایید' : 'تایید'}
                            </button>
                            <button
                              onClick={() => toggleActive(shop.id, shop.isActive)}
                              className={`flex items-center text-[10px] py-1 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                                shop.isActive 
                                  ? 'text-red-600 bg-red-50/30 border-red-100 hover:bg-red-50' 
                                  : 'text-green-600 bg-green-50/30 border-green-100 hover:bg-green-50'
                              }`}
                            >
                              {shop.isActive ? <PowerOff className="w-3.5 h-3.5 ml-1" /> : <Power className="w-3.5 h-3.5 ml-1" />}
                              {shop.isActive ? 'غیرفعال' : 'فعال'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedShopToDelete(shop);
                                setDeleteError('');
                                setIsDeleteModalOpen(true);
                              }}
                              className="flex items-center text-[10px] py-1 px-2.5 rounded-lg border border-red-200 text-red-600 bg-red-50/30 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 ml-1" />
                              حذف
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredShops.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-bold">
                            هیچ فروشگاهی با شرایط فیلتر شده یافت نشد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ==================== 3. PACKAGES TAB ==================== */}
          {activeTab === 'packages' && (
            <div className="space-y-6">
              {/* Header section with add button */}
              <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div>
                  <h3 className="text-xs font-bold text-gray-800">طراحی و مدیریت پکیج‌های اشتراک</h3>
                  <p className="text-[10px] text-gray-400 mt-1">با تعریف پکیج‌ها، دسترسی مالکان فروشگاه‌ها را به امکانات سیستم محدود یا آزاد کنید.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingPackage(null);
                    setPackageData({
                      name: '',
                      months: 1,
                      price: 0,
                      features: {
                        physicalProducts: true,
                        digitalProducts: false,
                        specialDeals: false,
                        relatedProducts: false,
                        zarinpal: false,
                        zibal: false,
                        cardToCard: false,
                        tipax: false,
                        productSets: false,
                        customerClub: false,
                        seoTools: false,
                        aiSeoEnabled: false,
                        aiArticleEnabled: false,
                        aiFaqsEnabled: false,
                        aiAgentEnabled: false,
                        aiRequestsLimit: 0,
                        maxProducts: 0,
                        bgRemovalEnabled: false,
                        bgRemovalLimit: 0,
                        staffEnabled: false,
                        maxStaff: 0,
                        onlineChatEnabled: false,
                        customDomainEnabled: false,
                        maxDomains: 1,
                      }
                    });
                    setIsPackageModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  تعریف پکیج جدید
                </button>
              </div>

              {/* Packages Grid */}
              {loadingPackages ? (
                <div className="p-12 text-center text-gray-400 text-xs font-bold flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  <span>در حال دریافت لیست پکیج‌ها...</span>
                </div>
              ) : packages.length === 0 ? (
                <div className="bg-white p-12 text-center text-gray-400 rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center gap-3">
                  <Award className="w-12 h-12 text-gray-200" />
                  <span className="text-xs font-bold">هیچ پکیجی تعریف نشده است.</span>
                  <p className="text-[10px] text-gray-400">اولین پکیج را با استفاده از دکمه بالا بسازید تا بتوانید روی فروشگاه‌ها اعمال کنید.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packages.map((pkg) => {
                    let features: any = {};
                    try {
                      features = JSON.parse(pkg.features);
                    } catch (e) {
                      console.error(e);
                    }
                    return (
                      <div key={pkg.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
                        {/* Card Header */}
                        <div className="p-5 border-b border-gray-50 bg-gray-50/20">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-black text-gray-900 text-sm">{pkg.name}</h4>
                              <span className="text-[10px] text-gray-400 mt-1 block">اعتبار: {pkg.months} ماه</span>
                            </div>
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-50 text-blue-600 border border-blue-100">
                              {pkg.price.toLocaleString('fa-IR')} تومان
                            </span>
                          </div>
                        </div>

                        {/* Card Features list */}
                        <div className="p-5 flex-1 space-y-3">
                          <span className="text-[10px] text-gray-400 font-bold block mb-2">قابلیت‌های پکیج:</span>
                          
                          <div className="grid grid-cols-1 gap-2.5">
                            <div className="flex items-center justify-between py-1 border-b border-blue-500/10 bg-blue-500/[0.02] px-2 rounded-lg mb-1">
                              <span className="text-[11px] text-blue-700 dark:text-blue-400 font-black">محدودیت تعداد محصولات</span>
                              <span className="text-[11px] font-black text-blue-800 dark:text-blue-300">
                                {features.maxProducts && features.maxProducts > 0 
                                  ? `${features.maxProducts.toLocaleString('fa-IR')} کالا` 
                                  : 'نامحدود'}
                              </span>
                            </div>

                            {features.bgRemovalEnabled && (
                              <div className="flex items-center justify-between py-1 border-b border-indigo-500/10 bg-indigo-500/[0.02] px-2 rounded-lg mb-1">
                                <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-black">سهمیه حذف پس‌زمینه</span>
                                <span className="text-[11px] font-black text-indigo-800 dark:text-indigo-300">
                                  {features.bgRemovalLimit && features.bgRemovalLimit > 0 
                                    ? `${features.bgRemovalLimit.toLocaleString('fa-IR')} تصویر` 
                                    : 'نامحدود'}
                                </span>
                              </div>
                            )}

                            {features.staffEnabled && (
                              <div className="flex items-center justify-between py-1 border-b border-purple-500/10 bg-purple-500/[0.02] px-2 rounded-lg mb-1">
                                <span className="text-[11px] text-purple-700 dark:text-purple-400 font-black">محدودیت تعداد همکار</span>
                                <span className="text-[11px] font-black text-purple-800 dark:text-purple-300">
                                  {features.maxStaff && features.maxStaff > 0 
                                    ? `${features.maxStaff.toLocaleString('fa-IR')} همکار` 
                                    : 'نامحدود'}
                                </span>
                              </div>
                            )}

                            {features.aiAgentEnabled && (
                              <div className="flex items-center justify-between py-1 border-b border-rose-500/10 bg-rose-500/[0.02] px-2 rounded-lg mb-1">
                                <span className="text-[11px] text-rose-700 dark:text-rose-400 font-black">سهمیه ماهانه دستیار هوشمند</span>
                                <span className="text-[11px] font-black text-rose-800 dark:text-rose-300">
                                  {features.aiRequestsLimit && features.aiRequestsLimit > 0 
                                    ? `${features.aiRequestsLimit.toLocaleString('fa-IR')} درخواست` 
                                    : 'نامحدود'}
                                </span>
                              </div>
                            )}

                            {features.customDomainEnabled && (
                              <div className="flex items-center justify-between py-1 border-b border-emerald-500/10 bg-emerald-500/[0.02] px-2 rounded-lg mb-1">
                                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-black">تعداد دامنه‌های مجاز</span>
                                <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300">
                                  {features.maxDomains && features.maxDomains > 0 
                                    ? `${features.maxDomains.toLocaleString('fa-IR')} دامنه` 
                                    : 'نامحدود'}
                                </span>
                              </div>
                            )}

                            {[
                              { key: 'physicalProducts', label: 'محصولات فیزیکی' },
                              { key: 'digitalProducts', label: 'محصولات دانلودی (فایل)' },
                              { key: 'specialDeals', label: 'تخفیف شگفت‌انگیز و پیشنهاد ویژه' },
                              { key: 'relatedProducts', label: 'محصولات مرتبط هوشمند' },
                              { key: 'zarinpal', label: 'درگاه آنلاین زرین‌پال' },
                              { key: 'zibal', label: 'درگاه آنلاین زیبال' },
                              { key: 'cardToCard', label: 'پرداخت کارت به کارت' },
                              { key: 'tipax', label: 'ارسال تیپاکس (API)' },
                              { key: 'productSets', label: 'ست محصول و گالری تعاملی' },
                              { key: 'customerClub', label: 'باشگاه مشتریان و سیستم وفاداری' },
                              { key: 'seoTools', label: 'تنظیمات سئو (Sitemap/Robots)' },
                              { key: 'aiSeoEnabled', label: 'تولید سئو با هوش مصنوعی' },
                              { key: 'aiArticleEnabled', label: 'تولید مقاله سئو با هوش مصنوعی' },
                              { key: 'aiFaqsEnabled', label: 'تولید سوالات متداول با هوش مصنوعی' },
                              { key: 'aiAgentEnabled', label: 'دستیار هوشمند ادمین (AI Agent)' },
                              { key: 'bgRemovalEnabled', label: 'حذف پس‌زمینه با هوش مصنوعی' },
                              { key: 'staffEnabled', label: 'مدیریت همکاران' },
                              { key: 'customDomainEnabled', label: 'اتصال دامنه اختصاصی' },
                            ].map((feat) => {
                              const isEnabled = !!features[feat.key];
                              return (
                                <div key={feat.key} className="flex items-center justify-between py-0.5 border-b border-gray-50/50">
                                  <span className="text-[11px] text-gray-600 font-medium">{feat.label}</span>
                                  {isEnabled ? (
                                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-gray-300 shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="p-4 border-t border-gray-50 bg-gray-50/10 flex gap-3">
                          <button
                            onClick={() => {
                              setEditingPackage(pkg);
                              setPackageData({
                                name: pkg.name,
                                months: pkg.months,
                                price: pkg.price,
                                features: {
                                  physicalProducts: true,
                                  digitalProducts: false,
                                  specialDeals: false,
                                  relatedProducts: false,
                                  zarinpal: false,
                                  zibal: false,
                                  cardToCard: false,
                                  tipax: false,
                                  productSets: false,
                                  customerClub: false,
                                  seoTools: false,
                                  aiSeoEnabled: false,
                                  aiArticleEnabled: false,
                                  aiFaqsEnabled: false,
                                  aiAgentEnabled: false,
                                  aiRequestsLimit: 0,
                                  maxProducts: 0,
                                  bgRemovalEnabled: false,
                                  bgRemovalLimit: 0,
                                  staffEnabled: false,
                                  maxStaff: 0,
                                  customDomainEnabled: false,
                                  maxDomains: 1,
                                  ...features
                                }
                              });
                              setIsPackageModalOpen(true);
                            }}
                            className="flex-1 py-2 text-center text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-all cursor-pointer"
                          >
                            ویرایش پکیج
                          </button>
                          <button
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="flex-1 py-2 text-center text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 rounded-xl transition-all cursor-pointer"
                          >
                            حذف پکیج
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== 4. TICKETS TAB ==================== */}
          {activeTab === 'tickets' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)] overflow-hidden">
              
              {/* Left Column: Tickets List */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col overflow-hidden h-full lg:col-span-1">
                {/* Header & Filter */}
                <div className="p-4 border-b border-gray-100 space-y-3 shrink-0 bg-gray-50/30">
                  <h3 className="text-xs font-bold text-gray-800">تیکت‌های پشتیبانی</h3>
                  <select
                    value={ticketStatusFilter}
                    onChange={(e) => {
                      setTicketStatusFilter(e.target.value);
                      setSelectedTicket(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl outline-none text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="all">همه تیکت‌ها</option>
                    <option value="new">جدید / پاسخ‌نداده</option>
                    <option value="in_progress">در حال بررسی</option>
                    <option value="answered">پاسخ داده شده</option>
                    <option value="closed">بسته شده</option>
                  </select>
                </div>

                {/* Tickets List */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                  {loadingTickets ? (
                    <div className="p-8 text-center text-gray-400 text-xs font-bold flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                      <span>در حال بارگذاری...</span>
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs font-bold">هیچ تیکتی یافت نشد.</div>
                  ) : (
                    tickets.map((ticket) => {
                      const isSelected = selectedTicket?.id === ticket.id;
                      return (
                        <button
                          key={ticket.id}
                          onClick={() => fetchTicketDetail(ticket.id)}
                          className={`w-full p-4 text-right flex flex-col gap-2 transition-all cursor-pointer ${getTicketCardClasses(ticket.status, isSelected)}`}
                        >
                          <div className="flex justify-between items-start w-full gap-2">
                            <span className="font-bold text-gray-800 text-xs truncate flex-1">{ticket.subject}</span>
                            <span className="shrink-0">{getPriorityBadge(ticket.priority)}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-600">{ticket.shop?.shopName || 'فروشگاه ناشناس'}</span>
                            <span className="text-gray-300">|</span>
                            <span className="dir-ltr text-left font-medium">{ticket.shop?.subdomain}.localhost</span>
                          </div>
                          <p className="text-[11px] text-gray-400 line-clamp-1 font-medium">{ticket.description}</p>
                          <div className="flex justify-between items-center w-full mt-1">
                            <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(ticket.createdAt).toLocaleDateString('fa-IR')}
                            </span>
                            <span>{getStatusBadge(ticket.status)}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Chat View */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col overflow-hidden h-full lg:col-span-2">
                {selectedTicket ? (
                  <>
                    {/* Chat Header with Controls */}
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 bg-gray-50/30">
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs">{selectedTicket.subject}</h4>
                        <div className="text-[10px] text-gray-400 font-bold mt-1.5 flex items-center gap-2">
                          <span>فروشگاه: {selectedTicket.shop?.shopName}</span>
                          <span className="text-gray-300">•</span>
                          <span>کد تیکت: #{selectedTicket.id.slice(-8).toUpperCase()}</span>
                        </div>
                      </div>
                      
                      {/* Controls */}
                      <div className="flex items-center gap-2">
                        <div>
                          <select
                            value={selectedTicket.priority}
                            onChange={(e) => handleUpdateTicketPriority(e.target.value)}
                            className="px-2 py-1.5 border border-gray-200 bg-white rounded-lg text-[10px] font-bold text-gray-600 outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="low">اولویت: پایین</option>
                            <option value="normal">اولویت: عادی</option>
                            <option value="high">اولویت: مهم</option>
                            <option value="urgent">اولویت: بحرانی</option>
                          </select>
                        </div>
                        <div>
                          <select
                            value={selectedTicket.status}
                            onChange={(e) => handleUpdateTicketStatus(e.target.value)}
                            className="px-2 py-1.5 border border-gray-200 bg-white rounded-lg text-[10px] font-bold text-gray-600 outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="new">وضعیت: جدید</option>
                            <option value="in_progress">وضعیت: بررسی</option>
                            <option value="answered">وضعیت: پاسخ داده</option>
                            <option value="closed">وضعیت: بسته</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Messages List */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/20 custom-scrollbar">
                      
                      {/* Original Ticket Description as First Message */}
                      <div className="flex gap-3 max-w-[80%] ml-auto">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                          <Store size={14} />
                        </div>
                        <div className="space-y-1">
                          <div className="px-4 py-2.5 rounded-2xl text-xs font-bold leading-relaxed bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-xs">
                            <p className="font-black text-gray-900 mb-1 border-b border-gray-50 pb-1">توضیحات تیکت:</p>
                            {selectedTicket.description}
                            {selectedTicket.attachmentUrl && (
                              <div className="mt-2 rounded-xl overflow-hidden border border-gray-100 max-w-[200px]">
                                <a href={selectedTicket.attachmentUrl} target="_blank" rel="noreferrer">
                                  <img src={selectedTicket.attachmentUrl} alt="Attachment" className="w-full h-auto object-cover hover:scale-105 transition-all" />
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="text-[9px] text-gray-400 font-bold px-1 text-right">
                            {new Date(selectedTicket.createdAt).toLocaleDateString('fa-IR')} {new Date(selectedTicket.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {/* Conversation Messages */}
                      {selectedTicket.messages?.map((msg: any) => {
                        const isSuperAdmin = msg.senderRole === 'superadmin';
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex gap-3 max-w-[80%] ${isSuperAdmin ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
                          >
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold select-none ${
                              isSuperAdmin 
                                ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                            }`}>
                              {isSuperAdmin ? <Shield size={14} /> : <User size={14} />}
                            </div>

                            {/* Message Bubble */}
                            <div className="space-y-1">
                              <div className={`px-4 py-2.5 rounded-2xl text-xs font-bold leading-relaxed whitespace-pre-wrap break-words ${
                                isSuperAdmin 
                                  ? 'bg-blue-600 text-white rounded-tr-none' 
                                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-xs'
                              }`}>
                                {msg.message}
                                {msg.attachmentUrl && (
                                  <div className="mt-2 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-w-[200px]">
                                    <a href={msg.attachmentUrl} target="_blank" rel="noreferrer">
                                      <img src={msg.attachmentUrl} alt="Attachment" className="w-full h-auto object-cover hover:scale-105 transition-all" />
                                    </a>
                                  </div>
                                )}
                              </div>
                              <div className={`text-[9px] text-gray-400 font-bold px-1 ${isSuperAdmin ? 'text-left' : 'text-right'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Input */}
                    <div className="p-4 border-t border-gray-100 bg-white shrink-0 space-y-3">
                      {filePreview && (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-xs">
                          <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={removeFile} 
                            className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full transition-all"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      <form onSubmit={handleSendReply} className="relative flex items-center gap-2">
                        <label className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl cursor-pointer transition-all text-gray-500 shrink-0">
                          <Paperclip size={16} />
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            className="hidden" 
                          />
                        </label>
                        <input 
                          type="text"
                          placeholder="پاسخ به تیکت فروشگاه..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          disabled={submittingReply}
                          className="flex-1 pl-12 pr-4 py-3 border border-gray-200 bg-gray-50 rounded-xl outline-none text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all"
                        />
                        <button 
                          type="submit"
                          disabled={submittingReply || (!replyMessage.trim() && !file)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-all shadow-xs cursor-pointer"
                        >
                          {submittingReply ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          ) : (
                            <Send size={14} className="rotate-180" />
                          )}
                        </button>
                      </form>
                      {replyError && (
                        <div className="mt-2 text-[10px] text-red-600 font-bold flex items-center gap-1">
                          <AlertCircle size={12} />
                          <span>{replyError}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                    <Headphones className="w-12 h-12 text-gray-200" />
                    <span className="font-bold text-xs">یک تیکت را برای مشاهده گفتگو انتخاب کنید.</span>
                    <span className="text-[10px] font-medium">پاسخ‌های شما مستقیما به پنل ادمین فروشگاه ارسال خواهد شد.</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ==================== 6. COLLABORATORS TAB ==================== */}
          {activeTab === 'collaborators' && (
            <CollaboratorsTab />
          )}

          {/* ==================== 5. SETTINGS TAB ==================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-xs font-bold text-gray-800">تنظیمات سیستم</h3>
                    <p className="text-[10px] text-gray-400 mt-1">مدیریت کلیدهای API و ارتباط با پلتفرم‌های جانبی به صورت متمرکز و ایمن.</p>
                  </div>

                  {/* Sub Tabs Navigation */}
                  <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100/50 self-start md:self-auto flex-wrap gap-1">
                    {[
                      { id: 'api_keys', label: 'کلیدهای API سیستم', icon: Key },
                      { id: 'central_bale', label: 'مدیریت ربات بله', icon: MessageSquare },
                      { id: 'central_telegram', label: 'مدیریت ربات تلگرام', icon: Send },
                      { id: 'base_prompts', label: 'پرامپت‌های پایه سئو', icon: FileText },
                      { id: 'advanced_prompts', label: 'پرامپت‌های پیشرفته سئو', icon: Sparkles },
                      { id: 'article_prompts', label: 'پرامپت مقاله سئو', icon: Edit3 },
                      { id: 'faq_prompts', label: 'پرامپت سوالات متداول', icon: HelpCircle },
                      { id: 'security_settings', label: 'تنظیمات امنیت بالا', icon: Shield },
                      { id: 'change_password', label: 'تغییر رمز عبور', icon: Lock },
                    ].map((subTab) => {
                      const Icon = subTab.icon;
                      const isActive = activeSettingsTab === subTab.id;
                      return (
                        <button
                          key={subTab.id}
                          type="button"
                          onClick={() => setActiveSettingsTab(subTab.id as any)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-white text-blue-600 shadow-xs border border-gray-100'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span>{subTab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeSettingsTab !== 'change_password' ? (
                  <form onSubmit={handleSaveSettings} className="space-y-5 max-w-2xl text-right">
                    {settingsMessage && (
                    <div className="bg-green-50 text-green-700 p-3.5 rounded-xl text-xs font-bold border border-green-100 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{settingsMessage}</span>
                    </div>
                  )}

                  {settingsError && (
                    <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span>{settingsError}</span>
                    </div>
                  )}

                  {/* SUB TAB 1: API KEYS */}
                  {activeSettingsTab === 'api_keys' && (
                    <div className="space-y-5 animate-fadeIn">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">کلید وبسایت Poof.bg (Poof API Key)</label>
                        <input
                          type="password"
                          required
                          value={poofApiKey}
                          onChange={(e) => setPoofApiKey(e.target.value)}
                          placeholder="YOUR_POOF_API_KEY"
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                          dir="ltr"
                        />
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed pt-1.5">
                          این کلید برای فراخوانی هوش مصنوعی حذف پس‌زمینه تصاویر استفاده می‌شود. جهت دریافت کلید، می‌توانید در وبسایت{' '}
                          <a href="https://poof.bg" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            Poof.bg
                          </a>{' '}
                          ثبت‌نام کرده و از بخش داشبورد کلید API دریافت نمایید. کلید شما کاملاً امن بوده و فقط در سرور پردازش می‌شود.
                        </p>

                        {accountInfo && (
                          <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3 text-right">
                            <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-blue-600" />
                              وضعیت حساب Poof.bg و اعتبار باقیمانده
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div className="bg-white p-3 rounded-lg border border-blue-100/50">
                                <span className="text-gray-500 block text-[10px] mb-1">پلن اشتراک فعلی</span>
                                <span className="font-bold text-gray-800">{accountInfo.plan}</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-blue-100/50">
                                <span className="text-gray-500 block text-[10px] mb-1">کریدیت باقیمانده (باقیمانده / کل)</span>
                                <div className="flex items-center gap-1 dir-ltr justify-end">
                                  <span className="font-bold text-blue-600">{accountInfo.remainingCredits.toLocaleString()}</span>
                                  <span className="text-gray-400">/</span>
                                  <span className="text-gray-500">{accountInfo.maxCredits.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="w-full bg-blue-100/50 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-blue-600 h-full transition-all duration-500" 
                                  style={{ width: `${Math.max(2, Math.min(100, (accountInfo.remainingCredits / accountInfo.maxCredits) * 100))}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[9px] text-gray-400">
                                <span>{(accountInfo.remainingCredits / accountInfo.maxCredits * 100).toFixed(1)}% باقیمانده</span>
                                <span>{accountInfo.usedCredits.toLocaleString()} مصرف شده</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-gray-100" />

                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          تنظیمات عمومی هوش مصنوعی (AI Configuration)
                        </h4>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1">وضعیت هوش مصنوعی سیستم</label>
                            <div className="flex items-center gap-3 h-[42px]">
                              <button
                                type="button"
                                onClick={() => setAiEnabled(!aiEnabled)}
                                className={`flex items-center justify-between px-4 py-2.5 w-full rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                  aiEnabled
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : 'bg-red-50 border-red-200 text-red-600'
                                }`}
                              >
                                <span>{aiEnabled ? 'فعال و در دسترس فروشگاه‌ها' : 'غیرفعال و مسدود شده'}</span>
                                <div className={`w-2.5 h-2.5 rounded-full ${aiEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <hr className="border-gray-100" />

                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          تنظیمات هوش مصنوعی OpenRouter
                        </h4>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">کلید API وبسایت OpenRouter (OpenRouter API Key)</label>
                          <input
                            type="password"
                            value={openrouterApiKey}
                            onChange={(e) => setOpenrouterApiKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                            dir="ltr"
                          />
                          <p className="text-[10px] text-gray-500 font-bold leading-relaxed pt-1.5">
                            این کلید برای استفاده از هوش مصنوعی OpenRouter جهت تولید خودکار سئو محصولات استفاده می‌شود. برای دریافت کلید، به وبسایت{' '}
                            <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              OpenRouter
                            </a>{' '}
                            مراجعه نمایید.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">مدل هوش مصنوعی (AI Model)</label>
                          <input
                            type="text"
                            value={openrouterModel}
                            onChange={(e) => setOpenrouterModel(e.target.value)}
                            placeholder="google/gemini-2.5-flash"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                            dir="ltr"
                          />
                          <p className="text-[10px] text-gray-500 font-bold leading-relaxed pt-1.5">
                            شناسه مدل موردنظر را وارد کنید. پیشنهاد می‌شود از مدل‌های اقتصادی و باکیفیت مانند{' '}
                            <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[9px] font-mono">google/gemini-2.5-flash</code>{' '}
                            یا{' '}
                            <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[9px] font-mono">openai/gpt-4o-mini</code>{' '}
                            یا{' '}
                            <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[9px] font-mono">meta-llama/llama-3-8b-instruct:free</code>{' '}
                            استفاده نمایید.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">مدل هوش مصنوعی دستیار محصول (AI Product Assistant Model)</label>
                          <input
                            type="text"
                            value={openrouterControlModel}
                            onChange={(e) => setOpenrouterControlModel(e.target.value)}
                            placeholder="google/gemini-2.5-flash"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                            dir="ltr"
                          />
                          <p className="text-[10px] text-gray-500 font-bold leading-relaxed pt-1.5">
                            شناسه مدل موردنظر را برای بخش <strong className="text-purple-600">دستیار هوشمند محصول (کنترل با پرامپت)</strong> وارد کنید. در صورت خالی گذاشتن، سیستم از مدل اصلی عمومی بالا استفاده خواهد کرد. پیشنهاد می‌شود برای پردازش دستورات پیچیده از مدل‌های هوشمندتر مانند{' '}
                            <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[9px] font-mono">google/gemini-1.5-pro</code>{' '}
                            یا{' '}
                            <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[9px] font-mono">openai/gpt-4o</code>{' '}
                            استفاده نمایید.
                          </p>
                        </div>

                        <div className="border-t border-gray-100 my-4 pt-4"></div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                            تنظیمات پیشرفته مدل‌های هوش مصنوعی (Model-Agnostic)
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل Router (Intent)</label>
                              <input
                                type="text"
                                value={aiModelRouter}
                                onChange={(e) => setAiModelRouter(e.target.value)}
                                placeholder="google/gemini-2.5-flash-lite-preview-06-17"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                تشخیص نوع درخواست و مسیریابی (باید ارزان‌ترین مدل باشد).
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل عملیات ساده</label>
                              <input
                                type="text"
                                value={aiModelSimple}
                                onChange={(e) => setAiModelSimple(e.target.value)}
                                placeholder="google/gemini-2.5-flash"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                برای ۸۰٪ درخواست‌های ساده (قیمت، موجودی، تنظیمات).
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل تحلیل پیچیده</label>
                              <input
                                type="text"
                                value={aiModelComplex}
                                onChange={(e) => setAiModelComplex(e.target.value)}
                                placeholder="anthropic/claude-sonnet-4.6"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                برای تحلیل، گزارش‌گیری و ترکیب داده‌ها.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل تولید محتوا</label>
                              <input
                                type="text"
                                value={aiModelContent}
                                onChange={(e) => setAiModelContent(e.target.value)}
                                placeholder="anthropic/claude-sonnet-4.6"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                برای نوشتن بلاگ، توضیحات محصول و استوری‌ها با لحن فارسی روان.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل چت مشتری</label>
                              <input
                                type="text"
                                value={aiModelChat}
                                onChange={(e) => setAiModelChat(e.target.value)}
                                placeholder="google/gemini-2.5-flash"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                پاسخ‌گویی به خریداران در چت آنلاین فروشگاه.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل فروش عمده B2B</label>
                              <input
                                type="text"
                                value={aiModelWholesale}
                                onChange={(e) => setAiModelWholesale(e.target.value)}
                                placeholder="anthropic/claude-sonnet-4.6"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                برای محاسبات قیمت پله‌ای، MOQ و اعتبارسنجی عمده‌فروشی.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل Fallback</label>
                              <input
                                type="text"
                                value={aiModelFallback}
                                onChange={(e) => setAiModelFallback(e.target.value)}
                                placeholder="google/gemini-2.5-flash"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                مدل جایگزین در صورت بروز خطا در مدل اصلی.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل تولید Embedding</label>
                              <input
                                type="text"
                                value={aiModelEmbedding}
                                onChange={(e) => setAiModelEmbedding(e.target.value)}
                                placeholder="openai/text-embedding-3-small"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-red-500 font-bold leading-relaxed">
                                تغییر این مدل نیازمند بازسازی کامل وکتورهای ذخیره شده در دیتابیس است.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 my-4 pt-4"></div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            تنظیمات Embedding و RAG
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">آدرس پایه سرویس Embedding (Base URL)</label>
                              <input
                                type="text"
                                value={aiEmbeddingBaseUrl}
                                onChange={(e) => setAiEmbeddingBaseUrl(e.target.value)}
                                placeholder="https://api.openai.com/v1"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                آدرس پایه API برای ارسال درخواست‌های embedding.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">کلید API سرویس Embedding</label>
                              <input
                                type="password"
                                value={aiEmbeddingApiKey}
                                onChange={(e) => setAiEmbeddingApiKey(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                کلید اختصاصی برای احراز هویت در سرویس embedding.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 my-4 pt-4"></div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            مدل‌های هوش مصنوعی وبلاگ اصلی پلتفرم
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل ایده مقاله (Idea Model)</label>
                              <input
                                type="text"
                                value={platformBlogIdeaModel}
                                onChange={(e) => setPlatformBlogIdeaModel(e.target.value)}
                                placeholder="google/gemini-2.5-flash"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                برای بررسی موضوعات ترند، خوشه‌های محتوایی و ایده‌پردازی مقالات جدید.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل ساختار و سرفصل‌ها (Outline Model)</label>
                              <input
                                type="text"
                                value={platformBlogOutlineModel}
                                onChange={(e) => setPlatformBlogOutlineModel(e.target.value)}
                                placeholder="google/gemini-2.5-flash"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                جهت طراحی ساختار درختی و هدرهای سمانتیک (H2/H3/H4) متوازن.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل نگارش بخش‌ها (Section Model)</label>
                              <input
                                type="text"
                                value={platformBlogSectionModel}
                                onChange={(e) => setPlatformBlogSectionModel(e.target.value)}
                                placeholder="anthropic/claude-sonnet-4.6"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                مدل قدرتمند جهت نگارش متن کامل هر بخش به زبان فارسی سلیس و غنی.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل بهینه‌سازی سئو (SEO Model)</label>
                              <input
                                type="text"
                                value={platformBlogSeoModel}
                                onChange={(e) => setPlatformBlogSeoModel(e.target.value)}
                                placeholder="google/gemini-2.5-flash"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                برای بهینه‌سازی بریف سئو، توزیع کلیدواژه‌ها، تولید متا و ساخت تگ‌های OG/Twitter.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل بهینه‌سازی GEO (GEO Model)</label>
                              <input
                                type="text"
                                value={platformBlogGeoModel}
                                onChange={(e) => setPlatformBlogGeoModel(e.target.value)}
                                placeholder="anthropic/claude-sonnet-4.6"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                بهینه‌سازی موتورهای پاسخ تولیدی هوش مصنوعی: نکات کلیدی، خلاصه‌های مستقیم و تطابق هویت سمانتیک.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل بازنویسی و بهبود متن (Rewrite Model)</label>
                              <input
                                type="text"
                                value={platformBlogRewriteModel}
                                onChange={(e) => setPlatformBlogRewriteModel(e.target.value)}
                                placeholder="google/gemini-2.5-flash"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                برای افزایش خوانایی، بازنویسی صریح، رفع ابهامات و افزایش لحن رسمی یا عامیانه مقاله.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">مدل پرسش و پاسخ (FAQ Model)</label>
                              <input
                                type="text"
                                value={platformBlogFaqModel}
                                onChange={(e) => setPlatformBlogFaqModel(e.target.value)}
                                placeholder="google/gemini-2.5-flash"
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                طراحی اتوماتیک سوالات متداول به همراه اسکیما استاندارد JSON-LD برای موتورهای جستجو.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 my-4 pt-4"></div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>
                            پردازش دسته‌ای Embeddingها (RAG)
                          </h4>

                          <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                <p className="text-[10px] text-gray-500 font-bold">کل محصولات</p>
                                <p className="text-lg font-black text-slate-800 mt-1">
                                  {embedStats ? embedStats.totalProducts.toLocaleString('fa') : '...'}
                                </p>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                <p className="text-[10px] text-emerald-600 font-bold">دارای Embedding</p>
                                <p className="text-lg font-black text-emerald-600 mt-1">
                                  {embedStats ? embedStats.embeddedProducts.toLocaleString('fa') : '...'}
                                </p>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                <p className="text-[10px] text-amber-600 font-bold">بدون Embedding (در انتظار)</p>
                                <p className="text-lg font-black text-amber-600 mt-1">
                                  {embedStats ? embedStats.pendingProducts.toLocaleString('fa') : '...'}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed max-w-md">
                                برای فعال‌سازی کامل سیستم جستجوی هوشمند و RAG، تمام محصولات فروشگاه‌ها باید دارای بردار ویژگی (Embedding) باشند. با کلیک بر روی دکمه زیر، پردازش محصولات فاقد بردار آغاز خواهد شد.
                              </p>
                              <button
                                type="button"
                                onClick={handleStartBatchEmbedding}
                                disabled={isEmbeddingLoading || embedStats?.progress?.isProcessing || !aiEmbeddingBaseUrl || !aiEmbeddingApiKey}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-sm ${
                                  isEmbeddingLoading || embedStats?.progress?.isProcessing || !aiEmbeddingBaseUrl || !aiEmbeddingApiKey
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-violet-600 hover:bg-violet-700 text-white active:scale-[0.98]'
                                }`}
                              >
                                {isEmbeddingLoading || embedStats?.progress?.isProcessing ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    در حال پردازش...
                                  </>
                                ) : (
                                  'شروع پردازش دسته‌ای'
                                )}
                              </button>
                            </div>

                            {embedStats?.progress?.isProcessing && (
                              <div className="bg-white border border-violet-100 rounded-2xl p-4 space-y-3 shadow-sm mt-3">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-violet-600 animate-pulse flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-violet-600 inline-block"></span>
                                    در حال پردازش محصولات در پس‌زمینه...
                                  </span>
                                  <span className="font-black text-slate-700">
                                    {Math.round(
                                      ((embedStats.progress.processedCount + embedStats.progress.failedCount) /
                                        (embedStats.progress.totalToProcess || 1)) *
                                        100
                                    )}٪
                                  </span>
                                </div>
                                
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-violet-600 h-2 rounded-full transition-all duration-500"
                                    style={{ 
                                      width: `${Math.min(
                                        100, 
                                        Math.round(
                                          ((embedStats.progress.processedCount + embedStats.progress.failedCount) / 
                                            (embedStats.progress.totalToProcess || 1)) * 
                                            100
                                        )
                                      )}%` 
                                    }}
                                  ></div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-gray-500 pt-1">
                                  <div>
                                    <p>کل محصولات در صف</p>
                                    <p className="text-slate-700 font-black mt-0.5">
                                      {embedStats.progress.totalToProcess.toLocaleString('fa')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-emerald-600">موفقیت‌آمیز</p>
                                    <p className="text-emerald-600 font-black mt-0.5">
                                      {embedStats.progress.processedCount.toLocaleString('fa')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-red-500">ناموفق / خطا</p>
                                    <p className="text-red-500 font-black mt-0.5">
                                      {embedStats.progress.failedCount.toLocaleString('fa')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {embeddingMessage && (
                              <div className={`p-3 rounded-xl text-xs font-bold ${
                                embeddingMessage.includes('خطا') 
                                  ? 'bg-red-50 text-red-600 border border-red-100' 
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}>
                                {embeddingMessage}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-gray-100 my-4 pt-4"></div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                            تنظیمات اختصاصی دستیار هوشمند مقالات و وبلاگ
                          </h4>

                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1">مدل هوش مصنوعی دستیار مقالات (AI Blog Assistant Model)</label>
                            <input
                              type="text"
                              value={openrouterBlogModel}
                              onChange={(e) => setOpenrouterBlogModel(e.target.value)}
                              placeholder="google/gemini-2.5-flash"
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                              dir="ltr"
                            />
                            <p className="text-[10px] text-gray-500 font-bold leading-relaxed pt-1.5">
                              شناسه مدل موردنظر را برای بخش <strong className="text-indigo-600">تولید و مدیریت مقالات وبلاگ</strong> وارد کنید. در صورت خالی بودن، از مدل اصلی بالا استفاده خواهد شد.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">اندازه هر بخش (Chunk Size - Tokens)</label>
                              <input
                                type="number"
                                value={blogAiChunkSize}
                                onChange={(e) => setBlogAiChunkSize(Number(e.target.value))}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs text-gray-800 transition-all"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                تعداد توکن‌های تولیدی در هر بخش (پیش‌فرض ۸۰۰).
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">توکن‌های هم‌پوشانی (Overlap Tokens)</label>
                              <input
                                type="number"
                                value={blogAiOverlapTokens}
                                onChange={(e) => setBlogAiOverlapTokens(Number(e.target.value))}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs text-gray-800 transition-all"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                تعداد توکن‌های پل ارتباطی از بخش قبلی به بخش بعدی (پیش‌فرض ۲۰۰).
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">حداکثر تعداد تکرار (Max Chunks)</label>
                              <input
                                type="number"
                                value={blogAiMaxChunks}
                                onChange={(e) => setBlogAiMaxChunks(Number(e.target.value))}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs text-gray-800 transition-all"
                              />
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                حداکثر تعداد دفعات ادامه نوشتن برای جلوگیری از مصرف بی‌رویه توکن (پیش‌فرض ۵).
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-700 mb-1">ادامه خودکار (Auto Continue)</label>
                              <div className="flex items-center gap-2 pt-2">
                                <input
                                  type="checkbox"
                                  id="blogAiAutoContinue"
                                  checked={blogAiAutoContinue}
                                  onChange={(e) => setBlogAiAutoContinue(e.target.checked)}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded-sm focus:ring-indigo-500"
                                />
                                <label htmlFor="blogAiAutoContinue" className="text-xs font-bold text-gray-700 cursor-pointer">
                                  بخش‌ها به صورت خودکار و پشت سر هم تولید شوند
                                </label>
                              </div>
                              <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                در صورت غیرفعال بودن، بعد از هر بخش منتظر تأیید کاربر می‌ماند.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB TAB: CENTRAL BALE BOT */}
                  {activeSettingsTab === 'central_bale' && (
                    <div className="space-y-5 animate-fadeIn">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          تنظیمات اتصال متمرکز پیام‌رسان بله (Centralized Bale Bot)
                        </h4>
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                          تنظیمات ربات بله مرکزی و درگاه توکن‌های اتصال فروشگاه‌ها جهت ارسال گزارشات و سفارشات جدید به حساب‌های بله ادمین‌ها.
                        </p>
                      </div>

                      <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-xl p-3 flex gap-3 items-start">
                        <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600">
                          <Zap className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <h5 className="text-[11px] font-bold text-emerald-800">راه‌اندازی خودکار سرور ربات بله</h5>
                          <p className="text-[10px] text-emerald-700/80 font-bold leading-relaxed mt-1">
                            پس از ذخیره‌سازی اطلاعات، اسکریپت رانر ربات بله به صورت کاملاً خودکار و خودکفا در پس‌زمینه سرور راه‌اندازی و بروزرسانی خواهد شد. نیازی به اجرای دستور دستی در ترمینال سرور نیست.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">توکن بات مرکزی بله (Central Bot Token)</label>
                        <input
                          type="password"
                          value={centralBaleBotToken}
                          onChange={(e) => setCentralBaleBotToken(e.target.value)}
                          placeholder="e.g. 123456789:abcdef..."
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                          dir="ltr"
                        />
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed pt-1.5">
                          توکن دریافتی از BotFather بله برای ربات مرکزی کل سیستم. تمامی سفارشات و کدهای اتصال از طریق این ربات با کاربران مبادله می‌شود.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">کلید امنیتی درگاه ربات مرکزی (Central Bot API Key)</label>
                        <input
                          type="text"
                          value={centralBaleBotApiKey}
                          onChange={(e) => setCentralBaleBotApiKey(e.target.value)}
                          placeholder="یک کلید امن رندوم وارد کنید"
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                          dir="ltr"
                        />
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed pt-1.5">
                          این کلید امنیتی جهت احراز هویت درخواست‌های ارسال شده از سرور ربات بله به درگاه <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[9px] font-mono">/api/bale/gateway</code> استفاده می‌شود. این فیلد باید در هدر Authorization درخواست‌های ربات مرکزی قرار بگیرد.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SUB TAB: CENTRAL TELEGRAM BOT */}
                  {activeSettingsTab === 'central_telegram' && (
                    <div className="space-y-5 animate-fadeIn">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Send className="w-4 h-4 text-blue-500" />
                          تنظیمات اتصال متمرکز پیام‌رسان تلگرام (Centralized Telegram Bot)
                        </h4>
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                          تنظیمات ربات تلگرام مرکزی و درگاه توکن‌های اتصال فروشگاه‌ها جهت ارسال گزارشات و سفارشات جدید به حساب‌های تلگرام ادمین‌ها.
                        </p>
                      </div>

                      <div className="bg-blue-50/50 border border-blue-100/80 rounded-xl p-3 flex gap-3 items-start">
                        <div className="bg-blue-100 p-1.5 rounded-lg text-blue-500">
                          <Zap className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <h5 className="text-[11px] font-bold text-blue-800">راه‌اندازی خودکار سرور ربات تلگرام</h5>
                          <p className="text-[10px] text-blue-700/80 font-bold leading-relaxed mt-1">
                            پس از ذخیره‌سازی اطلاعات، اسکریپت رانر ربات تلگرام به صورت کاملاً خودکار و خودکفا در پس‌زمینه سرور راه‌اندازی و بروزرسانی خواهد شد. نیازی به اجرای دستور دستی در ترمینال سرور نیست.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">توکن بات مرکزی تلگرام (Central Bot Token)</label>
                        <input
                          type="password"
                          value={centralTelegramBotToken}
                          onChange={(e) => setCentralTelegramBotToken(e.target.value)}
                          placeholder="e.g. 123456789:abcdef..."
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                          dir="ltr"
                        />
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed pt-1.5">
                          توکن دریافتی از BotFather تلگرام برای ربات مرکزی کل سیستم. تمامی سفارشات و کدهای اتصال از طریق این ربات با کاربران مبادله می‌شود.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">کلید امنیتی درگاه ربات مرکزی (Central Bot API Key)</label>
                        <input
                          type="text"
                          value={centralTelegramBotApiKey}
                          onChange={(e) => setCentralTelegramBotApiKey(e.target.value)}
                          placeholder="یک کلید امن رندوم وارد کنید"
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-mono text-gray-800 transition-all text-left"
                          dir="ltr"
                        />
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed pt-1.5">
                          این کلید امنیتی جهت احراز هویت درخواست‌های ارسال شده از سرور ربات تلگرام به درگاه <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[9px] font-mono">/api/telegram/gateway</code> استفاده می‌شود. این فیلد باید در هدر Authorization درخواست‌های ربات مرکزی قرار بگیرد.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* SUB TAB 2: BASE PROMPTS */}
                  {activeSettingsTab === 'base_prompts' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          پرامپت‌های پایه و عمومی تولید سئو (Base SEO Prompts)
                        </h4>
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed mt-1">
                          پرامپت‌های مربوط به قوانین کلی، توضیحات کوتاه، برند، قیمت، نوع و دسته‌بندی محصول. از متغیرهای مربوطه (مانند <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{title}"}</code> یا <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{brand}"}</code>) استفاده کنید.
                        </p>
                      </div>

                      <div className="border border-purple-100 bg-purple-50/10 rounded-2xl p-5 space-y-4 text-right">
                        {[
                          { key: 'ai_seo_prompt_base', label: 'پرامپت پایه و قوانین کلی (شامل متغیر {title})', rows: 8, placeholder: 'شامل قوانین کلی و متغیر {title}...' },
                          { key: 'ai_seo_prompt_description', label: 'پرامپت بخش توضیحات کوتاه (شامل متغیر {description})', rows: 3, placeholder: 'شامل متغیر {description}...' },
                          { key: 'ai_seo_prompt_brand', label: 'پرامپت بخش برند محصول (شامل متغیر {brand})', rows: 3, placeholder: 'شامل متغیر {brand}...' },
                          { key: 'ai_seo_prompt_price', label: 'پرامپت بخش قیمت محصول (شامل متغیر {price})', rows: 3, placeholder: 'شامل متغیر {price}...' },
                          { key: 'ai_seo_prompt_type', label: 'پرامپت بخش نوع محصول (شامل متغیر {type})', rows: 3, placeholder: 'شامل متغیر {type}...' },
                          { key: 'ai_seo_prompt_category', label: 'پرامپت بخش دسته‌بندی محصول (شامل متغیر {category})', rows: 3, placeholder: 'شامل متغیر {category}...' },
                        ].map((item) => (
                          <div key={item.key} className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-gray-700">{item.label}</label>
                            <textarea
                              value={prompts[item.key] || ''}
                              onChange={(e) => setPrompts({ ...prompts, [item.key]: e.target.value })}
                              rows={item.rows}
                              placeholder={item.placeholder}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 outline-none text-[11px] font-medium text-gray-800 leading-relaxed transition-all"
                              dir="rtl"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB TAB 3: ADVANCED PROMPTS */}
                  {activeSettingsTab === 'advanced_prompts' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          پرامپت‌های پیشرفته و فنی تولید سئو (Advanced SEO Prompts)
                        </h4>
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed mt-1">
                          پرامپت‌های مربوط به مشخصات فنی، ویژگی‌های برجسته، تنوع کالا و توضیحات تفصیلی محصول. از متغیرهای مربوطه (مانند <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{specs}"}</code> یا <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{fullDescription}"}</code>) استفاده کنید.
                        </p>
                      </div>

                      <div className="border border-purple-100 bg-purple-50/10 rounded-2xl p-5 space-y-4 text-right">
                        {[
                          { key: 'ai_seo_prompt_specs', label: 'پرامپت بخش مشخصات فنی محصول (شامل متغیر {specs})', rows: 3, placeholder: 'شامل متغیر {specs}...' },
                          { key: 'ai_seo_prompt_features', label: 'پرامپت بخش ویژگی‌های برجسته محصول (شامل متغیر {features})', rows: 3, placeholder: 'شامل متغیر {features}...' },
                          { key: 'ai_seo_prompt_variants', label: 'پرامپت بخش تنوع محصول (رنگ‌ها و طرح‌ها) (شامل متغیر {variants})', rows: 3, placeholder: 'شامل متغیر {variants}...' },
                          { key: 'ai_seo_prompt_fulldesc', label: 'پرامپت بخش توضیحات تفصیلی محصول (شامل متغیر {fullDescription})', rows: 3, placeholder: 'شامل متغیر {fullDescription}...' },
                        ].map((item) => (
                          <div key={item.key} className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-gray-700">{item.label}</label>
                            <textarea
                              value={prompts[item.key] || ''}
                              onChange={(e) => setPrompts({ ...prompts, [item.key]: e.target.value })}
                              rows={item.rows}
                              placeholder={item.placeholder}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 outline-none text-[11px] font-medium text-gray-800 leading-relaxed transition-all"
                              dir="rtl"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB TAB 4: ARTICLE PROMPTS */}
                  {activeSettingsTab === 'article_prompts' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4 text-purple-600" />
                          پرامپت تولید مقاله کامل سئو (SEO Article Prompt)
                        </h4>
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed mt-1">
                          این پرامپت قالب کلی و دستورالعمل تولید مقاله سئو شده (توضیحات کامل محصول) را مدیریت می‌کند. از متغیرهایی چون <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{title}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{description}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{brand}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{price}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{type}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{category}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{specs}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{features}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{variants}"}</code> و متغیر پیوند داخلی محصولات مرتبط فروشگاه <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{shopProductsList}"}</code> استفاده کنید.
                        </p>
                      </div>

                      <div className="border border-purple-100 bg-purple-50/10 rounded-2xl p-5 space-y-4 text-right">
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-gray-700">الگوی پرامپت تولید مقاله سئو کامل (HTML output):</label>
                          <textarea
                            value={prompts['ai_seo_article_prompt'] || ''}
                            onChange={(e) => setPrompts({ ...prompts, ai_seo_article_prompt: e.target.value })}
                            rows={12}
                            placeholder="پرامپت نگارش مقاله سئو کالا..."
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 outline-none text-[11px] font-medium text-gray-800 leading-relaxed transition-all"
                            dir="rtl"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB TAB 5: FAQ PROMPTS */}
                  {activeSettingsTab === 'faq_prompts' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-purple-600" />
                          پرامپت تولید پرسش و پاسخ‌های متداول (FAQ Prompt)
                        </h4>
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed mt-1">
                          این پرامپت الگو و دستورالعمل تولید خودکار سوالات متداول سئو شده محصول را مدیریت می‌کند. از متغیرهایی چون <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{title}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{description}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{brand}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{price}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{type}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{category}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{specs}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{features}"}</code>، <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{variants}"}</code> و <code className="bg-gray-100 text-purple-600 px-1 rounded">{"{fullDescription}"}</code> استفاده کنید.
                        </p>
                      </div>

                      <div className="border border-purple-100 bg-purple-50/10 rounded-2xl p-5 space-y-4 text-right">
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-gray-700">الگوی پرامپت تولید لیست پرسش و پاسخ (JSON output):</label>
                          <textarea
                            value={prompts['ai_seo_faq_prompt'] || ''}
                            onChange={(e) => setPrompts({ ...prompts, ai_seo_faq_prompt: e.target.value })}
                            rows={12}
                            placeholder="پرامپت تولید سوالات متداول..."
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 outline-none text-[11px] font-medium text-gray-800 leading-relaxed transition-all"
                            dir="rtl"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB TAB 6: SECURITY SETTINGS */}
                  {activeSettingsTab === 'security_settings' && (
                    <div className="space-y-6 animate-fadeIn">
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          تنظیمات امنیت بالا و سامانه پیامک پلتفرم
                        </h4>
                        <p className="text-[10px] text-gray-500 font-bold leading-relaxed mt-1">
                          مدیریت متمرکز وضعیت رمزنگاری‌ها، کلیدهای مخفی سرور، اعتبارنامه سامانه پیامک سراسری و پاک‌سازی لاگ‌ها.
                        </p>
                      </div>

                      {/* Security Status Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Encryption Key Status */}
                        <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50 space-y-2 text-right">
                          <span className="text-[10px] font-bold text-gray-400">کلید رمزنگاری پیامک (SMS_ENCRYPTION_KEY)</span>
                          {smsEncryptionKeyStatus === 'configured' ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              <span>کلید اختصاصی فعال و ایمن</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                              <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                              <span>استفاده از کلید پیش‌فرض پلتفرم! (ناامن)</span>
                            </div>
                          )}
                          <p className="text-[9px] text-gray-400 font-bold leading-relaxed">
                            این کلید متغیر محیطی سرور است که برای ذخیره‌سازی رمزنگاری‌شده اطلاعات پنل‌های پیامکی فروشگاه‌ها استفاده می‌شود.
                          </p>
                        </div>

                        {/* OTP Hash Pepper Status */}
                        <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50 space-y-2 text-right">
                          <span className="text-[10px] font-bold text-gray-400">رمزگذاری کدهای تایید (OTP_HASH_SECRET)</span>
                          {otpHashSecretStatus === 'configured' ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              <span>رمزگذاری قوی HMAC-SHA256 فعال است</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <span>بدون کلید نمک اختصاصی (امنیت متوسط)</span>
                            </div>
                          )}
                          <p className="text-[9px] text-gray-400 font-bold leading-relaxed">
                            این متغیر برای درهم‌سازی کدهای OTP استفاده شده تا از حملات آفلاین روی دیتابیس کاملاً جلوگیری شود.
                          </p>
                        </div>
                      </div>

                      {/* Global Melipayamak Panel Form */}
                      <div className="border border-gray-100 bg-gray-50/20 rounded-2xl p-5 space-y-4 text-right">
                        <h5 className="text-[11px] font-bold text-gray-700 pb-2 border-b border-gray-100">پیکربندی پیامک سراسری پلتفرم (Melipayamak)</h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-600">نام کاربری ملی پیامک پلتفرم:</label>
                            <input
                              type="text"
                              value={globalSmsUsername}
                              onChange={(e) => setGlobalSmsUsername(e.target.value)}
                              placeholder="نام کاربری سامانه"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-medium text-gray-800 transition-all text-left"
                              dir="ltr"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-gray-600">رمز عبور ملی پیامک پلتفرم:</label>
                            <input
                              type="password"
                              value={globalSmsPassword}
                              onChange={(e) => setGlobalSmsPassword(e.target.value)}
                              placeholder="password"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-medium text-gray-800 transition-all text-left"
                              dir="ltr"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-gray-600">کد وب‌سرویس اشتراکی (Pattern Code):</label>
                          <input
                            type="text"
                            value={globalSmsPatternCode}
                            onChange={(e) => setGlobalSmsPatternCode(e.target.value)}
                            placeholder="مثال: 123456"
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-medium text-gray-800 transition-all text-left"
                            dir="ltr"
                          />
                          <p className="text-[9px] text-gray-400 font-bold leading-relaxed pt-1">
                            این سامانه پیامکی سراسری برای خدمات پلتفرم (مانند ورود کاربران به پنل ادمین، ثبت‌نام فروشگاه جدید، تغییر کلمه عبور) و همچنین به‌عنوان پشتیبان پیش‌فرض برای کل فروشگاه‌های تابعه استفاده می‌شود.
                          </p>
                        </div>
                      </div>

                      {/* SMS Logs management */}
                      <div className="border border-gray-100 bg-gray-50/20 rounded-2xl p-5 space-y-4 text-right">
                        <h5 className="text-[11px] font-bold text-gray-700 pb-2 border-b border-gray-100">مدیریت لاگ‌های پیامکی پلتفرم</h5>
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400">تعداد کل لاگ‌های پیامکی ثبت شده:</span>
                            <div className="text-lg font-extrabold text-blue-600 mt-1 flex items-center gap-1.5">
                              <span>{totalSmsLogs.toLocaleString('fa-IR')}</span>
                              <span className="text-[10px] text-gray-400 font-bold">لاگ</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={clearingLogs || totalSmsLogs === 0}
                              onClick={() => handleClearSmsLogs(true)}
                              className="px-3.5 py-2 border border-gray-200 hover:border-amber-200 hover:bg-amber-50 text-amber-700 rounded-xl text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40"
                            >
                              پاک‌سازی لاگ‌های بیش از ۳۰ روز
                            </button>
                            <button
                              type="button"
                              disabled={clearingLogs || totalSmsLogs === 0}
                              onClick={() => handleClearSmsLogs(false)}
                              className="px-3.5 py-2 border border-red-100 hover:bg-red-50 text-red-600 rounded-xl text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              حذف کامل لاگ‌های پیامک پلتفرم
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingSettings || loadingSettings}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-colors font-bold text-xs disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {savingSettings ? 'در حال ذخیره‌سازی...' : 'ذخیره تنظیمات'}
                    </button>
                  </div>
                </form>
                ) : (
                  <div className="space-y-5 max-w-2xl text-right animate-fadeIn">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-blue-600" />
                        تغییر رمز عبور سوپر ادمین
                      </h4>
                      <p className="text-[10px] text-gray-500 font-bold leading-relaxed mt-1">
                        برای تغییر رمز عبور سوپر ادمین، لطفاً اطلاعات زیر را تکمیل کرده و کد تایید دو مرحله‌ای را وارد کنید.
                      </p>
                    </div>

                    {passwordSuccess && (
                      <div className="bg-green-50 text-green-700 p-3.5 rounded-xl text-xs font-bold border border-green-100 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>{passwordSuccess}</span>
                      </div>
                    )}

                    {passwordError && (
                      <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span>{passwordError}</span>
                      </div>
                    )}

                    <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">رمز عبور فعلی</label>
                          <input
                            type="password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all text-left"
                            dir="ltr"
                            placeholder="••••••••"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">شماره موبایل (جهت دریافت کد دو مرحله‌ای)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              required
                              disabled={otpSent}
                              value={adminPhone}
                              onChange={(e) => setAdminPhone(e.target.value)}
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all text-left disabled:opacity-60"
                              dir="ltr"
                              placeholder="09123456789"
                            />
                            <button
                              type="button"
                              onClick={handleSendPasswordOtp}
                              disabled={otpCountdown > 0 || !adminPhone}
                              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white disabled:text-gray-400 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                            >
                              {otpCountdown > 0 ? `ارسال مجدد (${otpCountdown})` : otpSent ? 'ارسال مجدد کد' : 'ارسال کد تایید'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">رمز عبور جدید</label>
                          <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all text-left"
                            dir="ltr"
                            placeholder="••••••••"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">تکرار رمز عبور جدید</label>
                          <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all text-left"
                            dir="ltr"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      {otpSent && (
                        <div className="max-w-xs animate-fadeIn">
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">کد تایید ۵ رقمی</label>
                          <input
                            type="text"
                            maxLength={5}
                            required
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-center font-bold text-lg tracking-widest text-gray-800 transition-all"
                            placeholder="•••••"
                            dir="ltr"
                          />
                        </div>
                      )}

                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                        <button
                          type="submit"
                          disabled={changingPassword || !otpSent}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white disabled:text-gray-400 px-6 py-2.5 rounded-xl transition-colors font-bold text-xs cursor-pointer shadow-xs"
                        >
                          {changingPassword ? 'در حال تغییر رمز...' : 'تغییر رمز عبور'}
                        </button>

                        {otpSent && (
                          <button
                            type="button"
                            onClick={() => {
                              setOtpSent(false);
                              setOtpCountdown(0);
                              setOtpCode('');
                            }}
                            className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                          >
                            تغییر شماره موبایل
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Add Shop Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-sm font-bold text-gray-900">افزودن فروشگاه جدید</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddShop} className="p-5 space-y-4 text-right">
              {addError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">نام فروشگاه</label>
                <input
                  type="text"
                  required
                  value={newShopData.shopName}
                  onChange={e => setNewShopData({...newShopData, shopName: e.target.value})}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all"
                  placeholder="مثال: فروشگاه من"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">ساب‌دامین (آدرس انحصاری)</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    value={newShopData.subdomain}
                    onChange={e => setNewShopData({...newShopData, subdomain: e.target.value})}
                    dir="ltr"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-r-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-left text-xs font-bold text-gray-700 transition-all"
                    placeholder="my-shop"
                  />
                  <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-gray-400 dir-ltr text-xs font-bold shrink-0">
                    {baseDomainSuffix}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-800 mb-3">اطلاعات مالک فروشگاه</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">نام و نام خانوادگی</label>
                    <input
                      type="text"
                      value={newShopData.ownerName}
                      onChange={e => setNewShopData({...newShopData, ownerName: e.target.value})}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">ایمیل ورود</label>
                    <input
                      type="email"
                      required
                      value={newShopData.ownerEmail}
                      onChange={e => setNewShopData({...newShopData, ownerEmail: e.target.value})}
                      dir="ltr"
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-left text-xs font-bold text-gray-700 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">رمز عبور</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={newShopData.ownerPassword}
                          onChange={e => setNewShopData({...newShopData, ownerPassword: e.target.value})}
                          dir="ltr"
                          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-left text-xs font-bold text-gray-700 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                        >
                          {showPassword ? "مخفی" : "نمایش"}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const randomPassword = Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-4).toUpperCase() + Math.floor(Math.random() * 100);
                          setNewShopData({...newShopData, ownerPassword: randomPassword});
                          setShowPassword(true);
                        }}
                        className="px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors text-xs font-bold whitespace-nowrap cursor-pointer"
                      >
                        تولید خودکار
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-xs font-bold cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'در حال ایجاد...' : 'ایجاد فروشگاه'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Package Modal (Add / Edit) */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-sm font-bold text-gray-900">
                {editingPackage ? `ویرایش پکیج: ${editingPackage.name}` : 'تعریف پکیج جدید'}
              </h2>
              <button 
                onClick={() => setIsPackageModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePackageSubmit} className="p-5 space-y-4 text-right">
              {packageError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">
                  {packageError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">نام پکیج</label>
                  <input
                    type="text"
                    required
                    value={packageData.name}
                    onChange={e => setPackageData({...packageData, name: e.target.value})}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all"
                    placeholder="مثال: پکیج طلایی"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">مدت زمان (ماه)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={packageData.months}
                    onChange={e => setPackageData({...packageData, months: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">قیمت (تومان)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={packageData.price}
                    onChange={e => setPackageData({...packageData, price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="mb-5 bg-blue-50/30 p-4 rounded-xl border border-blue-50">
                  <label className="block text-xs font-bold text-blue-900 mb-1.5">محدودیت تعداد محصولات تعریف‌شده</label>
                  <input
                    type="number"
                    min={0}
                    value={(packageData.features as any).maxProducts || 0}
                    onChange={e => {
                      setPackageData({
                        ...packageData,
                        features: {
                          ...packageData.features,
                          maxProducts: parseInt(e.target.value) || 0
                        }
                      });
                    }}
                    className="w-full max-w-xs px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all"
                    placeholder="۰ یا خالی به معنی نامحدود"
                  />
                  <p className="text-[10px] text-gray-500 mt-1.5 font-bold">عدد ۰ یا خالی گذاشتن به معنی «تعریف نامحدود محصول» برای این پکیج است.</p>
                </div>

                {!!(packageData.features as any).bgRemovalEnabled && (
                  <div className="mb-5 bg-indigo-50/30 p-4 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-bold text-indigo-900 mb-1.5">سهمیه حذف پس‌زمینه تصاویر</label>
                    <input
                      type="number"
                      min={0}
                      value={(packageData.features as any).bgRemovalLimit || 0}
                      onChange={e => {
                        setPackageData({
                          ...packageData,
                          features: {
                            ...packageData.features,
                            bgRemovalLimit: parseInt(e.target.value) || 0
                          }
                        });
                      }}
                      className="w-full max-w-xs px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-xs font-bold text-gray-700 transition-all"
                      placeholder="۰ یا خالی به معنی نامحدود"
                    />
                    <p className="text-[10px] text-indigo-500 mt-1.5 font-bold">تعداد دفعاتی که کاربر مجاز به استفاده از ابزار حذف پس‌زمینه با هوش مصنوعی در طول دوره اشتراک می‌باشد. (عدد ۰ یا خالی به معنی سهمیه نامحدود است)</p>
                  </div>
                )}

                {!!(packageData.features as any).staffEnabled && (
                  <div className="mb-5 bg-purple-50/30 p-4 rounded-xl border border-purple-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-bold text-purple-900 mb-1.5">محدودیت تعداد همکاران</label>
                    <input
                      type="number"
                      min={0}
                      value={(packageData.features as any).maxStaff || 0}
                      onChange={e => {
                        setPackageData({
                          ...packageData,
                          features: {
                            ...packageData.features,
                            maxStaff: parseInt(e.target.value) || 0
                          }
                        });
                      }}
                      className="w-full max-w-xs px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 outline-none text-xs font-bold text-gray-700 transition-all"
                      placeholder="۰ یا خالی به معنی نامحدود"
                    />
                    <p className="text-[10px] text-purple-500 mt-1.5 font-bold">حداکثر تعداد همکارانی که کاربر مجاز به تعریف آنها در فروشگاه می‌باشد. (عدد ۰ یا خالی به معنی تعداد نامحدود است)</p>
                  </div>
                )}

                {!!(packageData.features as any).customDomainEnabled && (
                  <div className="mb-5 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-bold text-emerald-900 mb-1.5">محدودیت تعداد دامنه اختصاصی</label>
                    <input
                      type="number"
                      min={0}
                      value={(packageData.features as any).maxDomains || 0}
                      onChange={e => {
                        setPackageData({
                          ...packageData,
                          features: {
                            ...packageData.features,
                            maxDomains: parseInt(e.target.value) || 0
                          }
                        });
                      }}
                      className="w-full max-w-xs px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-xs font-bold text-gray-700 transition-all"
                      placeholder="۰ یا خالی به معنی نامحدود"
                    />
                    <p className="text-[10px] text-emerald-500 mt-1.5 font-bold">حداکثر تعداد دامنه اختصاصی متصل شده مجاز در پکیج. (عدد ۰ یا خالی به معنی نامحدود است)</p>
                  </div>
                )}

                {!!(packageData.features as any).aiAgentEnabled && (
                  <div className="mb-5 bg-rose-50/30 p-4 rounded-xl border border-rose-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-bold text-rose-900 mb-1.5">سهمیه ماهانه درخواست‌های دستیار هوشمند (AI Agent)</label>
                    <input
                      type="number"
                      min={0}
                      value={(packageData.features as any).aiRequestsLimit || 0}
                      onChange={e => {
                        setPackageData({
                          ...packageData,
                          features: {
                            ...packageData.features,
                            aiRequestsLimit: parseInt(e.target.value) || 0
                          }
                        });
                      }}
                      className="w-full max-w-xs px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 outline-none text-xs font-bold text-gray-700 transition-all"
                      placeholder="۰ یا خالی به معنی نامحدود"
                    />
                    <p className="text-[10px] text-rose-500 mt-1.5 font-bold">تعداد درخواست‌های هوش مصنوعی (ایجنت) مجاز برای فروشگاه در هر ماه. (عدد ۰ یا خالی به معنی سهمیه نامحدود است)</p>
                  </div>
                )}

                <h3 className="text-xs font-bold text-gray-800 mb-3">قابلیت‌ها و ویژگی‌های مجاز در این پکیج:</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  {[
                    { key: 'physicalProducts', label: 'محصولات فیزیکی' },
                    { key: 'digitalProducts', label: 'محصولات دانلودی (فایل)' },
                    { key: 'specialDeals', label: 'تخفیف شگفت‌انگیز و پیشنهاد ویژه' },
                    { key: 'relatedProducts', label: 'محصولات مرتبط هوشمند' },
                    { key: 'zarinpal', label: 'درگاه آنلاین زرین‌پال' },
                    { key: 'zibal', label: 'درگاه آنلاین زیبال' },
                    { key: 'cardToCard', label: 'پرداخت کارت به کارت' },
                    { key: 'tipax', label: 'ارسال تیپاکس (API)' },
                    { key: 'productSets', label: 'ست محصول و گالری تعاملی' },
                    { key: 'customerClub', label: 'باشگاه مشتریان و سیستم وفاداری' },
                    { key: 'seoTools', label: 'تنظیمات سئو (Sitemap/Robots)' },
                    { key: 'aiSeoEnabled', label: 'تولید سئو با هوش مصنوعی' },
                    { key: 'aiArticleEnabled', label: 'تولید مقاله سئو با هوش مصنوعی' },
                    { key: 'aiFaqsEnabled', label: 'تولید سوالات متداول با هوش مصنوعی' },
                    { key: 'aiAgentEnabled', label: 'دستیار هوشمند ادمین (AI Agent)' },
                    { key: 'bgRemovalEnabled', label: 'حذف پس‌زمینه با هوش مصنوعی' },
                    { key: 'staffEnabled', label: 'مدیریت همکاران' },
                    { key: 'onlineChatEnabled', label: 'چت آنلاین و پشتیبانی زنده' },
                    { key: 'customDomainEnabled', label: 'اتصال دامنه اختصاصی' },
                  ].map((feat) => {
                    const isChecked = !!(packageData.features as any)[feat.key];
                    return (
                      <label key={feat.key} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-100 hover:border-blue-100 transition-all cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            setPackageData({
                              ...packageData,
                              features: {
                                ...packageData.features,
                                [feat.key]: e.target.checked
                              }
                            });
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500/10"
                        />
                        <span className="text-xs font-bold text-gray-700 select-none">{feat.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={packageSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-xs font-bold cursor-pointer shadow-xs"
                >
                  {packageSubmitting ? 'در حال ذخیره...' : 'ذخیره پکیج'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  disabled={packageSubmitting}
                  className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Package Modal */}
      {isAssignModalOpen && selectedShopToAssign && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl">
              <h2 className="text-sm font-bold text-gray-900">تخصیص یا تغییر پکیج فروشگاه</h2>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-5 space-y-4 text-right">
              {assignError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">
                  {assignError}
                </div>
              )}

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/30 text-xs font-bold text-gray-700">
                فروشگاه هدف: <span className="text-blue-600">{selectedShopToAssign.shopName}</span>
                <span className="text-[10px] text-gray-400 mt-1 block">ساب‌دامین: {selectedShopToAssign.subdomain}.localhost</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">انتخاب پکیج</label>
                <select
                  value={assignPackageId}
                  onChange={e => setAssignPackageId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold text-gray-600 transition-all cursor-pointer"
                >
                  <option value="">بدون پکیج (حذف پکیج و ویژگی‌های خاص)</option>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.months} ماهه - {pkg.price.toLocaleString('fa-IR')} تومان)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">تاریخ انقضای پکیج</label>
                <input
                  type="date"
                  value={assignExpiresAt}
                  onChange={e => setAssignExpiresAt(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all"
                />
                <span className="text-[9px] text-gray-400 mt-1 block">در صورت عدم تعیین تاریخ، انقضا به طور خودکار بر اساس مدت زمان پکیج از امروز محاسبه می‌شود.</span>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-xs font-bold cursor-pointer shadow-xs"
                >
                  {assignSubmitting ? 'در حال ثبت...' : 'ثبت پکیج برای فروشگاه'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  disabled={assignSubmitting}
                  className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shop Details & Password Change Modal */}
      {isDetailModalOpen && selectedShopForDetails && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-gray-100 my-8">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl sticky top-0 z-10">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Store className="w-5 h-5 text-blue-600" />
                جزئیات فروشگاه: {selectedShopForDetails.shopName}
              </h2>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 text-right max-h-[80vh] overflow-y-auto custom-scrollbar">
              
              {/* Grid 1: Basic & Owner Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* General Info Card */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                  <h3 className="text-xs font-black text-gray-800 border-b border-gray-200/60 pb-2">اطلاعات عمومی</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">شناسه فروشگاه:</span>
                      <span className="font-bold text-gray-700 dir-ltr">{selectedShopForDetails.shopId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ساب‌دامین:</span>
                      <span className="font-bold text-blue-600 dir-ltr">{selectedShopForDetails.subdomain}{baseDomainSuffix}</span>
                    </div>
                    {selectedShopForDetails.customDomain && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">دامنه اختصاصی:</span>
                        <span className="font-bold text-blue-600 dir-ltr">{selectedShopForDetails.customDomain}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">زبان / ارز:</span>
                      <span className="font-bold text-gray-700">{selectedShopForDetails.language === 'fa' ? 'فارسی' : selectedShopForDetails.language} / {selectedShopForDetails.currency === 'USD' ? 'دلار' : selectedShopForDetails.currency === 'IRR' ? 'ریال' : selectedShopForDetails.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">تاریخ ثبت:</span>
                      <span className="font-bold text-gray-700">{new Date(selectedShopForDetails.createdAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </div>
                </div>

                {/* Owner Info Card */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                  <h3 className="text-xs font-black text-gray-800 border-b border-gray-200/60 pb-2">اطلاعات مالک</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">نام مالک:</span>
                      <span className="font-bold text-gray-700">{selectedShopForDetails.owner?.name || 'ثبت نشده'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ایمیل مالک:</span>
                      <span className="font-bold text-gray-700">{selectedShopForDetails.owner?.email || 'ثبت نشده'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">تلفن مالک:</span>
                      <span className="font-bold text-gray-700 dir-ltr">{selectedShopForDetails.owner?.phone || 'ثبت نشده'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">تلفن فروشگاه:</span>
                      <span className="font-bold text-gray-700 dir-ltr">{selectedShopForDetails.contactPhone || 'ثبت نشده'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">کد اقتصادی:</span>
                      <span className="font-bold text-gray-700">{selectedShopForDetails.economicCode || 'ثبت نشده'}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Grid 2: Statistics */}
              {selectedShopForDetails.stats && (
                <div className="p-4 bg-blue-50/20 rounded-xl border border-blue-100/30 space-y-3">
                  <h3 className="text-xs font-black text-blue-800 border-b border-blue-100/40 pb-2">آمار و عملکرد فروشگاه</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="bg-white p-3 rounded-lg border border-blue-100/30">
                      <div className="text-[10px] text-gray-400 font-bold mb-1">تعداد محصولات</div>
                      <div className="text-base font-black text-blue-600">{(selectedShopForDetails.stats.productCount || 0).toLocaleString('fa-IR')}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-blue-100/30">
                      <div className="text-[10px] text-gray-400 font-bold mb-1">تعداد سفارشات</div>
                      <div className="text-base font-black text-green-600">{(selectedShopForDetails.stats.orderCount || 0).toLocaleString('fa-IR')}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-blue-100/30">
                      <div className="text-[10px] text-gray-400 font-bold mb-1">تعداد مشتریان</div>
                      <div className="text-base font-black text-purple-600">{(selectedShopForDetails.stats.customerCount || 0).toLocaleString('fa-IR')}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-blue-100/30">
                      <div className="text-[10px] text-gray-400 font-bold mb-1">کل فروش (پرداخت شده)</div>
                      <div className="text-sm font-black text-amber-600 mt-1">{(selectedShopForDetails.stats.totalSales || 0).toLocaleString('fa-IR')} <span className="text-[9px] font-bold">تومان</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Package & Features Detail */}
              <div className="p-4 bg-purple-50/20 rounded-xl border border-purple-100/30 space-y-3">
                <h3 className="text-xs font-black text-purple-800 border-b border-purple-100/40 pb-2">پکیج و دسترسی‌ها</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">پکیج فعال:</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-700">
                      {selectedShopForDetails.package?.name || 'بدون پکیج فعال'}
                    </span>
                  </div>
                  {selectedShopForDetails.packageExpiresAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">تاریخ انقضای پکیج:</span>
                      <span className={`font-bold ${new Date(selectedShopForDetails.packageExpiresAt) < new Date() ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
                        {new Date(selectedShopForDetails.packageExpiresAt).toLocaleDateString('fa-IR')} 
                        {new Date(selectedShopForDetails.packageExpiresAt) < new Date() ? ' (منقضی شده)' : ''}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-purple-100/30">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className={`w-2 h-2 rounded-full ${selectedShopForDetails.zarinpalEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-600">درگاه زرین‌پال</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className={`w-2 h-2 rounded-full ${selectedShopForDetails.zibalEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-600">درگاه زیبال</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className={`w-2 h-2 rounded-full ${selectedShopForDetails.cardToCardEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-600">کارت به کارت</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className={`w-2 h-2 rounded-full ${selectedShopForDetails.tipaxEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-600">حمل و نقل تیپاکس</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className={`w-2 h-2 rounded-full ${selectedShopForDetails.customerClubEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-600">باشگاه مشتریان</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className={`w-2 h-2 rounded-full ${selectedShopForDetails.productSetsEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-600">پک‌های محصول</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className={`w-2 h-2 rounded-full ${selectedShopForDetails.sitemapEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-600">ابزارهای SEO</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Info Edit Section */}
              <form onSubmit={handleUpdateOwnerInfo} className="p-4 bg-amber-50/10 rounded-xl border border-amber-200/50 space-y-4">
                <h3 className="text-xs font-black text-amber-800 flex items-center gap-1 border-b border-amber-200/40 pb-2">
                  <Edit3 className="w-4 h-4" />
                  ویرایش اطلاعات مالک فروشگاه
                </h3>
                
                {changePasswordSuccess && (
                  <div className="bg-green-50 text-green-600 p-3 rounded-xl text-xs font-bold border border-green-100">
                    {changePasswordSuccess}
                  </div>
                )}

                {changePasswordError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">
                    {changePasswordError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1.5">نام مالک</label>
                    <input
                      type="text"
                      placeholder="نام مالک"
                      value={ownerNewName}
                      onChange={e => setOwnerNewName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1.5">ایمیل مالک</label>
                    <input
                      type="email"
                      placeholder="ایمیل مالک"
                      value={ownerNewEmail}
                      onChange={e => setOwnerNewEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all dir-ltr text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1.5">شماره تلفن مالک</label>
                    <input
                      type="text"
                      placeholder="شماره تلفن مالک"
                      value={ownerNewPhone}
                      onChange={e => setOwnerNewPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all dir-ltr text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1.5">رمز عبور جدید مالک (اختیاری)</label>
                    <input
                      type="password"
                      placeholder="حداقل ۶ کاراکتر (در صورت نیاز به تغییر)"
                      value={ownerNewPassword}
                      onChange={e => setOwnerNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-xs font-bold text-gray-700 transition-all dir-ltr text-right"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full sm:w-auto bg-amber-600 text-white px-5 py-2 rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 text-xs font-bold cursor-pointer shadow-xs whitespace-nowrap flex items-center justify-center gap-1.5"
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>در حال بروزرسانی...</span>
                      </>
                    ) : (
                      <span>بروزرسانی اطلاعات مالک</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Close Button */}
              <div className="pt-2 flex">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-xs font-bold cursor-pointer text-center"
                >
                  بستن پنجره جزئیات
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Delete Shop Modal */}
      {isDeleteModalOpen && selectedShopToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl">
              <h2 className="text-sm font-bold text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5" />
                حذف فروشگاه و تمامی اطلاعات
              </h2>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-right">
              {deleteError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100">
                  {deleteError}
                </div>
              )}

              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100/30 text-xs font-bold text-gray-700 space-y-2">
                <p className="text-gray-800">
                  آیا از حذف فروشگاه <span className="text-red-600 font-black">{selectedShopToDelete.shopName}</span> اطمینان دارید؟
                </p>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                  هشدار: با حذف این فروشگاه، تمامی اطلاعات مربوط به آن شامل محصولات، دسته‌بندی‌ها، سفارشات، مشتریان، تیکت‌ها، تنظیمات و فایل‌های آپلود شده به صورت دائمی و غیرقابل بازگشت حذف خواهند شد.
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => handleDeleteShop(selectedShopToDelete.id)}
                  disabled={deleteSubmitting}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 text-xs font-bold cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  {deleteSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>در حال حذف...</span>
                    </>
                  ) : (
                    <span>بله، کاملاً مطمئنم و حذف شود</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={deleteSubmitting}
                  className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
