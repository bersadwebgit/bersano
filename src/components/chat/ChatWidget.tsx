'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  User, 
  Phone, 
  Mail, 
  ArrowLeft, 
  Bot, 
  ExternalLink,
  MessageCircle,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  Sparkles
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

export default function ChatWidget() {
  const pathname = usePathname();
  const isAdminPath = pathname?.startsWith('/admin') || pathname?.startsWith('/super-admin');
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [themeColor, setThemeColor] = useState('#2563eb');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<string>('ai');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<{ name?: string; avatarUrl?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'help'>('chat');
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hasBottomNav, setHasBottomNav] = useState(true);

  useEffect(() => {
    if (isAdminPath) return;

    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.bottomNavConfig) {
          try {
            const parsed = JSON.parse(data.settings.bottomNavConfig);
            const enabled = parsed.enabled !== false;
            const excludedPages = parsed.excludedPages || ['/checkout', '/payment', '/login', '/register'];
            
            const isExcluded = excludedPages.some((page: string) => {
              if (page === '/') return pathname === '/';
              return pathname?.startsWith(page);
            }) || false;

            setHasBottomNav(enabled && !isExcluded);
          } catch (e) {
            console.error('Error parsing bottomNavConfig in ChatWidget', e);
            setHasBottomNav(true);
          }
        } else {
          // Default config behavior
          const excludedPages = ['/checkout', '/payment', '/login', '/register'];
          const isExcluded = excludedPages.some((page: string) => {
            if (page === '/') return pathname === '/';
            return pathname?.startsWith(page);
          }) || false;
          setHasBottomNav(!isExcluded);
        }
      })
      .catch(err => {
        console.error('Error fetching public settings in ChatWidget', err);
        setHasBottomNav(true);
      });
  }, [pathname, isAdminPath]);

  useEffect(() => {
    if (isOpen) {
      setIsButtonVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsButtonVisible(false); // scrolling down
      } else {
        setIsButtonVisible(true); // scrolling up
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isOpen]);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  const showBrowserNotification = (messageText: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(settings?.supportName || 'پشتیبانی آنلاین', {
          body: messageText,
          icon: settings?.supportAvatar || '/favicon.ico',
          dir: 'rtl'
        });
        
        notification.onclick = () => {
          window.focus();
          setIsOpen(true);
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
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      stopFlashing();
    }
  }, [isOpen]);

  async function fetchSessionMessages(id: string) {
    try {
      const res = await fetch(`/api/chat/session/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          const newMsgs = data.session.messages || [];
          const oldMsgs = messagesRef.current;
          
          // Check if there are new messages from admin
          if (oldMsgs.length > 0 && newMsgs.length > oldMsgs.length) {
            const addedMsgs = newMsgs.slice(oldMsgs.length);
            const hasNewAdminMsg = addedMsgs.some((m: Message) => m.sender === 'admin');
            if (hasNewAdminMsg) {
              const lastAdminMsg = [...addedMsgs].reverse().find((m: Message) => m.sender === 'admin');
              if (lastAdminMsg) {
                playNotificationSound();
                showBrowserNotification(lastAdminMsg.messageType === 'text' ? lastAdminMsg.message : 'یک فایل جدید ارسال شد');
                if (document.hidden || !document.hasFocus() || !isOpen) {
                  startFlashing();
                }
              }
            }
          }

          setMessages(newMsgs);
          setSessionMode(data.session.mode || 'ai');

          if (data.session.status === 'closed') {
            // If session closed by admin, clean up
            localStorage.removeItem('chat_session_id');
            setSessionId(null);
            setMessages([]);
          }
        }
      } else if (res.status === 404) {
        // Session not found in DB, clear local storage
        localStorage.removeItem('chat_session_id');
        setSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('[ERROR] [ChatWidgetMessages]:', err);
    }
  }

  // Hide on admin and super-admin paths

  useEffect(() => {
    if (isAdminPath) return;

    // Fetch chat settings
    fetch('/api/chat/settings')
      .then(res => res.json())
      .then(data => {
        if (data.chatSettings) {
          setSettings(data.chatSettings);
          setThemeColor(data.themeColor || '#2563eb');
          setContactPhone(data.contactPhone || '');
          setAddress(data.address || '');
          
          if (data.faqsConfig) {
            try {
              setFaqs(JSON.parse(data.faqsConfig));
            } catch (e) {
              console.error('[ERROR] [ChatWidgetFaqsParse]:', e);
            }
          }
        }
      })
      .catch(err => console.error('[ERROR] [ChatWidgetSettings]:', err));

    // Fetch customer profile if logged in
    fetch('/api/profile')
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data && data.user) {
          setCustomerProfile(data.user);
          setName(data.user.name || '');
          setPhone(data.user.phone || '');
          setEmail(data.user.email || '');
        }
      })
      .catch(err => console.error('[ERROR] [ChatWidgetProfile]:', err));

    // Restore session ID from localStorage
    const savedSessionId = localStorage.getItem('chat_session_id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      fetchSessionMessages(savedSessionId);
    }
  }, [isAdminPath]);

  // Handle polling for new messages when session is active
  useEffect(() => {
    if (sessionId) {
      fetchSessionMessages(sessionId);
      pollingRef.current = setInterval(() => {
        fetchSessionMessages(sessionId);
      }, 5000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [sessionId]);

  // Scroll to bottom when messages change or chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen, sending]);

  if (isAdminPath || !settings || !settings.enabled) {
    return null;
  }


  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Request notification permission
    requestNotificationPermission();

    if (settings.requireName && !name.trim()) {
      setFormError('لطفاً نام خود را وارد کنید');
      return;
    }
    if (settings.requirePhone && !phone.trim()) {
      setFormError('لطفاً شماره تماس خود را وارد کنید');
      return;
    }
    if (settings.requirePhone && !/^09\d{9}$/.test(phone.trim())) {
      setFormError('شماره تماس وارد شده معتبر نیست (نمونه: 09123456789)');
      return;
    }
    if (settings.requireEmail && !email.trim()) {
      setFormError('لطفاً ایمیل خود را وارد کنید');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          localStorage.setItem('chat_session_id', data.session.id);
          setSessionId(data.session.id);
          setSessionMode(data.session.mode || 'ai');
          
          // Add welcome message from settings if configured
          if (settings.welcomeMessage) {
            setMessages([
              {
                id: 'welcome',
                sender: 'ai',
                message: settings.welcomeMessage,
                messageType: 'text',
                createdAt: new Date().toISOString()
              }
            ]);
          }
        }
      } else {
        setFormError('خطا در شروع گفتگو. لطفاً دوباره تلاش کنید.');
      }
    } catch (err) {
      console.error('[ERROR] [ChatWidgetStart]:', err);
      setFormError('خطا در برقراری ارتباط با سرور.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !sessionId || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);
    setShowEmojiPicker(false);

    // Optimistically add user message to list
    const tempId = 'temp-' + Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      sender: 'customer',
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
          sessionId,
          message: messageText,
          sender: 'customer'
        })
      });

      if (res.ok) {
        // Refresh messages to get actual stored message and any AI auto-reply
        await fetchSessionMessages(sessionId);
      } else {
        // Remove optimistic message and restore input on failure
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setInputText(messageText);
      }
    } catch (err) {
      console.error('[ERROR] [ChatWidgetSend]:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId || uploadingFile) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('حداکثر حجم مجاز فایل ۵ مگابایت است.');
      return;
    }

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('فرمت فایل مجاز نیست. فقط تصاویر و فایل PDF مجاز می‌باشند.');
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);

    try {
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        
        // Send file message
        const msgRes = await fetch('/api/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: data.url,
            sender: 'customer',
            messageType: data.type, // 'image' or 'file'
            metadata: data.name // original filename
          })
        });

        if (msgRes.ok) {
          await fetchSessionMessages(sessionId);
        }
      } else {
        const errData = await res.json();
        alert(errData.error || 'خطا در آپلود فایل');
      }
    } catch (err) {
      console.error('[ERROR] [ChatWidgetUpload]:', err);
      alert('خطا در ارتباط با سرور جهت آپلود فایل.');
    } finally {
      setUploadingFile(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fa-IR') + ' تومان';
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tehran',
      });
    } catch {
      return '';
    }
  };

  const formatDateSeparator = (iso: string) => {
    try {
      const date = new Date(iso);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'امروز';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'دیروز';
      } else {
        return date.toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' });
      }
    } catch {
      return '';
    }
  };

  const renderFormattedMessage = (text: string, isUser: boolean) => {
    if (!text) return '';
    // Split by markdown bold format: **text**
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

  return (
    <div 
      className={`fixed z-50 select-none font-sans print:hidden transition-all duration-300 ${
        isOpen 
          ? 'inset-0 md:inset-auto md:bottom-6 md:right-6' 
          : `right-6 ${hasBottomNav ? 'bottom-24 md:bottom-6' : 'bottom-6'}`
      }`} 
      dir="rtl"
    >
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            requestNotificationPermission();
          }}
          aria-label="باز کردن پشتیبانی آنلاین"
          style={{ backgroundColor: themeColor }}
          className={`group flex items-center justify-center w-14 h-14 rounded-full shadow-2xl shadow-black/25 text-white hover:scale-105 active:scale-95 transition-all duration-300 relative ${
            isButtonVisible 
              ? 'translate-y-0 opacity-100 scale-100' 
              : 'translate-y-20 opacity-0 scale-50 pointer-events-none md:translate-y-0 md:opacity-100 md:scale-100 md:pointer-events-auto'
          }`}
        >
          <MessageCircle className="w-7 h-7 transition-transform duration-300 group-hover:scale-110" />
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-full h-[100dvh] md:w-[380px] md:h-[min(580px,calc(100vh-7rem))] bg-white dark:bg-slate-900 rounded-none md:rounded-3xl shadow-none md:shadow-2xl md:shadow-black/20 border-0 md:border md:border-slate-100 md:dark:border-slate-800/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-full md:slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <div 
            style={{ backgroundColor: themeColor }}
            className="relative p-5 text-white flex flex-col gap-4 shadow-md overflow-hidden flex-shrink-0"
          >
            {/* Subtle background pattern/gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            
            {/* Top Row: Close Button & Tabs */}
            <div className="relative flex items-center justify-between w-full">
              {/* Tabs like Crisp: "گفتگو" (Chat) */}
              <div className="flex gap-1 bg-white/15 backdrop-blur-md p-0.5 rounded-full text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-1 rounded-full flex items-center gap-1 transition-all ${
                    activeTab === 'chat'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" /> گفتگو
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('help')}
                  className={`px-3 py-1 rounded-full flex items-center gap-1 transition-all ${
                    activeTab === 'help'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  راهنما
                </button>
              </div>
              
              <button 
                onClick={() => setIsOpen(false)}
                aria-label="بستن گفتگو"
                className="p-2.5 md:p-1.5 hover:bg-white/15 rounded-full transition-all active:scale-90"
              >
                <X className="w-5 h-5 md:w-4 md:h-4" />
              </button>
            </div>

            {/* Agent Info Row */}
            <div className="relative flex items-center gap-3 mt-1">
              <div className="relative w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center ring-2 ring-white/30 shadow-lg overflow-hidden">
                {settings?.supportAvatar ? (
                  <img src={settings.supportAvatar} alt={settings.supportName || 'پشتیبانی آنلاین'} className="w-full h-full object-cover" />
                ) : (
                  <Bot className="w-7 h-7" />
                )}
                <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-sm tracking-wide">{settings?.supportName || 'پشتیبانی آنلاین'}</h3>
                <p className="text-[10px] text-white/80 mt-0.5 flex items-center gap-1">
                  پاسخگویی سریع و هوشمند فروشگاه
                </p>
              </div>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950/40 space-y-4">
            {activeTab === 'help' ? (
              /* Help / FAQ View */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="text-center space-y-1 py-2">
                  <h4 className="font-black text-slate-800 dark:text-white text-sm">سوالات متداول</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">پاسخ سوالات رایج خود را در این بخش بیابید.</p>
                </div>

                {faqs.length > 0 ? (
                  <div className="space-y-2.5">
                    {faqs.map((faq, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-1.5">
                        <span className="text-xs font-black text-slate-800 dark:text-white flex items-start gap-1.5">
                          <span className="text-blue-500 font-black">؟</span> {faq.q}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pr-3 border-r border-slate-100 dark:border-slate-800">
                          {faq.a}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400">
                    سوالی ثبت نشده است.
                  </div>
                )}

                {/* Contact Info */}
                {(contactPhone || address) && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2.5">
                    <h5 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-50 dark:border-slate-800/50 pb-1.5">راه‌های ارتباطی دیگر</h5>
                    {contactPhone && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>تلفن تماس:</span>
                        <a href={`tel:${contactPhone}`} className="font-bold text-blue-500 hover:underline" dir="ltr">{contactPhone}</a>
                      </div>
                    )}
                    {address && (
                      <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="block font-medium">آدرس فروشگاه:</span>
                          <span className="text-[11px] leading-relaxed block mt-0.5 text-slate-500">{address}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : !sessionId ? (
              /* Start Chat Form */
              <form onSubmit={handleStartChat} className="h-full flex flex-col justify-center space-y-4 px-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="text-center space-y-2 mb-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto shadow-inner">
                    <Sparkles className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                  </div>
                  <h4 className="font-black text-slate-800 dark:text-white text-base">شروع گفتگوی جدید</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">لطفاً اطلاعات زیر را جهت شروع گفتگو و راهنمایی بهتر وارد کنید.</p>
                </div>

                {formError && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-950/30 text-center animate-shake">
                    {formError}
                  </div>
                )}

                {settings.requireName && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-1">
                      <User className="w-3.5 h-3.5" /> نام و نام خانوادگی
                    </label>
                    <input
                      type="text"
                      value={name}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                      onChange={e => setName(e.target.value)}
                      placeholder="مثال: علی رضایی"
                      style={{ 
                        borderColor: nameFocused ? themeColor : undefined,
                        boxShadow: nameFocused ? `0 0 0 2px ${themeColor}15` : undefined
                      }}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-base md:text-sm focus:outline-none transition-all duration-200"
                    />
                  </div>
                )}

                {settings.requirePhone && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-1">
                      <Phone className="w-3.5 h-3.5" /> شماره تماس (موبایل)
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="مثال: 09123456789"
                      style={{ 
                        borderColor: phoneFocused ? themeColor : undefined,
                        boxShadow: phoneFocused ? `0 0 0 2px ${themeColor}15` : undefined
                      }}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-base md:text-sm focus:outline-none transition-all duration-200 text-left"
                      dir="ltr"
                    />
                  </div>
                )}

                {settings.requireEmail && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-1">
                      <Mail className="w-3.5 h-3.5" /> آدرس ایمیل
                    </label>
                    <input
                      type="email"
                      value={email}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="مثال: user@example.com"
                      style={{ 
                        borderColor: emailFocused ? themeColor : undefined,
                        boxShadow: emailFocused ? `0 0 0 2px ${themeColor}15` : undefined
                      }}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-base md:text-sm focus:outline-none transition-all duration-200 text-left"
                      dir="ltr"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={starting}
                  style={{ backgroundColor: themeColor }}
                  className="w-full py-3 rounded-2xl text-white font-black text-sm shadow-lg shadow-black/5 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {starting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      در حال اتصال...
                    </>
                  ) : (
                    'شروع گفتگو'
                  )}
                </button>
              </form>
            ) : (
              /* Message Thread */
              <div className="space-y-4">
                {messages.map((msg, index) => {
                  const isUser = msg.sender === 'customer';
                  const isAi = msg.sender === 'ai';
                  const showDate = index === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();
                  
                  if (msg.sender === 'admin' && msg.message === 'اتصال به کارشناس برقرار شد') {
                    return (
                      <div key={msg.id} className="space-y-3">
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 text-[10px] font-medium text-slate-500 dark:text-slate-400 shadow-sm">
                              {formatDateSeparator(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-center my-4 animate-in fade-in zoom-in-95 duration-300">
                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 dark:from-emerald-950/10 dark:to-slate-900 rounded-3xl p-4 border border-emerald-100 dark:border-emerald-900/30 shadow-md max-w-[90%] w-full flex flex-col items-center text-center gap-3">
                            <div className="relative">
                              <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center ring-4 ring-emerald-500/20 shadow-lg overflow-hidden">
                                {settings?.supportAvatar ? (
                                  <img src={settings.supportAvatar} alt={settings.supportName || 'کارشناس پشتیبانی'} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-8 h-8 text-emerald-500" />
                                )}
                              </div>
                              <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                            </div>
                            <div className="space-y-1">
                              <h5 className="text-xs font-black text-slate-800 dark:text-white">
                                {settings?.supportName || 'کارشناس پشتیبانی'}
                              </h5>
                              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                اتصال به کارشناس برقرار شد
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (msg.messageType === 'product' && msg.metadata) {
                    let productsList = [];
                    try {
                      productsList = JSON.parse(msg.metadata);
                    } catch (e) {}

                    return (
                      <div key={msg.id} className="space-y-3">
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 text-[10px] font-medium text-slate-500 dark:text-slate-400 shadow-sm">
                              {formatDateSeparator(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col gap-2 max-w-[85%] mr-auto animate-in fade-in duration-200">
                          <span className="text-[10px] text-slate-400 mr-2 flex items-center gap-1">
                            <Bot className="w-3 h-3 text-blue-500" /> دستیار هوشمند
                          </span>
                          <div className="space-y-2">
                            {productsList.map((prod: any) => (
                              <div key={prod.id} className="bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-100 dark:border-slate-800/80 shadow-sm flex gap-3 hover:shadow-md transition-all">
                                {prod.imageUrl && (
                                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 relative">
                                    <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex-1 flex flex-col justify-between min-w-0">
                                  <span className="text-xs font-black text-slate-800 dark:text-white truncate">{prod.title}</span>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                                      {formatPrice(prod.price - (prod.discount || 0))}
                                    </span>
                                    <Link 
                                      href={`/product/${prod.id}`}
                                      target="_blank"
                                      style={{ color: themeColor }}
                                      className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
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
                      <div key={msg.id} className="space-y-3">
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 text-[10px] font-medium text-slate-500 dark:text-slate-400 shadow-sm">
                              {formatDateSeparator(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col gap-2 max-w-[85%] mr-auto animate-in fade-in duration-200">
                          <span className="text-[10px] text-slate-400 mr-2 flex items-center gap-1">
                            <Bot className="w-3 h-3 text-blue-500" /> دستیار هوشمند
                          </span>
                          <div className="space-y-2">
                            {articlesList.map((art: any) => (
                              <div key={art.id} className="bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-100 dark:border-slate-800/80 shadow-sm flex gap-3 hover:shadow-md transition-all">
                                {art.featuredImage && (
                                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 relative">
                                    <img src={art.featuredImage} alt={art.title} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex-1 flex flex-col justify-between min-w-0">
                                  <span className="text-xs font-black text-slate-800 dark:text-white truncate">{art.title}</span>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{art.summary}</p>
                                  <div className="flex justify-end mt-1">
                                    <Link 
                                      href={`/blog/${art.slug}`}
                                      target="_blank"
                                      style={{ color: themeColor }}
                                      className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                                    >
                                      مطالعه مقاله <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="space-y-3">
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 text-[10px] font-medium text-slate-500 dark:text-slate-400 shadow-sm">
                            {formatDateSeparator(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex gap-2.5 items-end max-w-[85%] ${isUser ? 'ml-auto' : 'mr-auto'}`}>
                        {/* Other person (AI or Admin) bubble on the right side of avatar in RTL */}
                        {!isUser && (
                          <div className="flex flex-col items-start">
                            <span className="text-[9px] text-slate-400 mb-1 px-1 flex items-center gap-1">
                              {!isAi && settings?.supportName ? settings.supportName : isAi ? 'دستیار هوشمند' : 'مدیر فروشگاه'}
                            </span>
                            <div className={`rounded-2xl rounded-tl-none ${
                              msg.messageType === 'image' 
                                ? 'p-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm max-w-[200px] overflow-hidden' 
                                : msg.messageType === 'file'
                                ? 'p-3 bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-100 dark:border-slate-800/80 shadow-sm'
                                : 'px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm leading-relaxed whitespace-pre-wrap break-words border border-slate-100 dark:border-slate-800/80 shadow-sm'
                            }`}>
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
                                renderFormattedMessage(msg.message, false)
                              )}
                            </div>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        {!isUser && (
                          <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center border border-slate-200/50 dark:border-slate-700 shadow-sm flex-shrink-0 self-end mb-5 overflow-hidden">
                            {!isAi && settings?.supportAvatar ? (
                              <img src={settings.supportAvatar} alt="Support Avatar" className="w-full h-full object-cover" />
                            ) : isAi ? (
                              <Bot className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            ) : (
                              <User className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                            )}
                            <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
                          </div>
                        )}

                        {/* Customer bubble and avatar in RTL: avatar (right edge) first, bubble second */}
                        {isUser && (
                          <div className="flex flex-col items-end w-full">
                            <span className="text-[9px] text-slate-400 mb-1 px-1">
                              {customerProfile?.name || 'شما'}
                            </span>
                            <div 
                              style={msg.messageType === 'image' || msg.messageType === 'file' ? {} : { backgroundColor: themeColor }}
                              className={`rounded-2xl rounded-tr-none text-white text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                                msg.messageType === 'image'
                                  ? 'p-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 max-w-[200px] overflow-hidden'
                                  : msg.messageType === 'file'
                                  ? 'p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80'
                                  : 'px-4 py-2.5'
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
                                renderFormattedMessage(msg.message, true)
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1 px-1">
                              <span className="text-[8px] text-slate-400 dark:text-slate-500">
                                {formatTime(msg.createdAt)}
                              </span>
                              <CheckCheck className="w-3 h-3 opacity-60" style={{ color: themeColor }} />
                            </div>
                          </div>
                        )}

                        {isUser && (
                          <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center border border-slate-200/50 dark:border-slate-700 shadow-sm flex-shrink-0 self-end mb-5 overflow-hidden">
                            {customerProfile?.avatarUrl ? (
                              <img src={customerProfile.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {sessionMode === 'manual' && !messages.some(m => m.sender === 'admin') && (
                  <div className="flex justify-center my-4 animate-pulse">
                    <span className="px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-950/30 shadow-sm flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      در حال اتصال به کارشناس...
                    </span>
                  </div>
                )}
                {sending && (
                  <div className="flex gap-2.5 items-end max-w-[85%] mr-auto animate-in fade-in duration-200">
                    <div className="flex flex-col items-start">
                      <span className="text-[9px] text-slate-400 mb-1 px-1 flex items-center gap-1">
                        دستیار هوشمند در حال نوشتن
                      </span>
                      <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                      </div>
                    </div>
                    
                    <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center border border-slate-200/50 dark:border-slate-700 shadow-sm flex-shrink-0 self-end mb-1">
                      <Bot className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-white dark:ring-slate-900 animate-pulse" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input Bar */}
          {sessionId && activeTab === 'chat' && (
            <div 
              style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
              className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2 relative flex-shrink-0"
            >
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 right-4 left-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-xl p-2.5 grid grid-cols-6 gap-1.5 z-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {['😊', '👍', '❤️', '😂', '😍', '🙏', '🤔', '🎉', '👏', '😭', '🚀', '🔥', '💯', '🌟', '💡', '💬', '📞', '📍'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setInputText(prev => prev + emoji);
                      }}
                      className="w-8 h-8 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-lg active:scale-90 transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Hidden File Input */}
              <input
                type="file"
                id="chat-file-upload"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadingFile}
              />

              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onFocus={() => {
                    setTimeout(() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }}
                  placeholder="پیام خود را بنویسید..."
                  autoComplete="off"
                  enterKeyHint="send"
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl border-0 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-white text-base md:text-sm focus:outline-none focus:ring-1 focus:ring-offset-0 focus:ring-slate-200 dark:focus:ring-slate-800 transition-all"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  aria-label="ارسال پیام"
                  style={{ backgroundColor: themeColor }}
                  className="w-11 h-11 md:w-10 md:h-10 flex-shrink-0 rounded-2xl flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 shadow-md shadow-black/5"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 md:w-4 md:h-4 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 md:w-4 md:h-4 rotate-180" />
                  )}
                </button>
              </form>
              
              {/* Utility Row */}
              <div className="flex items-center justify-between px-1 text-slate-400 dark:text-slate-500">
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 md:p-1 rounded-lg transition-colors active:scale-90 ${showEmojiPicker ? 'text-blue-500' : 'hover:text-slate-600 dark:hover:text-slate-300'}`}
                    title="افزودن ایموجی"
                  >
                    <Smile className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => document.getElementById('chat-file-upload')?.click()}
                    disabled={uploadingFile}
                    className="p-2 md:p-1 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors active:scale-90 disabled:opacity-50"
                    title="پیوست فایل"
                  >
                    {uploadingFile ? (
                      <Loader2 className="w-5 h-5 md:w-4 md:h-4 animate-spin text-blue-500" />
                    ) : (
                      <Paperclip className="w-5 h-5 md:w-4 md:h-4" />
                    )}
                  </button>
                </div>
                <span className="text-[9px] font-medium text-slate-300 dark:text-slate-600 select-none">
                  پشتیبانی هوشمند فروشگاه
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
