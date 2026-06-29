// [HARDENED] — validation, error isolation, save safety
'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Mail, Phone, Calendar, ShoppingBag, Eye, X, MapPin, Plus, Save, Lock, Unlock, Key, ShieldAlert, Settings, Sparkles, Loader2, Check, AlertTriangle, AlertCircle, Download, Store, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';

type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  isBlocked: boolean;
  isWholesaler: boolean;
  creditLimit: number;
  creditBalance: number;
  wholesaleGroup?: string | null;
  loyaltyPoints: number;
  group?: string | null;
  addresses: Address[];
  orders: Order[];
};

type Address = {
  id: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string | null;
};

type Order = {
  id: string;
  status: string;
  finalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: {
    title: string;
  };
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '' });

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Customer Club Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [clubSettings, setClubSettings] = useState({
    customerClubEnabled: false,
    loyaltyPointsRate: 10000,
    loyaltyPointValue: 100,
    loyaltyDiscountThreshold: 100,
    loyaltyDiscountAmount: 50000,
    loyaltyDiscountType: 'flat',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual group state
  const [isChangingGroup, setIsChangingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState('');

  // Wholesale Requests State
  const [wholesaleRequests, setWholesaleRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');

  // Credit Editing State
  const [isEditingCredit, setIsEditingCredit] = useState(false);
  const [editCreditLimit, setEditCreditLimit] = useState(0);
  const [resetCreditBalance, setResetCreditBalance] = useState(false);
  const [isUpdatingCredit, setIsUpdatingCredit] = useState(false);

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [proposedActions, setProposedActions] = useState<any[]>([]);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchSettings();
    fetchRequests();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setWholesaleEnabled(!!data.settings.wholesaleEnabled);
          setClubSettings({
            customerClubEnabled: !!data.settings.customerClubEnabled,
            loyaltyPointsRate: data.settings.loyaltyPointsRate || 10000,
            loyaltyPointValue: data.settings.loyaltyPointValue || 100,
            loyaltyDiscountThreshold: data.settings.loyaltyDiscountThreshold || 100,
            loyaltyDiscountAmount: data.settings.loyaltyDiscountAmount || 50000,
            loyaltyDiscountType: data.settings.loyaltyDiscountType || 'flat',
          });
        }
      }
    } catch (error) {
      console.error('[ERROR] [Users]: Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clubSettings),
      });
      if (res.ok) {
        alert('تنظیمات باشگاه مشتریان با موفقیت ذخیره شد.');
        setIsSettingsOpen(false);
      } else {
        alert('خطا در ذخیره تنظیمات');
      }
    } catch (error) {
      console.error('[ERROR] [Users]: Error saving settings:', error);
      alert('خطای ارتباط با سرور');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangeGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newGroup) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changeGroup', group: newGroup })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert('گروه کاربر با موفقیت تغییر یافت');
        // Update local state
        const updatedUsers = users.map(u => 
          u.id === selectedUser.id ? { ...u, group: data.group } : u
        );
        setUsers(updatedUsers);
        setSelectedUser({ ...selectedUser, group: data.group });
        setIsChangingGroup(false);
        setNewGroup('');
      } else {
        alert(data.error || 'خطا در تغییر گروه کاربر');
      }
    } catch (error) {
      console.error('[ERROR] [Users]: Error changing group:', error);
      alert('خطای ارتباط با سرور');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const exportToExcel = (usersToExport: User[], filename = 'crm-users-export.xlsx') => {
    try {
      const data = usersToExport.map(u => ({
        'نام و نام خانوادگی': u.name || 'بدون نام',
        'ایمیل': u.email,
        'تلفن همراه': u.addresses?.[0]?.phone || 'ثبت نشده',
        'امتیاز باشگاه': u.loyaltyPoints || 0,
        'گروه/دسته': u.group || 'عادی',
        'وضعیت': u.isBlocked ? 'مسدود شده' : 'فعال',
        'تاریخ ثبت‌نام': new Date(u.createdAt).toLocaleDateString('fa-IR'),
        'تعداد سفارشات': u.orders?.length || 0
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'کاربران');
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error('[ERROR] [Export]: Failed to export to Excel:', error);
      alert('خطا در تولید فایل اکسل');
    }
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiWarnings([]);
    setProposedActions([]);
    setAiExplanation('');

    try {
      const res = await fetch('/api/admin/users/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          users,
          settings: clubSettings,
          wholesaleRequests
        })
      });
      const data = res.ok ? await res.json() : null;
      if (!res.ok || !data) {
        alert(data?.error || 'خطایی در ارتباط با دستیار هوشمند رخ داد.');
        return;
      }
      if (data.success) {
        setProposedActions(data.actions || []);
        setAiExplanation(data.explanation || '');
        setAiWarnings(data.warnings || []);
      } else {
        alert(data.explanation || 'دستیار هوشمند نتوانست دستور را پردازش کند.');
      }
    } catch (error) {
      console.error(error);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyProposedActions = async () => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    setSaveStatus('saving');
    setSaveError('');
    try {
      let updatedClubSettings = { ...clubSettings };
      
      for (const action of proposedActions) {
        if (action.type === 'updateSettings') {
          const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...updatedClubSettings,
              ...action.data
            })
          });
          if (res.ok) {
            updatedClubSettings = { ...updatedClubSettings, ...action.data };
          }
        } else if (action.type === 'updateUserGroup') {
          await fetch(`/api/admin/users/${action.userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'changeGroup', group: action.group })
          });
        } else if (action.type === 'adjustUserPoints') {
          await fetch(`/api/admin/users/${action.userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'adjustPoints', points: action.points, reason: action.reason })
          });
        } else if (action.type === 'toggleUserBlock') {
          await fetch(`/api/admin/users/${action.userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggleBlock', isBlocked: action.isBlocked })
          });
        } else if (action.type === 'changeUserPassword') {
          await fetch(`/api/admin/users/${action.userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'changePassword', password: action.password })
          });
        } else if (action.type === 'updateUserDetails') {
          await fetch(`/api/admin/users/${action.userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'updateUser', ...action.data })
          });
        } else if (action.type === 'toggleWholesaler') {
          await fetch(`/api/admin/users/${action.userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'toggleWholesaler', 
              isWholesaler: action.isWholesaler, 
              requestId: action.requestId, 
              status: action.status 
            })
          });
        } else if (action.type === 'updateCredit') {
          await fetch(`/api/admin/users/${action.userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'updateCredit', 
              creditLimit: action.creditLimit, 
              resetBalance: action.resetBalance 
            })
          });
        } else if (action.type === 'createUser') {
          await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.data)
          });
        } else if (action.type === 'exportUsers') {
          let usersToExport = [...users];
          if (action.filters) {
            const { group, isBlocked, minPoints, maxPoints, userIds } = action.filters;
            if (userIds && Array.isArray(userIds) && userIds.length > 0) {
              usersToExport = usersToExport.filter(u => userIds.includes(u.id));
            } else {
              if (group) {
                usersToExport = usersToExport.filter(u => u.group === group);
              }
              if (isBlocked !== undefined) {
                usersToExport = usersToExport.filter(u => u.isBlocked === isBlocked);
              }
              if (minPoints !== undefined) {
                usersToExport = usersToExport.filter(u => (u.loyaltyPoints || 0) >= minPoints);
              }
              if (maxPoints !== undefined) {
                usersToExport = usersToExport.filter(u => (u.loyaltyPoints || 0) <= maxPoints);
              }
            }
          }
          exportToExcel(usersToExport, `crm-users-export-${Date.now()}.xlsx`);
        }
      }

      setClubSettings(updatedClubSettings);
      setProposedActions([]);
      setAiExplanation('');
      setAiPrompt('');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 5000);
      await fetchUsers();
      await fetchRequests();
      alert('تغییرات با موفقیت اعمال و ذخیره شدند.');
    } catch (error: any) {
      console.error('Failed to apply actions:', error);
      setSaveStatus('error');
      setSaveError(error.message || 'برخی از تغییرات ممکن است به درستی ذخیره نشده باشند.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('[ERROR] [Users]: Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/admin/wholesale/requests');
      if (res.ok) {
        const data = await res.json();
        setWholesaleRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveRequest = async (request: any) => {
    if (!confirm(`آیا از تایید درخواست همکاری ${request.companyName} اطمینان دارید؟`)) return;
    try {
      const res = await fetch(`/api/admin/users/${request.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleWholesaler',
          isWholesaler: true,
          requestId: request.id,
          status: 'approved'
        })
      });
      if (res.ok) {
        alert('درخواست همکاری با موفقیت تایید شد.');
        fetchRequests();
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در تایید درخواست');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('خطا در ارتباط با سرور');
    }
  };

  const handleRejectRequest = async (request: any) => {
    if (!confirm(`آیا از رد درخواست همکاری ${request.companyName} اطمینان دارید؟`)) return;
    try {
      const res = await fetch(`/api/admin/users/${request.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleWholesaler',
          isWholesaler: false,
          requestId: request.id,
          status: 'rejected'
        })
      });
      if (res.ok) {
        alert('درخواست همکاری رد شد.');
        fetchRequests();
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در رد درخواست');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('خطا در ارتباط با سرور');
    }
  };

  const handleUpdateCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (editCreditLimit < selectedUser.creditBalance) {
      alert('سقف اعتبار نمی‌تواند کمتر از بدهی فعلی کاربر باشد');
      return;
    }

    setIsUpdatingCredit(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCredit',
          creditLimit: editCreditLimit,
          resetBalance: resetCreditBalance
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('اعتبار کاربر با موفقیت بروزرسانی شد');
        // Update local state
        const updatedUsers = users.map(u => 
          u.id === selectedUser.id ? { ...u, creditLimit: data.creditLimit, creditBalance: data.creditBalance } : u
        );
        setUsers(updatedUsers);
        setSelectedUser({ ...selectedUser, creditLimit: data.creditLimit, creditBalance: data.creditBalance });
        setIsEditingCredit(false);
        setResetCreditBalance(false);
      } else {
        alert(data.error || 'خطا در بروزرسانی اعتبار');
      }
    } catch (error) {
      console.error('Error updating credit:', error);
      alert('خطای ارتباط با سرور');
    } finally {
      setIsUpdatingCredit(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) {
      alert('ایمیل و رمز عبور الزامی است');
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setUsers([data.user, ...users]);
        setIsAdding(false);
        setNewUser({ name: '', email: '', phone: '', password: '' });
      } else {
        alert(data.error || 'خطا در ایجاد مشتری');
      }
    } catch (error) {
      console.error('[ERROR] [Users]: Error adding user:', error);
      alert('خطای ارتباط با سرور');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'در انتظار';
      case 'paid': return 'پرداخت شده';
      case 'shipped': return 'ارسال شده';
      case 'delivered': return 'تحویل شده';
      case 'cancelled': return 'لغو شده';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'paid': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword || newPassword.length < 6) {
      alert('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changePassword', password: newPassword })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert('رمز عبور با موفقیت تغییر یافت');
        setIsChangingPassword(false);
        setNewPassword('');
      } else {
        alert(data.error || 'خطا در تغییر رمز عبور');
      }
    } catch (error) {
      console.error('[ERROR] [Users]: Error changing password:', error);
      alert('خطای ارتباط با سرور');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleBlockUser = async (user: User) => {
    if (!confirm(`آیا از ${user.isBlocked ? 'رفع مسدودیت' : 'مسدود کردن'} این کاربر اطمینان دارید؟`)) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleBlock', isBlocked: !user.isBlocked })
      });
      
      const data = await res.json();
      if (res.ok) {
        // Update local state
        const updatedUsers = users.map(u => 
          u.id === user.id ? { ...u, isBlocked: data.isBlocked } : u
        );
        setUsers(updatedUsers);
        if (selectedUser && selectedUser.id === user.id) {
          setSelectedUser({ ...selectedUser, isBlocked: data.isBlocked });
        }
        alert(data.message);
      } else {
        alert(data.error || 'خطا در تغییر وضعیت کاربر');
      }
    } catch (error) {
      console.error('[ERROR] [Users]: Error toggling block status:', error);
      alert('خطای ارتباط با سرور');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedUser) return;
    await handleToggleBlockUser(selectedUser);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
      (u.addresses[0]?.phone && u.addresses[0].phone.includes(search));
    return matchesSearch;
  });

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fa-IR')} تومان`;
  };

  const formatNum = (num: number | string) => {
    if (typeof num === 'string') {
      return num.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
    }
    return num.toLocaleString('fa-IR');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none">
      
      {/* Header Banner - Floating Box Layout */}
      <div className="bg-gradient-to-r from-blue-600/[0.07] via-indigo-600/[0.03] to-transparent dark:from-blue-500/10 dark:via-indigo-500/5 dark:to-transparent rounded-3xl p-6 border border-blue-500/10 dark:border-blue-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-500" />
            باشگاه مشتریان و CRM
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">نمایش اطلاعات کاربران، آدرس‌ها، تاریخچه خریدهای نهایی، مدیریت دسترسی و تغییر رمز عبور</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98 hover:shadow-md shrink-0 border border-slate-200/50 dark:border-slate-700/50"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            تنظیمات باشگاه مشتریان
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98 hover:shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" />
            افزودن عضو جدید به باشگاه
          </button>
        </div>
      </div>

      {/* AI Assistant Section */}
      <div className="bg-gradient-to-br from-purple-600/[0.06] to-indigo-600/[0.02] dark:from-purple-500/10 dark:to-indigo-500/5 p-6 rounded-3xl border border-purple-500/10 dark:border-purple-500/5 shadow-sm space-y-4 text-right">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-600 rounded-2xl dark:bg-purple-500/20 dark:text-purple-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white">دستیار هوشمند مدیریت مشتریان و باشگاه</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed mt-0.5">
              با نوشتن دستورهای متنی ساده، تنظیمات باشگاه مشتریان را تغییر دهید، امتیاز کاربران را دستی کم یا زیاد کنید، گروه آن‌ها را تغییر دهید یا خروجی اکسل فیلتر شده بگیرید!
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="مثال: باشگاه مشتریان را فعال کن و حد نصاب امتیاز را روی ۱۵۰ بذار..."
              className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAiSubmit();
                }
              }}
              disabled={isAiLoading}
            />
            <button
              type="button"
              disabled={isAiLoading || !aiPrompt.trim()}
              onClick={handleAiSubmit}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {isAiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال پردازش...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>اعمال دستور</span>
                </>
              )}
            </button>
          </div>

          {/* Suggestions / Prompt Templates */}
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold self-center ml-1">پیشنهادها:</span>
            {[
              { text: 'باشگاه مشتریان را فعال کن و حد نصاب امتیاز را روی ۱۵۰ بذار', label: 'فعال‌سازی باشگاه با حد نصاب ۱۵۰' },
              { text: 'امتیاز علی تاجیک را ۵۰ تا افزایش بده به علت خرید حضوری', label: 'افزایش امتیاز علی تاجیک' },
              { text: 'کاربران گروه طلایی را مسدود کن', label: 'مسدودسازی گروه طلایی' },
              { text: 'از تمام کاربرانی که امتیاز بالای ۵۰ دارند خروجی اکسل بگیر', label: 'خروجی اکسل امتیاز بالاها' }
            ].map((sug, idx) => (
              <button
                key={idx}
                onClick={() => setAiPrompt(sug.text)}
                className="text-[9px] bg-white hover:bg-purple-50 dark:bg-slate-900 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold"
              >
                {sug.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Proposed Actions Display */}
      {proposedActions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-purple-200 dark:border-purple-900/50 shadow-lg space-y-6 animate-in fade-in slide-in-from-top-4 text-right">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-2xl dark:bg-emerald-500/20 dark:text-emerald-400">
                <Check size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">اقدامات پیشنهادی هوش مصنوعی</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-bold">لطفاً تغییرات پیشنهادی زیر را بررسی و سپس ثبت نهایی کنید.</p>
              </div>
            </div>
          </div>

          {aiExplanation && (
            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
              💡 {aiExplanation}
            </div>
          )}

          {aiWarnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/20 space-y-2">
              <h4 className="text-xs font-black text-amber-700 dark:text-amber-450 flex items-center gap-1.5">
                <AlertTriangle size={16} />
                هشدارهای دستیار هوشمند:
              </h4>
              <ul className="list-disc list-inside text-[11px] font-bold text-amber-600 dark:text-amber-400 space-y-1">
                {aiWarnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">لیست عملیات‌های آماده اعمال:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposedActions.map((action, idx) => (
                <div key={idx} className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                    {action.type === 'updateSettings' && <Settings size={18} />}
                    {action.type === 'updateUserGroup' && <Users size={18} />}
                    {action.type === 'adjustUserPoints' && <Plus size={18} />}
                    {action.type === 'toggleUserBlock' && <Lock size={18} />}
                    {action.type === 'changeUserPassword' && <Key size={18} />}
                    {action.type === 'updateUserDetails' && <Users size={18} />}
                    {action.type === 'createUser' && <Plus size={18} />}
                    {action.type === 'exportUsers' && <Download size={18} />}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-black text-slate-800 dark:text-white block">
                      {action.type === 'updateSettings' && 'تغییر تنظیمات باشگاه مشتریان'}
                      {action.type === 'updateUserGroup' && `تغییر گروه کاربر: ${action.userName}`}
                      {action.type === 'adjustUserPoints' && `تغییر امتیاز کاربر: ${action.userName}`}
                      {action.type === 'toggleUserBlock' && `تغییر وضعیت مسدودیت: ${action.userName}`}
                      {action.type === 'changeUserPassword' && `تغییر رمز عبور: ${action.userName}`}
                      {action.type === 'updateUserDetails' && `ویرایش اطلاعات کاربر: ${action.userName}`}
                      {action.type === 'createUser' && `ثبت مشتری جدید: ${action.data.name}`}
                      {action.type === 'exportUsers' && 'خروجی اکسل از کاربران'}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                      {action.type === 'updateSettings' && `تغییرات: ${Object.entries(action.data).map(([k, v]) => `${k}: ${v}`).join('، ')}`}
                      {action.type === 'updateUserGroup' && `انتقال به گروه "${action.group}"`}
                      {action.type === 'adjustUserPoints' && `تغییر به میزان ${action.points > 0 ? `+${action.points}` : action.points} امتیاز (علت: ${action.reason})`}
                      {action.type === 'toggleUserBlock' && (action.isBlocked ? 'مسدودسازی کاربر' : 'رفع مسدودیت کاربر')}
                      {action.type === 'changeUserPassword' && `تنظیم کلمه عبور جدید`}
                      {action.type === 'updateUserDetails' && `تغییرات: ${Object.entries(action.data).map(([k, v]) => `${k}: ${v}`).join('، ')}`}
                      {action.type === 'createUser' && `ایمیل: ${action.data.email}`}
                      {action.type === 'exportUsers' && (action.explanation || 'دانلود فایل اکسل بر اساس فیلترهای مشخص شده')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* خطا در ذخیره‌سازی تغییرات */}
          {saveStatus === 'error' && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-4 rounded-2xl mb-4 font-black text-xs text-right flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{saveError || 'خطایی در ثبت نهایی تغییرات رخ داد.'}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => {
                setProposedActions([]);
                setAiExplanation('');
                setAiPrompt('');
                setSaveStatus('idle');
                setSaveError('');
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              انصراف و لغو
            </button>
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={handleApplyProposedActions}
              data-testid="save-status"
              data-status-state={saveStatus}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check size={16} />
              {isUpdatingStatus ? 'در حال ثبت نهایی...' : 'تایید و اعمال نهایی تغییرات'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 text-xs font-black transition-all border-b-2 ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          لیست کاربران
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-3 text-xs font-black transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          درخواست‌های همکاری
          {wholesaleRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {wholesaleRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Filter - Independent Rounded Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/80">
            <div className="relative max-w-md">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
              <input 
                type="text" 
                placeholder="جستجو بر اساس نام خانوادگی، آدرس ایمیل، تلفن همراه..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-4 pr-11 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs font-bold text-slate-800 dark:text-white transition-all shadow-sm focus:border-blue-500"
              />
            </div>
          </div>

          {/* CRM Users Table - Premium Floating Box Design */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right text-xs font-bold">
                <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-slate-450 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60 select-none">
                  <tr>
                    <th className="p-4.5 font-black">نام مشتری</th>
                    <th className="p-4.5 font-black">شماره همراه</th>
                    <th className="p-4.5 font-black">ایمیل</th>
                    <th className="p-4.5 font-black text-center">وضعیت کاربری</th>
                    <th className="p-4.5 font-black text-center">تاریخ پیوستن</th>
                    <th className="p-4.5 font-black text-center">سفارشات نهایی</th>
                    <th className="p-4.5 font-black text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                          <span className="font-bold text-xs">در حال بارگذاری باشگاه مشتریان...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Users className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                          <span className="font-black text-sm">هیچ مشتری مشخصی یافت نشد!</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/15 transition-colors group">
                        <td className="p-4.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/10 text-blue-600 dark:text-blue-450 rounded-xl flex items-center justify-center text-xs font-black shrink-0">
                              {user.name ? user.name.charAt(0) : 'ک'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-slate-800 dark:text-slate-100 text-sm group-hover:text-blue-500 transition-colors">
                                {user.name || 'مشتری جدید (بدون نام)'}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                  گروه: {user.group || 'عادی'}
                                </span>
                                {wholesaleEnabled && user.isWholesaler && (
                                  <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-[9px] font-black px-1.5 py-0.5 rounded">
                                    همکار عمده‌فروش
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4.5 text-slate-600 dark:text-slate-400 font-bold select-all">
                          {user.addresses[0]?.phone ? formatNum(user.addresses[0].phone) : '-'}
                        </td>
                        <td className="p-4.5 text-slate-500 dark:text-slate-400 select-all text-xs font-medium">
                          {user.email}
                        </td>
                        <td className="p-4.5 text-center">
                          {user.isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-200/20">
                              <Lock className="w-3 h-3" />
                              مسدود شده
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/20">
                              <Unlock className="w-3 h-3" />
                              فعال
                            </span>
                          )}
                        </td>
                        <td className="p-4.5 text-center text-slate-500 dark:text-slate-450 font-bold" dir="ltr">
                          {new Date(user.createdAt).toLocaleDateString('fa-IR')}
                        </td>
                        <td className="p-4.5 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-450 shadow-sm">
                            {formatNum(user.orders?.length || 0)}
                          </span>
                        </td>
                        <td className="p-4.5 text-left">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedUser(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-blue-600 hover:text-white bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-600 dark:hover:bg-blue-600 border border-blue-500/10 rounded-xl transition-all shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              مشاهده سوابق مشتری
                            </button>
                            <button 
                              onClick={() => handleToggleBlockUser(user)}
                              disabled={isUpdatingStatus}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl transition-all border shadow-sm ${
                                user.isBlocked 
                                  ? 'text-emerald-600 hover:text-white bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-600 dark:hover:bg-emerald-600 border-emerald-500/10' 
                                  : 'text-rose-600 hover:text-white bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-600 dark:hover:bg-rose-600 border-rose-500/10'
                              }`}
                            >
                              {user.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              {user.isBlocked ? 'رفع مسدودیت' : 'مسدود کردن'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Pending Requests */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">درخواست‌های در انتظار بررسی</h3>
              <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-black px-2.5 py-1 rounded-full">
                {formatNum(wholesaleRequests.filter(r => r.status === 'pending').length)} درخواست
              </span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right text-xs font-bold">
                <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-slate-450 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60 select-none">
                  <tr>
                    <th className="p-4.5 font-black">نام متقاضی</th>
                    <th className="p-4.5 font-black">نام شرکت / فروشگاه</th>
                    <th className="p-4.5 font-black">نوع کسب و کار</th>
                    <th className="p-4.5 font-black">تلفن تماس</th>
                    <th className="p-4.5 font-black text-center">تاریخ ثبت</th>
                    <th className="p-4.5 font-black text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                  {loadingRequests ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                          <span className="font-bold text-xs">در حال بارگذاری درخواست‌ها...</span>
                        </div>
                      </td>
                    </tr>
                  ) : wholesaleRequests.filter(r => r.status === 'pending').length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-16 text-center text-slate-450">
                        هیچ درخواست جدیدی در انتظار بررسی نیست.
                      </td>
                    </tr>
                  ) : (
                    wholesaleRequests.filter(r => r.status === 'pending').map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/15 transition-colors">
                        <td className="p-4.5">{req.user?.name || 'بدون نام'}</td>
                        <td className="p-4.5">{req.companyName}</td>
                        <td className="p-4.5">
                          {req.businessType === 'retailer' && 'خرده فروش'}
                          {req.businessType === 'distributor' && 'توزیع کننده'}
                          {req.businessType === 'manufacturer' && 'تولید کننده'}
                          {req.businessType === 'other' && 'سایر'}
                        </td>
                        <td className="p-4.5 select-all">{formatNum(req.phone)}</td>
                        <td className="p-4.5 text-center" dir="ltr">{new Date(req.createdAt).toLocaleDateString('fa-IR')}</td>
                        <td className="p-4.5 text-left">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveRequest(req)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-500/10 rounded-xl transition-all font-black"
                            >
                              تایید درخواست
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-500/10 rounded-xl transition-all font-black"
                            >
                              رد درخواست
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Collapsed Approved/Rejected Requests */}
          <details className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden group">
            <summary className="p-5 font-black text-sm text-slate-800 dark:text-white cursor-pointer select-none flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-slate-950/30">
              <span>تاریخچه درخواست‌های تایید یا رد شده</span>
              <span className="text-xs text-slate-400 font-bold">کلیک کنید تا باز شود</span>
            </summary>
            <div className="border-t border-slate-100 dark:border-slate-800/60 overflow-x-auto custom-scrollbar">
              <table className="w-full text-right text-xs font-bold">
                <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-slate-450 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60 select-none">
                  <tr>
                    <th className="p-4.5 font-black">نام متقاضی</th>
                    <th className="p-4.5 font-black">نام شرکت / فروشگاه</th>
                    <th className="p-4.5 font-black">نوع کسب و کار</th>
                    <th className="p-4.5 font-black">تلفن تماس</th>
                    <th className="p-4.5 font-black text-center">وضعیت</th>
                    <th className="p-4.5 font-black text-center">تاریخ ثبت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                  {wholesaleRequests.filter(r => r.status !== 'pending').length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-450">
                        تاریخچه‌ای وجود ندارد.
                      </td>
                    </tr>
                  ) : (
                    wholesaleRequests.filter(r => r.status !== 'pending').map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/15 transition-colors">
                        <td className="p-4.5">{req.user?.name || 'بدون نام'}</td>
                        <td className="p-4.5">{req.companyName}</td>
                        <td className="p-4.5">
                          {req.businessType === 'retailer' && 'خرده فروش'}
                          {req.businessType === 'distributor' && 'توزیع کننده'}
                          {req.businessType === 'manufacturer' && 'تولید کننده'}
                          {req.businessType === 'other' && 'سایر'}
                        </td>
                        <td className="p-4.5 select-all">{formatNum(req.phone)}</td>
                        <td className="p-4.5 text-center">
                          {req.status === 'approved' ? (
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">تایید شده</span>
                          ) : (
                            <span className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-full">رد شده</span>
                          )}
                        </td>
                        <td className="p-4.5 text-center" dir="ltr">{new Date(req.createdAt).toLocaleDateString('fa-IR')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* Add New Customer Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2.5">
                <Users className="w-5 h-5 text-blue-500" />
                ثبت مشتری جدید در سیستم
              </h3>
              <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">نام و نام خانوادگی</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">آدرس ایمیل</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white text-left dir-ltr"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">شماره همراه</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">گذرواژه (پسورد)</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="px-1 py-3.5 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-3.5">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  انصراف
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-sm transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'در حال ثبت...' : 'ثبت نام مشتری'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic User Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/30">
              <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2.5">
                <Users className="w-5 h-5 text-blue-500" />
                سوابق کاربری و اطلاعات کامل مشتری
              </h3>
              <button 
                onClick={() => {
                  setSelectedUser(null);
                  setIsChangingPassword(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Profile Sidebar */}
                <div className="lg:col-span-1 space-y-5">
                  <div className="bg-slate-50/50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-5">
                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-4">
                      <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center text-lg font-black shrink-0 shadow-md">
                        {selectedUser.name ? selectedUser.name.charAt(0) : 'ک'}
                      </div>
                      <div className="overflow-hidden space-y-1">
                        <h4 className="font-black text-base text-slate-800 dark:text-white truncate">
                          {selectedUser.name || 'بدون نام'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">مشتری دائم باشگاه</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100/20">
                            گروه {selectedUser.group || 'عادی'}
                          </span>
                          {wholesaleEnabled && selectedUser.isWholesaler && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100/20">
                              همکار عمده‌فروش
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3.5 text-xs font-bold text-slate-600 dark:text-slate-350">
                      <div className="flex items-start gap-3">
                        <Phone className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold">شماره همراه</div>
                          <div className="text-slate-700 dark:text-slate-200 mt-1 select-all">{selectedUser.addresses[0]?.phone ? formatNum(selectedUser.addresses[0].phone) : '-'}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold">پست الکترونیک</div>
                          <div className="text-slate-700 dark:text-slate-200 mt-1 select-all break-all">{selectedUser.email}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold">تاریخ ثبت‌نام</div>
                          <div className="text-slate-700 dark:text-slate-200 mt-1" dir="ltr">{new Date(selectedUser.createdAt).toLocaleDateString('fa-IR')}</div>
                        </div>
                      </div>

                      {selectedUser.addresses.length > 0 && (
                        <div className="flex items-start gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                          <MapPin className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                          <div>
                            <div className="text-[10px] text-slate-400 font-bold">آدرس ارسال مرسوله</div>
                            <div className="text-slate-700 dark:text-slate-200 mt-1 text-[11px] leading-relaxed">
                              استان {selectedUser.addresses[0].state}، شهر {selectedUser.addresses[0].city}
                              <br />
                              {selectedUser.addresses[0].address}
                              {selectedUser.addresses[0].zipCode && <span className="block text-[10px] font-bold text-slate-400 mt-0.5">کدپستی: {formatNum(selectedUser.addresses[0].zipCode)}</span>}
                            </div>
                          </div>
                        </div>
                      )}

                      {wholesaleEnabled && selectedUser.isWholesaler && (
                        <div className="flex items-start gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                          <Store className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                          <div className="w-full">
                            <div className="flex justify-between items-center">
                              <div className="text-[10px] text-slate-400 font-bold">اعتبار خرید عمده</div>
                              <button
                                onClick={() => {
                                  setEditCreditLimit(selectedUser.creditLimit || 0);
                                  setResetCreditBalance(false);
                                  setIsEditingCredit(!isEditingCredit);
                                }}
                                className="text-blue-600 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                                title="ویرایش سریع اعتبار"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                            <div className="text-slate-700 dark:text-slate-200 mt-1 space-y-1">
                              <div className="flex justify-between">
                                <span>سقف اعتبار:</span>
                                <span className="font-bold">{formatPrice(selectedUser.creditLimit || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>بدهی فعلی:</span>
                                <span className="text-rose-600 dark:text-rose-400 font-bold">{formatPrice(selectedUser.creditBalance || 0)}</span>
                              </div>
                              <div className="flex justify-between font-black text-emerald-600 dark:text-emerald-400 border-t border-slate-100 dark:border-slate-800/40 pt-1">
                                <span>اعتبار باقی‌مانده:</span>
                                <span>{formatPrice((selectedUser.creditLimit || 0) - (selectedUser.creditBalance || 0))}</span>
                              </div>

                              {isEditingCredit ? (
                                <form onSubmit={handleUpdateCredit} className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40 space-y-3 animate-fadeIn">
                                  <div>
                                    <label className="block text-[9px] font-black text-slate-400 mb-1">سقف اعتبار جدید (تومان)</label>
                                    <input
                                      type="number"
                                      required
                                      min={0}
                                      value={editCreditLimit}
                                      onChange={(e) => setEditCreditLimit(parseFloat(e.target.value) || 0)}
                                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none text-xs font-bold"
                                    />
                                    {/* Quick add buttons */}
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {[5000000, 10000000, 50000000, 100000000].map((amount) => (
                                        <button
                                          key={amount}
                                          type="button"
                                          onClick={() => setEditCreditLimit(prev => prev + amount)}
                                          className="text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-bold transition-all"
                                        >
                                          +{ (amount / 1000000).toLocaleString('fa-IR') } م
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => setEditCreditLimit(0)}
                                        className="text-[9px] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 px-1.5 py-0.5 rounded-md font-bold transition-all"
                                      >
                                        صفر کردن
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 bg-amber-50/50 dark:bg-amber-950/10 p-1.5 rounded-lg border border-amber-500/10">
                                    <input
                                      type="checkbox"
                                      id="resetBalance"
                                      checked={resetCreditBalance}
                                      onChange={(e) => setResetCreditBalance(e.target.checked)}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                    />
                                    <label htmlFor="resetBalance" className="text-[9px] text-amber-700 dark:text-amber-400 font-bold cursor-pointer select-none">
                                      تسویه بدهی فعلی (صفر کردن بدهی)
                                    </label>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button
                                      type="submit"
                                      disabled={isUpdatingCredit}
                                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-xl text-[10px] font-black transition-all shadow-xs disabled:opacity-50"
                                    >
                                      {isUpdatingCredit ? 'در حال بروزرسانی...' : 'بروزرسانی اعتبار'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIsEditingCredit(false)}
                                      className="px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-1.5 rounded-xl text-[10px] font-black transition-all"
                                    >
                                      انصراف
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditCreditLimit(selectedUser.creditLimit || 0);
                                    setResetCreditBalance(false);
                                    setIsEditingCredit(true);
                                  }}
                                  className="mt-2 text-[10px] text-blue-600 hover:underline font-black flex items-center gap-1"
                                >
                                  ویرایش سقف اعتبار
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Account Security & Action Card */}
                  <div className="bg-slate-50/50 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      مدیریت و امنیت حساب کاربری
                    </h5>
                    
                    <div className="flex flex-col gap-2">
                      {wholesaleEnabled && (
                        <button 
                          onClick={() => {
                            if (confirm(`آیا از تغییر وضعیت همکار عمده‌فروش برای این کاربر اطمینان دارید؟`)) {
                              setIsUpdatingStatus(true);
                              fetch(`/api/admin/users/${selectedUser.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'toggleWholesaler', isWholesaler: !selectedUser.isWholesaler })
                              })
                              .then(res => res.json())
                              .then(data => {
                                if (data.success) {
                                  alert(data.message);
                                  const updatedUsers = users.map(u => 
                                    u.id === selectedUser.id ? { ...u, isWholesaler: data.isWholesaler } : u
                                  );
                                  setUsers(updatedUsers);
                                  setSelectedUser({ ...selectedUser, isWholesaler: data.isWholesaler });
                                } else {
                                  alert(data.error || 'خطا در تغییر وضعیت همکار');
                                }
                              })
                              .catch(err => {
                                console.error(err);
                                alert('خطای ارتباط با سرور');
                              })
                              .finally(() => setIsUpdatingStatus(false));
                            }
                          }}
                          disabled={isUpdatingStatus}
                          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
                            selectedUser.isWholesaler
                              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-200/20'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <Store className="w-4 h-4 text-indigo-500" />
                          {selectedUser.isWholesaler ? 'لغو تایید همکار عمده‌فروش' : 'تایید به عنوان همکار عمده‌فروش (B2B)'}
                        </button>
                      )}

                      <button 
                        onClick={() => setIsChangingGroup(!isChangingGroup)}
                        className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        <Users className="w-4 h-4 text-blue-500" />
                        تغییر گروه/دسته کاربر
                      </button>

                      <button 
                        onClick={() => setIsChangingPassword(!isChangingPassword)}
                        className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        <Key className="w-4 h-4 text-amber-500" />
                        تغییر رمز عبور مشتری
                      </button>

                      <button 
                        onClick={handleToggleBlock}
                        disabled={isUpdatingStatus}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
                          selectedUser.isBlocked 
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450'
                        }`}
                      >
                        {selectedUser.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        {selectedUser.isBlocked ? 'رفع مسدودیت کاربر' : 'مسدودسازی موقت کاربر'}
                      </button>
                    </div>

                    {isChangingGroup && (
                      <form onSubmit={handleChangeGroup} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                        <select
                          required
                          value={newGroup}
                          onChange={(e) => setNewGroup(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none text-xs font-bold"
                        >
                          <option value="">انتخاب گروه جدید...</option>
                          <option value="عادی">عادی</option>
                          <option value="برنزی">برنزی</option>
                          <option value="نقره‌ای">نقره‌ای</option>
                          <option value="طلایی">طلایی</option>
                          <option value="VIP">VIP</option>
                        </select>
                        <button 
                          type="submit" 
                          disabled={isUpdatingStatus}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-black transition-all shadow-sm"
                        >
                          ثبت گروه جدید
                        </button>
                      </form>
                    )}

                    {isChangingPassword && (
                      <form onSubmit={handleChangePassword} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                        <input
                          type="password"
                          required
                          placeholder="کلمه عبور جدید (حداقل ۶ نویسه)..."
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none text-xs font-bold"
                        />
                        <button 
                          type="submit" 
                          disabled={isUpdatingStatus}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-black transition-all shadow-sm"
                        >
                          ثبت گذرواژه جدید
                        </button>
                      </form>
                    )}

                  </div>
                </div>

                {/* Orders History List */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="w-4.5 h-4.5 text-blue-500" />
                    تاریخچه و سوابق خریدهای مشتری ({formatNum(selectedUser.orders?.length || 0)} خرید)
                  </h4>
                  
                  {selectedUser.orders?.length === 0 ? (
                    <div className="bg-slate-50/30 dark:bg-slate-950/20 p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80">
                      <ShoppingBag className="w-10 h-10 text-slate-350 dark:text-slate-700 mx-auto mb-3" />
                      <p className="text-xs font-black text-slate-450 dark:text-slate-500">هیچ خریدی تاکنون توسط این مشتری ثبت نشده است.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1.5 custom-scrollbar">
                      {selectedUser.orders?.map((order) => (
                        <div key={order.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl hover:shadow-sm transition-all flex flex-col gap-3.5">
                          <div className="flex justify-between items-center text-xs font-black select-none">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-800 dark:text-slate-100 text-sm">شناسه سفارش: {order.id.slice(-6).toUpperCase()}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${getStatusColor(order.status)}`}>
                                {getStatusText(order.status)}
                              </span>
                            </div>
                            <span className="text-slate-400 dark:text-slate-500 font-bold" dir="ltr">
                              {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-50 dark:border-slate-850 mt-1">
                            {order.items?.map((item) => (
                              <div key={item.id} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850/60 rounded-xl px-2.5 py-1.5 text-[11px] font-bold">
                                <span className="text-slate-700 dark:text-slate-300">{item.product?.title}</span>
                                <span className="text-slate-400 dark:text-slate-500 font-black">({formatNum(item.quantity)} عدد)</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center text-xs font-bold pt-3 border-t border-slate-50 dark:border-slate-850">
                            <span className="text-slate-400 dark:text-slate-500">مجموع پرداختی مرسوله:</span>
                            <span className="text-slate-800 dark:text-white font-black text-sm">{formatPrice(order.finalAmount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Club Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-blue-500" />
                تنظیمات باشگاه مشتریان و وفادارسازی
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveSettings} className="p-6 space-y-4 text-right">
              {/* Toggle Enable */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-slate-800 dark:text-white block">فعال‌سازی باشگاه مشتریان</span>
                  <span className="text-[10px] text-slate-400 font-bold block">امکان کسب امتیاز و دریافت خودکار کدهای تخفیف هدیه</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={clubSettings.customerClubEnabled}
                    onChange={(e) => setClubSettings({ ...clubSettings, customerClubEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:left-auto after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {clubSettings.customerClubEnabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Rate & Value */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">نرخ کسب امتیاز (تومان خرید به ازای ۱ امتیاز)</label>
                      <input
                        type="number"
                        required
                        min={100}
                        value={clubSettings.loyaltyPointsRate}
                        onChange={(e) => setClubSettings({ ...clubSettings, loyaltyPointsRate: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white text-left"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 font-bold">مثال: ۱۰,۰۰۰ تومان خرید = ۱ امتیاز</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">ارزش نقدی هر امتیاز (تومان)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={clubSettings.loyaltyPointValue}
                        onChange={(e) => setClubSettings({ ...clubSettings, loyaltyPointValue: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white text-left"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 font-bold">مثال: هر ۱ امتیاز = ۱۰۰ تومان تخفیف</p>
                    </div>
                  </div>

                  {/* Threshold & Discount Code Settings */}
                  <div className="p-4 bg-blue-50/30 dark:bg-blue-950/10 rounded-2xl border border-blue-500/10 space-y-4">
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-450 flex items-center gap-1.5">
                      🎁 سیستم صدور خودکار کد تخفیف هدیه
                    </h4>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">حد نصاب امتیاز برای دریافت کد تخفیف</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={clubSettings.loyaltyDiscountThreshold}
                        onChange={(e) => setClubSettings({ ...clubSettings, loyaltyDiscountThreshold: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white text-left"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 font-bold">هنگامی که مشتری به این امتیاز برسد، سیستم خودکار کد تخفیف صادر کرده و امتیاز او را کسر می‌کند.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">نوع تخفیف هدیه</label>
                        <select
                          value={clubSettings.loyaltyDiscountType}
                          onChange={(e) => setClubSettings({ ...clubSettings, loyaltyDiscountType: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white"
                        >
                          <option value="flat">مبلغ ثابت (تومان)</option>
                          <option value="percentage">درصد تخفیف</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">میزان تخفیف هدیه</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={clubSettings.loyaltyDiscountAmount}
                          onChange={(e) => setClubSettings({ ...clubSettings, loyaltyDiscountAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white text-left"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="px-1 py-3.5 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-3.5 pt-4">
                <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  انصراف
                </button>
                <button 
                  type="submit" 
                  disabled={savingSettings}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-sm transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingSettings ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
