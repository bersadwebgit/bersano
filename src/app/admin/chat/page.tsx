'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bot, 
  User, 
  Phone, 
  Mail, 
  Settings, 
  Send, 
  Loader2, 
  X, 
  ExternalLink, 
  ShoppingBag, 
  MessageSquare,
  Power,
  CheckCircle2,
  Lock,
  ChevronLeft,
  Paperclip,
  Trash2,
  Plus
} from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  sender: 'customer' | 'ai' | 'admin';
  message: string;
  messageType: 'text' | 'product' | 'article' | 'image' | 'file';
  metadata?: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  mode: string;
  updatedAt: string;
  messages: Message[];
  _count?: {
    messages: number;
  };
}

interface CrmProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  group: string | null;
  loyaltyPoints: number;
  isBlocked: boolean;
  isWholesaler: boolean;
  avatarUrl?: string | null;
  createdAt: string;
}

interface CrmOrder {
  id: string;
  status: string;
  totalAmount: number;
  finalAmount: number;
  createdAt: string;
}

interface ChatSettings {
  enabled: boolean;
  requireName: boolean;
  requirePhone: boolean;
  requireEmail: boolean;
  welcomeMessage: string;
  defaultMode: string;
  supportAvatar?: string;
  supportName?: string;
}

interface FaqItem {
  q: string;
  a: string;
}

