import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Eye, Search, Filter, Printer, RefreshCw, Smartphone, 
  Globe, Shield, CheckCircle2, Clock, Phone, ExternalLink, 
  Calendar, UserCheck, ArrowUpDown, UserX, AlertCircle, Sparkles
} from 'lucide-react';
import { api } from '../../api';
import { supabase } from '../../supabase';
import { User } from '../../types';
import { getShowcaseVisits, ShowcaseVisitRecord } from '../../services/showcaseService';
import { formatDate, formatDateTime } from '../../utils/time';

export interface UnifiedAccessRecord {
  id: string;
  type: 'agent' | 'visitor';
  name: string;
  username?: string;
  phone?: string | null;
  userNumber?: number | string | null;
  role?: string;
  agentName?: string;
  agentId?: string;
  agentPhone?: string | null;
  timestamp: number;
  isOnline?: boolean;
  status?: string;
  method?: string;
  allowedDevice?: string;
}

export default function AccessLogManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [showcaseVisits, setShowcaseVisits] = useState<ShowcaseVisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'agents' | 'visitors' | 'online'>('all');
  const [timeFilter, setTimeFilter] = useState<'24h' | '3d' | '7d' | 'all'>('24h');

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [dbUsers, visits] = await Promise.all([
        api.getUsers().catch(() => []),
        getShowcaseVisits().catch(() => [])
      ]);

      if (Array.isArray(dbUsers)) {
        setUsers(dbUsers.map((u: any) => ({ ...u, uid: u.id || u.uid })));
      }
      if (Array.isArray(visits)) {
        setShowcaseVisits(visits);
      }
    } catch (e) {
      console.error("Error fetching access log data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);

    const channel = supabase
      .channel('access_log_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchData())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Map users for fast agent lookup
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach(u => {
      if (u.uid) map.set(u.uid, u);
      if (u.id) map.set(u.id, u);
      if (u.username) map.set(u.username, u);
    });
    return map;
  }, [users]);

  // Combine and unify into a single normalized log list
  const unifiedRecords = useMemo(() => {
    const records: UnifiedAccessRecord[] = [];
    const now = Date.now();

    // 1. Process Registered Users (Agents, Admin, Sales)
    users.forEach(u => {
      const isOnline = Boolean(u.isOnline || (u.lastActive && now - u.lastActive < 300000));
      const activityTime = u.lastActive || (u as any).lastLogin || u.createdAt || 0;

      records.push({
        id: `user-${u.uid || u.id || u.username}`,
        type: 'agent',
        name: u.fullName || u.username,
        username: u.username,
        phone: u.phone || null,
        userNumber: u.userNumber || null,
        role: u.role === 'admin' ? 'مدير نظام' : u.role === 'sales' ? 'مندوب مبيعات' : 'وكيل معتمد',
        timestamp: activityTime,
        isOnline,
        status: u.status || 'نشط',
        allowedDevice: u.allowedDevice || 'all'
      });
    });

    // 2. Process Showcase Visitors
    showcaseVisits.forEach(v => {
      const hostAgent = userMap.get(v.agentId) || users.find(u => u.username === v.agentId || u.fullName === v.agentName);
      const isOnline = Boolean(v.isOnline || (v.lastActive && now - v.lastActive < 45000));
      records.push({
        id: `visit-${v.id}`,
        type: 'visitor',
        name: v.visitorName || 'زائر غير مسمى',
        phone: v.visitorPhone || null,
        agentName: v.agentName || hostAgent?.fullName || 'معرض عام',
        agentId: v.agentId,
        agentPhone: hostAgent?.phone || null,
        timestamp: v.timestamp || 0,
        isOnline,
        method: v.method === 'invite' ? 'رابط دعوة' : 'دخول مباشر',
        status: isOnline ? 'نشط الآن' : 'موثق'
      });
    });

    // Sort descending by most recent timestamp
    return records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [users, showcaseVisits, userMap]);

  // Apply Time & Type & Search Filters
  const filteredRecords = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const threeDays = 3 * oneDay;
    const sevenDays = 7 * oneDay;

    return unifiedRecords.filter(rec => {
      // 1. Time Filter
      if (timeFilter === '24h') {
        if (!rec.timestamp || (now - rec.timestamp > oneDay && !rec.isOnline)) return false;
      } else if (timeFilter === '3d') {
        if (!rec.timestamp || (now - rec.timestamp > threeDays && !rec.isOnline)) return false;
      } else if (timeFilter === '7d') {
        if (!rec.timestamp || (now - rec.timestamp > sevenDays && !rec.isOnline)) return false;
      }

      // 2. Type Filter
      if (typeFilter === 'agents' && rec.type !== 'agent') return false;
      if (typeFilter === 'visitors' && rec.type !== 'visitor') return false;
      if (typeFilter === 'online' && !rec.isOnline) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = rec.name?.toLowerCase().includes(q);
        const matchUser = rec.username?.toLowerCase().includes(q);
        const matchPhone = rec.phone?.includes(q);
        const matchAgent = rec.agentName?.toLowerCase().includes(q);
        const matchNum = String(rec.userNumber || '').includes(q);
        if (!matchName && !matchUser && !matchPhone && !matchAgent && !matchNum) return false;
      }

      return true;
    });
  }, [unifiedRecords, timeFilter, typeFilter, searchQuery]);

  // Stats for the last 24h
  const stats24h = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const past24hRecords = unifiedRecords.filter(r => r.timestamp && (now - r.timestamp <= oneDay || r.isOnline));
    
    return {
      total: past24hRecords.length,
      agentsCount: past24hRecords.filter(r => r.type === 'agent').length,
      visitorsCount: past24hRecords.filter(r => r.type === 'visitor').length,
      onlineCount: unifiedRecords.filter(r => r.isOnline).length
    };
  }, [unifiedRecords]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans print:p-0 print:m-0 print:bg-white" dir="rtl">
      {/* Print-specific style */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #d1d5db !important;
            padding: 8px !important;
            font-size: 11px !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 print:p-0 print:max-w-none">
        
        {/* Header (Screen & Print) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gray-900 text-white rounded-xl flex items-center justify-center shadow-sm">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  سجل الدخول والنشاط اليومي (24 ساعة)
                </h1>
                <p className="text-sm text-gray-600 font-medium mt-0.5">
                  رصد دقيق ومباشر لجميع الوكلاء، المسؤولين، وزوار معارض الوكلاء
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons (Hidden on print) */}
          <div className="flex items-center gap-2.5 no-print">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-bold border border-gray-300 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              title="تحديث البيانات"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span>تحديث السجل</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer size={16} className="text-amber-400" />
              <span>طباعة السجل الرسمي (A4)</span>
            </button>
          </div>
        </div>

        {/* Print Title Header (Only visible on paper print) */}
        <div className="hidden print:block mb-4 text-center border-b-2 border-black pb-3 pt-2">
          <h2 className="text-xl font-black text-black">شركة الوفاء المتميز - سجل الدخول والمشاهدات اليومي</h2>
          <div className="flex justify-between text-xs text-gray-700 font-bold mt-2">
            <span>تاريخ ووقت التقرير: {formatDateTime(Date.now())}</span>
            <span>الفلتر الحالي: {timeFilter === '24h' ? 'آخر 24 ساعة' : timeFilter === '3d' ? 'آخر 3 أيام' : 'الكل'}</span>
            <span>إجمالي السجلات: {filteredRecords.length} حركة</span>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 my-6">
          <div className="bg-white p-4 rounded-2xl border-2 border-gray-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">إجمالي الداخلين (24 ساعة)</span>
              <div className="p-2 bg-gray-100 rounded-lg text-gray-900">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-black text-gray-900 font-mono">{stats24h.total}</span>
              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">وكلاء وزوار</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800">الوكلاء والمستخدمين النشطين</span>
              <div className="p-2 bg-blue-100 rounded-lg text-blue-800">
                <UserCheck size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-black text-blue-900 font-mono">{stats24h.agentsCount}</span>
              <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full">وكيل مسجل</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border-2 border-amber-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">زوار المعارض الجدد</span>
              <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
                <Sparkles size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-black text-amber-900 font-mono">{stats24h.visitorsCount}</span>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">زائر فريد</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border-2 border-emerald-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">المتواجدون الآن (أونلاين)</span>
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800 relative">
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                <Globe size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-black text-emerald-800 font-mono">{stats24h.onlineCount}</span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> متصل الآن
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls (Screen Only) */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 no-print space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، رقم الهاتف، رقم الحساب، أو اسم الوكيل..."
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 shadow-2xs font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 hover:text-gray-900"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Time Period Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-300 w-full md:w-auto overflow-x-auto">
              <button
                onClick={() => setTimeFilter('24h')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  timeFilter === '24h' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                اليوم (آخر 24 ساعة)
              </button>
              <button
                onClick={() => setTimeFilter('3d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  timeFilter === '3d' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                آخر 3 أيام
              </button>
              <button
                onClick={() => setTimeFilter('7d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  timeFilter === '7d' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                آخر 7 أيام
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  timeFilter === 'all' ? 'bg-gray-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                سجل الكل
              </button>
            </div>
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200 overflow-x-auto">
            <span className="text-xs font-bold text-gray-500 whitespace-nowrap ml-1">عرض:</span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                typeFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              الجميع ({unifiedRecords.length})
            </button>
            <button
              onClick={() => setTypeFilter('agents')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                typeFilter === 'agents' ? 'bg-blue-800 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              الوكلاء والمسؤولين ({unifiedRecords.filter(r => r.type === 'agent').length})
            </button>
            <button
              onClick={() => setTypeFilter('visitors')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                typeFilter === 'visitors' ? 'bg-amber-700 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              زوار معارض الوكلاء ({unifiedRecords.filter(r => r.type === 'visitor').length})
            </button>
            <button
              onClick={() => setTypeFilter('online')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                typeFilter === 'online' ? 'bg-emerald-700 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
              المتواجدون الآن ({stats24h.onlineCount})
            </button>
          </div>
        </div>

        {/* Data Table (High Contrast White & Black) */}
        <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-900 border-b-2 border-gray-200 text-xs font-black">
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">نوع الداخل</th>
                  <th className="py-3.5 px-4">الاسم / الحساب</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">رقم الحساب / الكود</th>
                  <th className="py-3.5 px-4">الجهة / الوكيل المضيف</th>
                  <th className="py-3.5 px-4">وقت وتاريخ الدخول</th>
                  <th className="py-3.5 px-4 text-center">حالة الاتصال والنشاط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs font-medium text-gray-900">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500 font-bold">
                      جاري تحميل وتحديث سجل الدخول...
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500 font-bold">
                      لا توجد حركات دخول مسجلة خلال الفترة أو الفلتر المحدد.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, index) => {
                    const isAgent = rec.type === 'agent';
                    return (
                      <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Index */}
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-500">
                          {index + 1}
                        </td>

                        {/* Type Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isAgent ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black ${
                              rec.role === 'مدير نظام' 
                                ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                                : 'bg-blue-100 text-blue-900 border border-blue-200'
                            }`}>
                              <Shield size={12} />
                              {rec.role}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                              <Sparkles size={12} />
                              زائر معرض
                            </span>
                          )}
                        </td>

                        {/* Name & Details */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900 text-sm">
                            {rec.name}
                          </div>
                          {isAgent && rec.username && rec.username !== rec.name && (
                            <div className="text-[11px] text-gray-500 font-mono">
                              {rec.username}
                            </div>
                          )}
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                          {rec.phone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 text-xs" dir="ltr">
                                {rec.phone}
                              </span>
                              <a
                                href={`https://wa.me/${rec.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="no-print p-1 hover:bg-emerald-100 text-emerald-700 rounded transition-colors"
                                title="مراسلة واتساب"
                              >
                                <Phone size={13} />
                              </a>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">غير متوفر</span>
                          )}
                        </td>

                        {/* User Number / Code */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                          {rec.userNumber ? (
                            <span className="font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                              #{rec.userNumber}
                            </span>
                          ) : isAgent ? (
                            <span className="text-gray-400">---</span>
                          ) : (
                            <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-mono">
                              {rec.method || 'معرض'}
                            </span>
                          )}
                        </td>

                        {/* Host Agent / Context */}
                        <td className="py-3.5 px-4">
                          {isAgent ? (
                            <span className="text-gray-600 font-medium text-[11px]">
                              {rec.role === 'مدير نظام' ? 'لوحة الإدارة المركزية' : 'تطبيق المبيعات والطلبات'}
                            </span>
                          ) : (
                            <div>
                              <div className="font-black text-gray-900 text-xs flex items-center gap-1">
                                <span className="text-gray-500 font-normal">معرض الوكيل:</span> {rec.agentName}
                              </div>
                              {rec.agentPhone && (
                                <div className="text-[10px] text-gray-500 font-mono" dir="ltr">
                                  هاتف الوكيل: {rec.agentPhone}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Entry Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {rec.timestamp ? (
                            <div>
                              <div className="font-bold text-gray-900 text-xs font-mono">
                                {formatDateTime(rec.timestamp)}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {rec.isOnline ? (
                                  <span className="text-emerald-700 font-bold">نشط الآن</span>
                                ) : (
                                  <span>{getTimeAgo(rec.timestamp)}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">غير مسجل</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {rec.isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                              متصل الآن
                            </span>
                          ) : isAgent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                              {rec.status === 'active' ? 'حساب نشط' : rec.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={12} />
                              زيارة موثقة
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Counts */}
          <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-600 font-bold gap-2">
            <div>
              عرض <span className="text-gray-900 font-black">{filteredRecords.length}</span> من إجمالي <span className="text-gray-900 font-black">{unifiedRecords.length}</span> حركة دخول
            </div>
            <div className="flex items-center gap-4">
              <span>وكلاء: <strong className="text-gray-900">{filteredRecords.filter(r => r.type === 'agent').length}</strong></span>
              <span>زوار: <strong className="text-gray-900">{filteredRecords.filter(r => r.type === 'visitor').length}</strong></span>
              <span>متصل الآن: <strong className="text-emerald-700">{filteredRecords.filter(r => r.isOnline).length}</strong></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 60000) return 'منذ لحظات';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}
