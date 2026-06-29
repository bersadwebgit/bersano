'use client';

import { useState, useEffect } from 'react';
import { Search, Headphones, Clock, Calendar, MessageSquare, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SystemTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSystemTickets() {
  const [tickets, setTickets] = useState<SystemTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/system-tickets?status=${statusFilter === 'all' ? '' : statusFilter}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (error) {
      console.error('[ERROR] [SystemTickets]: Error fetching system tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200/10">جدید / منتظر بررسی</span>;
      case 'in_progress':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/10">در حال بررسی</span>;
      case 'answered':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/10">پاسخ داده شده</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">بسته شده (مختومه)</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-slate-50 text-slate-500">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <span className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">پایین</span>;
      case 'normal':
        return <span className="bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">عادی</span>;
      case 'high':
        return <span className="bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full">مهم</span>;
      case 'urgent':
        return <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm animate-pulse border border-rose-200/10">بحرانی / فوری</span>;
      default:
        return <span className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{priority}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600/[0.07] via-blue-600/[0.03] to-transparent dark:from-indigo-500/10 dark:via-blue-500/5 dark:to-transparent rounded-3xl p-6 border border-indigo-500/10 dark:border-indigo-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-indigo-500" />
            تیکت به مدیریت کل سیستم
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">ارسال درخواست‌های فنی، گزارش باگ، تمدید اشتراک یا سوالات مالی به پشتیبانی کل پلتفرم</p>
        </div>
        <Link 
          href="/admin/system-tickets/new"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-sm shadow-blue-600/10"
        >
          <Plus size={16} />
          ارسال تیکت جدید
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
            <input 
              type="text"
              placeholder="جستجو در موضوع یا متن تیکت‌ها..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-11 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs font-bold text-slate-800 dark:text-white transition-all shadow-sm focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 pl-4 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition-all shadow-sm focus:border-blue-500"
            >
              <option value="all">نمایش همه تیکت‌ها</option>
              <option value="new">منتظر بررسی</option>
              <option value="in_progress">در حال بررسی</option>
              <option value="answered">پاسخ داده شده</option>
              <option value="closed">بسته شده</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right text-xs font-bold">
            <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-slate-450 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60 select-none">
              <tr>
                <th className="p-4.5 font-black">موضوع تیکت</th>
                <th className="p-4.5 font-black text-center">درجه اولویت</th>
                <th className="p-4.5 font-black text-center">وضعیت اقدام</th>
                <th className="p-4.5 font-black text-center">تاریخ ارسال</th>
                <th className="p-4.5 font-black text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                      <span className="font-bold text-xs">در حال بارگذاری تیکت‌ها...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                      <span className="font-black text-sm">هیچ تیکتی یافت نشد!</span>
                      <span className="text-[10px] text-slate-400 font-medium">در صورت بروز هرگونه مشکل یا سوال، می‌توانید تیکت جدید ثبت کنید.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/15 transition-colors group">
                    <td className="p-4.5">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-black text-slate-800 dark:text-slate-100 text-sm group-hover:text-blue-500 transition-colors">
                          {ticket.subject}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">#{ticket.id.slice(-8).toUpperCase()}</span>
                        <span className="text-xs text-slate-650 dark:text-slate-400 line-clamp-1 mt-1">
                          {ticket.description}
                        </span>
                      </div>
                    </td>
                    <td className="p-4.5 text-center">
                      {getPriorityBadge(ticket.priority)}
                    </td>
                    <td className="p-4.5 text-center">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="p-4.5 text-center text-slate-500 dark:text-slate-450 font-bold">
                      <span className="flex items-center justify-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(ticket.createdAt).toLocaleDateString('fa-IR')}
                      </span>
                    </td>
                    <td className="p-4.5 text-left">
                      <Link 
                        href={`/admin/system-tickets/${ticket.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-blue-600 hover:text-white bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-600 dark:hover:bg-blue-600 border border-blue-500/10 rounded-xl transition-all shadow-sm"
                      >
                        مشاهده گفتگو
                        <ArrowLeft size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