export default function AdminChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [crmProfile, setCrmProfile] = useState<CrmProfile | null>(null);
  const [crmOrders, setCrmOrders] = useState<CrmOrder[]>([]);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // active, closed, all
  const [modeFilter, setModeFilter] = useState('all'); // ai, manual, all
  const [searchQuery, setSearchQuery] = useState('');

  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<'general' | 'identity' | 'faqs'>('general');
  const [settings, setSettings] = useState<ChatSettings>({
    enabled: true,
    requireName: true,
    requirePhone: true,
    requireEmail: false,
    welcomeMessage: 'سلام! چطور می‌توانم کمکتان کنم؟',
    defaultMode: 'ai',
    supportAvatar: '',
    supportName: 'پشتیبانی آنلاین',
  });
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingSupportAvatar, setUploadingSupportAvatar] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingListRef = useRef<NodeJS.Timeout | null>(null);
  const pollingDetailRef = useRef<NodeJS.Timeout | null>(null);

  const sessionsRef = useRef<ChatSession[]>([]);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const originalTitleRef = useRef<string>('');
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      // Pleasant chime: two notes
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.1, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.1); // A5
      gain2.gain.setValueAtTime(0.1, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.5);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  const startFlashing = () => {
    if (flashIntervalRef.current) return;
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }
    setIsFlashing(true);
    let showAlt = false;
    flashIntervalRef.current = setInterval(() => {
      document.title = showAlt ? '💬 پیام جدید دارید!' : originalTitleRef.current;
      showAlt = !showAlt;
    }, 1000);
  };

  const stopFlashing = () => {
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    if (originalTitleRef.current) {
      document.title = originalTitleRef.current;
    }
    setIsFlashing(false);
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const showBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          dir: 'rtl'
        });
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (err) {
        console.error('Failed to show browser notification:', err);
      }
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      stopFlashing();
    };
    window.addEventListener('focus', handleFocus);
    requestNotificationPermission();
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
      }
    };
  }, []);

  // Fetch session list
  const fetchSessions = async (showLoading = false) => {
    if (showLoading) setLoadingList(true);
    try {
      const res = await fetch(`/api/admin/chat?status=${statusFilter}&mode=${modeFilter}&search=${searchQuery}`);
      if (res.ok) {
        const data = await res.json();
        const newSessions: ChatSession[] = data.sessions || [];
        const oldSessions = sessionsRef.current;

        // Check if any session has a new unread message
        if (oldSessions.length > 0 && newSessions.length > 0) {
          let hasNewUnread = false;
          let latestMessageText = '';
          let senderName = '';

          for (const newS of newSessions) {
            const oldS = oldSessions.find(s => s.id === newS.id);
            const newUnread = newS._count?.messages || 0;
            const oldUnread = oldS?._count?.messages || 0;

            if (newUnread > oldUnread) {
              hasNewUnread = true;
              senderName = newS.name || 'کاربر ناشناس';
              latestMessageText = `پیام جدید از طرف ${senderName}`;
              break;
            }
          }

          if (hasNewUnread) {
            playNotificationSound();
            showBrowserNotification('پشتیبانی آنلاین (پنل مدیریت)', latestMessageText);
            if (document.hidden || !document.hasFocus()) {
              startFlashing();
            }
          }
        }

        setSessions(newSessions);
      }
    } catch (err) {
      console.error('[ERROR] [AdminChatList]:', err);
    } finally {
      if (showLoading) setLoadingList(false);
    }
  };

  // Fetch active session details and messages
  const fetchActiveSessionDetail = async (id: string, showLoading = false) => {
    if (showLoading) setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/chat/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setActiveSession(data.session);
          setMessages(data.session.messages || []);
          setCrmProfile(data.crm?.profile || null);
          setCrmOrders(data.crm?.orders || []);
        }
      }
    } catch (err) {
      console.error('[ERROR] [AdminChatDetail]:', err);
    } finally {
      if (showLoading) setLoadingDetail(false);
    }
  };

  // Fetch chat settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/chat/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.chatSettings) {
          setSettings(data.chatSettings);
        }
        if (data.faqsConfig) {
          try {
            setFaqs(JSON.parse(data.faqsConfig));
          } catch (e) {
            setFaqs([]);
          }
        }
      }
    } catch (err) {
      console.error('[ERROR] [AdminChatSettingsFetch]:', err);
    }
  };

  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSettingsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isSettingsOpen]);

  // Initial load and filters change
  useEffect(() => {
    fetchSessions(true);
    fetchSettings();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pollingListRef.current) {
          clearInterval(pollingListRef.current);
          pollingListRef.current = null;
        }
      } else {
        if (!pollingListRef.current) {
          fetchSessions(false);
          pollingListRef.current = setInterval(() => {
            fetchSessions(false);
          }, 6000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Poll session list every 6 seconds if visible
    if (!document.hidden) {
      pollingListRef.current = setInterval(() => {
        fetchSessions(false);
      }, 6000);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollingListRef.current) clearInterval(pollingListRef.current);
    };
  }, [statusFilter, modeFilter, searchQuery]);

  // Handle active session polling
  useEffect(() => {
    if (activeSession) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          if (pollingDetailRef.current) {
            clearInterval(pollingDetailRef.current);
            pollingDetailRef.current = null;
          }
        } else {
          if (!pollingDetailRef.current) {
            fetchActiveSessionDetail(activeSession.id, false);
            pollingDetailRef.current = setInterval(() => {
              fetchActiveSessionDetail(activeSession.id, false);
            }, 4000);
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      if (!document.hidden) {
        pollingDetailRef.current = setInterval(() => {
          fetchActiveSessionDetail(activeSession.id, false);
        }, 4000);
      }

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (pollingDetailRef.current) clearInterval(pollingDetailRef.current);
      };
    } else {
      if (pollingDetailRef.current) clearInterval(pollingDetailRef.current);
    }
  }, [activeSession?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectSession = (session: ChatSession) => {
    fetchActiveSessionDetail(session.id, true);
    // Optimistically clear unread count in list
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, _count: { messages: 0 } } : s));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSession || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistically add message
    const tempId = 'temp-' + Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      sender: 'admin',
      message: messageText,
      messageType: 'text',
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          message: messageText,
          sender: 'admin'
        })
      });

      if (res.ok) {
        // If session was in AI mode, reply from admin automatically forces session to manual mode
        if (activeSession.mode === 'ai') {
          await handleToggleMode('manual');
        } else {
          await fetchActiveSessionDetail(activeSession.id, false);
        }
        fetchSessions(false);
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setInputText(messageText);
      }
    } catch (err) {
      console.error('[ERROR] [AdminChatSend]:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleToggleMode = async (newMode: 'ai' | 'manual') => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/admin/chat/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });

      if (res.ok) {
        setActiveSession(prev => prev ? { ...prev, mode: newMode } : null);
        fetchSessions(false);
      }
    } catch (err) {
      console.error('[ERROR] [AdminChatToggleMode]:', err);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/admin/chat/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' })
      });

      if (res.ok) {
        setActiveSession(null);
        setMessages([]);
        setCrmProfile(null);
        setCrmOrders([]);
        fetchSessions(true);
      }
    } catch (err) {
      console.error('[ERROR] [AdminChatCloseSession]:', err);
    }
  };

  const handleSupportAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSupportAvatar(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: uploadData,
      });
      
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, supportAvatar: data.url }));
      } else {
        alert('خطا در آپلود تصویر');
      }
    } catch (error) {
      console.error('[ERROR] [SupportAvatarUpload]:', error);
      alert('خطا در آپلود تصویر پشتیبانی');
    } finally {
      setUploadingSupportAvatar(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/chat/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          faqsConfig: JSON.stringify(faqs)
        })
      });

      if (res.ok) {
        setIsSettingsOpen(false);
        fetchSessions(false);
      }
    } catch (err) {
      console.error('[ERROR] [AdminChatSaveSettings]:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fa-IR') + ' تومان';
  };

  const renderFormattedMessage = (text: string, isUser: boolean) => {
    if (!text) return '';
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return (
          <strong 
            key={idx} 
            className={`font-black rounded-lg px-1.5 py-0.5 mx-0.5 shadow-sm inline-block ${
              isUser 
                ? 'bg-white/20 text-white border border-white/10' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-amber-400 border border-slate-200/50 dark:border-slate-800'
            }`}
          >
            {content}
          </strong>
        );
      }
      return part;
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  };

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'در انتظار پرداخت';
      case 'paid': return 'پرداخت شده';
      case 'shipped': return 'ارسال شده';
      case 'delivered': return 'تحویل شده';
      case 'cancelled': return 'لغو شده';
      default: return status;
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-600 bg-amber-50 dark:bg-amber-950/20';
      case 'paid': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20';
      case 'shipped': return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20';
      case 'delivered': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20';
      case 'cancelled': return 'text-rose-600 bg-rose-50 dark:bg-rose-950/20';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col select-none font-sans" dir="rtl">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800/80 flex justify-between items-center mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 dark:text-white">مرکز پشتیبانی و چت آنلاین</h1>
            <p className="text-[10px] text-slate-400">مدیریت گفتگوهای زنده با مشتریان و تنظیمات پاسخگوی هوشمند</p>
          </div>
        </div>
        <button
          onClick={() => {
            setSettingsModalTab('general');
            setIsSettingsOpen(true);
          }}
          className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all text-xs font-black flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          تنظیمات چت
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Right Panel: Sessions List */}
        <div className="w-80 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 flex flex-col overflow-hidden shadow-sm">
          {/* Search & Filters */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="جستجوی نام، تلفن یا ایمیل..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 text-[10px] font-black focus:outline-none"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="active">فعال</option>
                <option value="closed">بسته شده</option>
              </select>

              <select
                value={modeFilter}
                onChange={e => setModeFilter(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 text-[10px] font-black focus:outline-none"
              >
                <option value="all">همه حالت‌ها</option>
                <option value="ai">هوش مصنوعی</option>
                <option value="manual">دستی</option>
              </select>
            </div>
          </div>

          {/* Session List Thread */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingList ? (
              <div className="flex flex-col justify-center items-center h-40 gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-[10px]">در حال بارگذاری گفتگوها...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">هیچ گفتگویی یافت نشد.</div>
            ) : (
              sessions.map(session => {
                const isSelected = activeSession?.id === session.id;
                const lastMsg = session.messages?.[0]?.message || 'بدون پیام';
                const unreadCount = session._count?.messages || 0;

                return (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session)}
                    className={`w-full text-right p-3 rounded-2xl transition-all flex flex-col gap-1.5 ${
                      isSelected 
                        ? 'bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100/30' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-black text-xs text-slate-800 dark:text-white truncate max-w-[140px]">
                        {session.name || 'مشتری ناشناس'}
                      </span>
                      <span className="text-[9px] text-slate-400">{formatDateTime(session.updatedAt)}</span>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full leading-relaxed">
                      {lastMsg}
                    </p>

                    <div className="flex justify-between items-center w-full mt-0.5">
                      <div className="flex gap-1.5">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                          session.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}>
                          {session.status === 'active' ? 'فعال' : 'مختومه'}
                        </span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          session.mode === 'ai' 
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400' 
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}>
                          {session.mode === 'ai' ? <Bot className="w-2.5 h-2.5" /> : null}
                          {session.mode === 'ai' ? 'هوش مصنوعی' : 'پاسخ دستی'}
                        </span>
                      </div>

                      {unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Middle Panel: Active Chat Thread */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 flex flex-col overflow-hidden shadow-sm">
          {activeSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/40 dark:bg-slate-950/10">
                <div className="flex items-center gap-3">
                  {crmProfile?.avatarUrl ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                      <img src={crmProfile.avatarUrl} alt={activeSession.name || 'Avatar'} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm flex-shrink-0">
                      {activeSession.name ? activeSession.name.charAt(0) : 'U'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-sm text-slate-800 dark:text-white">{activeSession.name || 'مشتری ناشناس'}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      {activeSession.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {activeSession.phone}</span>}
                      {activeSession.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {activeSession.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Mode Toggle Switch */}
                  {activeSession.status === 'active' && (
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/10">
                      <button
                        onClick={() => handleToggleMode('ai')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all ${
                          activeSession.mode === 'ai'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <Bot className="w-3.5 h-3.5" />
                        هوش مصنوعی
                      </button>
                      <button
                        onClick={() => handleToggleMode('manual')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all ${
                          activeSession.mode === 'manual'
                            ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        پاسخ دستی
                      </button>
                    </div>
                  )}

                  {activeSession.status === 'active' && (
                    <button
                      onClick={handleCloseSession}
                      className="px-3 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-all text-[10px] font-black"
                    >
                      اتمام گفتگو
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950/40 space-y-4">
                {loadingDetail ? (
                  <div className="flex flex-col justify-center items-center h-full gap-2 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-xs">در حال بارگذاری پیام‌ها...</span>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isAdmin = msg.sender === 'admin';
                    const isAi = msg.sender === 'ai';

                    if (msg.messageType === 'product' && msg.metadata) {
                      let productsList = [];
                      try {
                        productsList = JSON.parse(msg.metadata);
                      } catch (e) {}

                      return (
                        <div key={msg.id} className="flex flex-col gap-1.5 max-w-[70%] mr-auto">
                          <span className="text-[9px] text-slate-400 mr-1 flex items-center gap-1">
                            <Bot className="w-3 h-3 text-blue-500" /> دستیار هوشمند (محصولات پیشنهادی)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {productsList.map((prod: any) => (
                              <div key={prod.id} className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-100 dark:border-slate-800/80 shadow-sm flex gap-2.5">
                                {prod.imageUrl && (
                                  <div className="w-12 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                                    <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex-1 flex flex-col justify-between min-w-0">
                                  <span className="text-[11px] font-black text-slate-800 dark:text-white truncate">{prod.title}</span>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] font-black text-emerald-600">
                                      {formatPrice(prod.price - (prod.discount || 0))}
                                    </span>
                                    <Link 
                                      href={`/product/${prod.id}`}
                                      target="_blank"
                                      className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-blue-500"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (msg.messageType === 'article' && msg.metadata) {
                      let articlesList = [];
                      try {
                        articlesList = JSON.parse(msg.metadata);
                      } catch (e) {}

                      return (
                        <div key={msg.id} className="flex flex-col gap-1.5 max-w-[70%] mr-auto">
                          <span className="text-[9px] text-slate-400 mr-1 flex items-center gap-1">
                            <Bot className="w-3 h-3 text-blue-500" /> دستیار هوشمند (مقالات پیشنهادی)
                          </span>
                          <div className="space-y-2">
                            {articlesList.map((art: any) => (
                              <div key={art.id} className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-100 dark:border-slate-800/80 shadow-sm flex gap-2.5">
                                {art.featuredImage && (
                                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                                    <img src={art.featuredImage} alt={art.title} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex-1 flex flex-col justify-between min-w-0">
                                  <span className="text-[11px] font-black text-slate-800 dark:text-white truncate">{art.title}</span>
                                  <p className="text-[9px] text-slate-400 line-clamp-1">{art.summary}</p>
                                  <div className="flex justify-end mt-0.5">
                                    <Link 
                                      href={`/blog/${art.slug}`}
                                      target="_blank"
                                      className="p-1 text-[9px] font-bold text-blue-500 hover:underline flex items-center gap-0.5"
                                    >
                                      مطالعه <ExternalLink className="w-2.5 h-2.5" />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${isAdmin ? 'items-start' : isAi ? 'items-start' : 'items-end'} max-w-[75%] ${isAdmin ? 'mr-auto' : isAi ? 'mr-auto' : 'ml-auto'}`}
                      >
                        <span className="text-[9px] text-slate-400 mb-1 px-1">
                          {isAdmin ? 'شما (مدیر)' : isAi ? 'پاسخگوی هوشمند' : 'مشتری'}
                        </span>
                        <div 
                          className={`rounded-3xl text-sm leading-relaxed ${
                            msg.messageType === 'image' 
                              ? 'p-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm max-w-[200px] overflow-hidden' 
                              : msg.messageType === 'file'
                              ? 'p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm'
                              : `px-4 py-2.5 ${
                                  isAdmin 
                                    ? 'bg-blue-600 text-white rounded-bl-none' 
                                    : isAi 
                                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-none' 
                                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-br-none border border-slate-100 dark:border-slate-800/80 shadow-sm'
                                }`
                          }`}
                        >
                          {msg.messageType === 'image' ? (
                            <a href={msg.message} target="_blank" rel="noopener noreferrer">
                              <img src={msg.message} alt="ارسال شده" className="w-full h-auto rounded-xl hover:opacity-90 transition-opacity" />
                            </a>
                          ) : msg.messageType === 'file' ? (
                            <a href={msg.message} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline text-xs font-bold text-blue-500">
                              <Paperclip className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate max-w-[150px]">{msg.metadata || 'دانلود فایل'}</span>
                            </a>
                          ) : (
                            renderFormattedMessage(msg.message, isAdmin)
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              {activeSession.status === 'active' ? (
                <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex gap-2 items-center">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="پاسخ خود را بنویسید... (ارسال پیام پاسخگوی هوشمند را متوقف می‌کند)"
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 rotate-180" />
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 text-center text-xs text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  این گفتگو مختومه شده است و امکان ارسال پیام جدید وجود ندارد.
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-400 gap-3">
              <MessageSquare className="w-12 h-12 text-slate-300 animate-pulse" />
              <span className="text-xs font-bold">یک گفتگو را از لیست سمت راست انتخاب کنید.</span>
            </div>
          )}
        </div>

        {/* Left Panel: CRM Insights */}
        {activeSession && (
          <div className="w-80 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 flex flex-col overflow-hidden shadow-sm p-4 space-y-4">
            <h2 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-2">اطلاعات خریدار (CRM)</h2>
            
            {crmProfile ? (
              /* Registered User Profile */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {crmProfile.avatarUrl ? (
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                      <img src={crmProfile.avatarUrl} alt={crmProfile.name || 'Avatar'} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center text-lg font-black flex-shrink-0">
                      {crmProfile.name ? crmProfile.name.charAt(0) : 'U'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-xs text-slate-800 dark:text-white">{crmProfile.name || 'کاربر بدون نام'}</h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 mt-1 inline-block">
                      گروه: {crmProfile.group || 'عادی'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  {crmProfile.phone && <div className="flex justify-between"><span>تلفن:</span><span dir="ltr">{crmProfile.phone}</span></div>}
                  {crmProfile.email && <div className="flex justify-between"><span>ایمیل:</span><span dir="ltr">{crmProfile.email}</span></div>}
                </div>
              </div>
            ) : (
              /* Guest User Profile */
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/30 rounded-2xl flex flex-col items-center text-center gap-2">
                <User className="w-8 h-8 text-amber-500" />
                <span className="text-xs font-black text-amber-700 dark:text-amber-400">کاربر مهمان (ثبت‌نام نشده)</span>
                <p className="text-[9px] text-slate-400 leading-relaxed">این مشتری هنوز در فروشگاه ثبت‌نام نکرده است، اما سابقه خریدهای او بر اساس شماره تماس/ایمیل در زیر نمایش داده می‌شود.</p>
              </div>
            )}

            {/* Orders History */}
            <div className="flex-1 flex flex-col min-h-0">
              <h3 className="text-[10px] font-black text-slate-500 border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                سابقه خریدهای اخیر
              </h3>

              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                {crmOrders.length === 0 ? (
                  <div className="text-center py-8 text-[10px] text-slate-400">هیچ سفارش ثبت‌شده‌ای یافت نشد.</div>
                ) : (
                  crmOrders.map(order => (
                    <div key={order.id} className="p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[9px] font-black text-slate-700 dark:text-slate-300">
                        <span>سفارش #{order.id.slice(-6).toUpperCase()}</span>
                        <span className={`px-2 py-0.5 rounded-full ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                        <span>مبلغ نهایی:</span>
                        <span className="text-slate-800 dark:text-white font-black">{formatPrice(order.finalAmount || order.totalAmount)}</span>
                      </div>
                      <span className="text-[8px] text-slate-400 text-left">{formatDateTime(order.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsSettingsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-settings-title"
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg border border-slate-100 dark:border-slate-800/80 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[88vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="chat-settings-title" className="font-black text-sm text-slate-800 dark:text-white">
                    تنظیمات چت آنلاین
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">پیکربندی ابزارک، پشتیبان و سوالات متداول</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                aria-label="بستن"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 px-2">
              {([
                { id: 'general' as const, label: 'عمومی', icon: Power },
                { id: 'identity' as const, label: 'ظاهر پشتیبان', icon: Bot },
                { id: 'faqs' as const, label: 'سوالات متداول', icon: MessageSquare },
              ]).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSettingsModalTab(tab.id)}
                  className={`flex-1 py-3 text-[11px] font-black text-center border-b-2 transition-all outline-none flex items-center justify-center gap-1.5 ${
                    settingsModalTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Tab: General */}
                {settingsModalTab === 'general' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.enabled ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                          <Power className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-white">فعال‌سازی چت آنلاین</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">نمایش ابزارک چت شناور برای مشتریان در فروشگاه</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={settings.enabled}
                          onChange={e => setSettings({ ...settings, enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">اطلاعات مورد نیاز برای شروع گفتگو</h4>
                        <p className="text-[10px] text-slate-400 mt-1">حداقل یک مورد را فعال نگه دارید تا مشتری قابل شناسایی باشد.</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        {([
                          { key: 'requireName' as const, icon: User, label: 'نام و نشان' },
                          { key: 'requirePhone' as const, icon: Phone, label: 'شماره موبایل' },
                          { key: 'requireEmail' as const, icon: Mail, label: 'آدرس ایمیل' },
                        ]).map(item => {
                          const isActive = settings[item.key];
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key] })}
                              className={`relative p-3 rounded-2xl border text-[11px] font-black flex flex-col items-center gap-2 transition-all min-h-[88px] active:scale-[0.98] ${
                                isActive
                                  ? 'border-blue-500/40 bg-blue-50/60 text-blue-600 dark:bg-blue-950/25 dark:text-blue-400 shadow-sm shadow-blue-500/5'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              {isActive && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 absolute top-2 left-2" />
                              )}
                              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">حالت پاسخگویی پیش‌فرض</label>
                      <select
                        value={settings.defaultMode}
                        onChange={e => setSettings({ ...settings, defaultMode: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                      >
                        <option value="ai">هوش مصنوعی — پاسخگوی خودکار هوشمند</option>
                        <option value="manual">پاسخ دستی — اعلان و پاسخ توسط مدیر</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Tab: Identity */}
                {settingsModalTab === 'identity' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">نام نمایشی پشتیبان</label>
                      <input
                        type="text"
                        value={settings.supportName || ''}
                        onChange={e => setSettings({ ...settings, supportName: e.target.value })}
                        placeholder="مثال: پشتیبانی آنلاین"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">تصویر پروفایل پشتیبان</label>
                      <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                        <div className="relative w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {settings.supportAvatar ? (
                            <img src={settings.supportAvatar} alt="Support Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <Bot className="w-7 h-7 text-slate-400" />
                          )}
                          {uploadingSupportAvatar && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="cursor-pointer inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 transition-all">
                            <Paperclip className="w-3.5 h-3.5 ml-1.5" />
                            انتخاب تصویر
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSupportAvatarUpload}
                              className="hidden"
                              disabled={uploadingSupportAvatar}
                            />
                          </label>
                          {settings.supportAvatar && (
                            <button
                              type="button"
                              onClick={() => setSettings({ ...settings, supportAvatar: '' })}
                              className="text-[10px] text-rose-500 font-bold hover:underline"
                            >
                              حذف تصویر
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">پیام خوش‌آمدگویی</label>
                        <span className="text-[10px] text-slate-400 font-bold">{settings.welcomeMessage.length}/200</span>
                      </div>
                      <textarea
                        value={settings.welcomeMessage}
                        onChange={e => setSettings({ ...settings, welcomeMessage: e.target.value.slice(0, 200) })}
                        rows={3}
                        maxLength={200}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none"
                        placeholder="پیامی که در شروع گفتگو به کاربر نشان داده می‌شود..."
                      />
                    </div>
                  </div>
                )}

                {/* Tab: FAQs */}
                {settingsModalTab === 'faqs' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">سوالات متداول (FAQs)</h4>
                      <p className="text-[10px] text-slate-400 mt-1">این سوالات به‌صورت دکمه‌های سریع در ابزارک چت نمایش داده می‌شوند.</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-2.5">
                      <input
                        type="text"
                        value={newFaqQuestion}
                        onChange={e => setNewFaqQuestion(e.target.value)}
                        placeholder="سوال جدید..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                      />
                      <textarea
                        value={newFaqAnswer}
                        onChange={e => setNewFaqAnswer(e.target.value)}
                        rows={2}
                        placeholder="پاسخ سوال..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
                          setFaqs(prev => [...prev, { q: newFaqQuestion.trim(), a: newFaqAnswer.trim() }]);
                          setNewFaqQuestion('');
                          setNewFaqAnswer('');
                        }}
                        disabled={!newFaqQuestion.trim() || !newFaqAnswer.trim()}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        افزودن سوال
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400">لیست سوالات ({faqs.length})</span>
                      </div>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                        {faqs.length === 0 ? (
                          <div className="text-center py-8 text-xs text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            هنوز سوالی ثبت نشده است
                          </div>
                        ) : (
                          faqs.map((item, index) => (
                            <div key={index} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl flex items-start justify-between gap-3 group">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="text-xs font-black text-slate-800 dark:text-white flex items-start gap-1.5">
                                  <span className="text-blue-500 shrink-0">س:</span>
                                  <span className="break-words">{item.q}</span>
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed">
                                  <span className="text-emerald-500 shrink-0">ج:</span>
                                  <span className="break-words">{item.a}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setFaqs(prev => prev.filter((_, i) => i !== index))}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-rose-500 transition-colors opacity-70 group-hover:opacity-100 shrink-0"
                                aria-label="حذف سوال"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex-[2] py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs shadow-lg shadow-blue-500/10 hover:bg-blue-700 disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {savingSettings ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      در حال ذخیره...
                    </>
                  ) : (
                    'ذخیره تنظیمات'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
