import { formatDateTime, formatDate } from '../../utils/time';
import { 
  Users, Eye, EyeOff, Plus, Search, Filter, Edit, ShieldX, CheckCircle, 
  KeyRound, MoreVertical, Loader2, X, Trash2, Smartphone, Monitor, Globe, 
  Sparkles, Calendar, Clock, ExternalLink, Phone, ShieldAlert, UserX, UserCheck, 
  Ban, AlertTriangle, ShieldCheck, Printer, Store, Layers
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import bcryptjs from 'bcryptjs';
import { api } from '../../api';
import { supabase } from '../../supabase';
import { User, UserRole, DeviceAccess, UserStatus } from '../../types';
import { useStore } from '../../store';
import { 
  getShowcaseVisits, ShowcaseVisitRecord, getBlockedVisitors, blockVisitor, 
  unblockVisitor, isVisitorInBlockedList, BlockedVisitor 
} from '../../services/showcaseService';
import { printVisitorsLogToPDF } from '../../utils/printVisitorsLog';

import { UserManagerErrorBoundary } from "./UserManagerErrorBoundary";

function UserManagerContent() {
  const { user: currentUser, showToast } = useStore();
  const [users, setUsers] = useState<User[]>([]);
  const [debugMsg, setDebugMsg] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '', password: '', fullName: '', phone: '', userNumber: undefined, role: 'normal', status: 'active', allowedDevice: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [showcaseVisits, setShowcaseVisits] = useState<ShowcaseVisitRecord[]>([]);
  const [blockedVisitors, setBlockedVisitors] = useState<BlockedVisitor[]>([]);
  const [allVisitsModalOpen, setAllVisitsModalOpen] = useState(false);
  const [blockedVisitorsModalOpen, setBlockedVisitorsModalOpen] = useState(false);
  const [selectedAgentVisits, setSelectedAgentVisits] = useState<{ user: User; visits: ShowcaseVisitRecord[] } | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalAgentFilter, setModalAgentFilter] = useState('all');
  const [visitorViewMode, setVisitorViewMode] = useState<'grouped' | 'list'>('grouped');

  // Manual block form state
  const [manualBlockPhone, setManualBlockPhone] = useState('');
  const [manualBlockName, setManualBlockName] = useState('');
  const [manualBlockReason, setManualBlockReason] = useState('');
  const [isBlockingLoading, setIsBlockingLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      try {
        const [dbUsers, visitsData, blockedData] = await Promise.all([
          api.getUsers().catch(err => { console.error('api.getUsers error:', err); return []; }),
          getShowcaseVisits().catch(err => { console.error('getShowcaseVisits error:', err); return []; }),
          getBlockedVisitors().catch(err => { console.error('getBlockedVisitors error:', err); return []; })
        ]);

        if (mounted) {
          if (!Array.isArray(dbUsers)) { 
            setUsers([]); 
          } else { 
            setUsers(dbUsers.map((u: any) => ({ ...u, uid: u.id || u.uid }))); 
          }
          if (Array.isArray(visitsData)) { 
            setShowcaseVisits(visitsData); 
          }
          if (Array.isArray(blockedData)) {
            setBlockedVisitors(blockedData);
          }
          setLoading(false);
        }
      } catch (e) {
        console.error("Error fetching users in UserManager:", e); 
        setDebugMsg(String(e)); 
        if (mounted) setLoading(false);
      }
    };

    fetchUsers();
    const inv = setInterval(fetchUsers, 4000);

    const channel = supabase
      .channel('public:users_manager_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      mounted = false;
      clearInterval(inv);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.updateUser(editingUser.uid, {
        username: editingUser.username,
        phone: editingUser.phone || "",
        role: editingUser.role,
        allowedDevice: editingUser.allowedDevice
      });
      if (editingUser.password && editingUser.password.trim() !== "") {
          await api.updateUser(editingUser.uid, { password: editingUser.password });
      }
      if (editingUser.userNumber) {
          await api.updateUser(editingUser.uid, { userNumber: editingUser.userNumber });
      }
      await api.logAction({
        userId: currentUser?.uid || "",
        userName: currentUser?.username || "System",
        action: "تعديل مستخدم",
        entityType: "user",
        entityId: editingUser.uid,
        details: { role: editingUser.role }
      });
      setEditingUser(null);
      const updated = await api.getUsers();
      setUsers(updated.map((u: any) => ({...u, uid: u.id})));
    } catch(e) {
      console.error(e);
      alert("فشل تحديث المستخدم");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || isSubmitting || !newUser.userNumber) return;
    setIsSubmitting(true);
    try {
      
      
      const existingUser = users.find(u => u.username === newUser.username);

      const userToCreate = {
        id: newUser.username,
        uid: newUser.username,
        username: newUser.username,
        password: newUser.password,
        fullName: newUser.username,
        phone: newUser.phone || '',
        userNumber: newUser.userNumber,
        role: newUser.role || 'normal',
        status: newUser.status || 'active',
        allowedDevice: newUser.allowedDevice || 'all',
        createdAt: existingUser ? existingUser.createdAt : Date.now()
      };
      
      if (existingUser) {
        setUsers(prev => prev.map(u => u.username === newUser.username ? { ...userToCreate, uid: userToCreate.id } : u));
        await api.updateUser(userToCreate.id, userToCreate);
      } else {
        // Optimistic update
        setUsers(prev => [...prev, { ...userToCreate, uid: userToCreate.id }]);
        await api.createUser(userToCreate);
      }
      
      // log action
      await api.logAction({
        userId: currentUser?.uid || '',
        userName: currentUser?.username || 'System',
        action: 'إنشاء مستخدم',
        entityType: 'user',
        entityId: newUser.username,
        details: { role: newUser.role }
      });

      setIsAdding(false);
      setNewUser({ username: '', password: '', fullName: '', phone: '', userNumber: undefined, role: 'normal', status: 'active', allowedDevice: 'all' });
      
      try { showToast('تمت إضافة المستخدم بنجاح', 'success'); } catch(e) {}
      
      const updated = await api.getUsers();
      setUsers(updated.map((u: any) => ({...u, uid: u.id})));
    } catch(e: any) {
      console.error(e);
      try { showToast('فشل حفظ المستخدم.', 'error'); } catch(err) {}
      alert('فشل حفظ المستخدم. الخطأ: ' + e.message);
      
      // Revert optimistic update
      const updated = await api.getUsers();
      setUsers(updated.map((u: any) => ({...u, uid: u.id})));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (uid: string, currentStatus: UserStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await api.updateUser(uid, { status: newStatus });
      const updated = await api.getUsers();
      setUsers(updated.map((u: any) => ({...u, uid: u.id})));
    } catch(e) {
      console.error(e);
    }
  };

  const handleDelete = async (uid: string, username: string, role: string) => {
     if (role === 'admin') {
         alert('لا يمكن حذف حساب المدير العام.');
         return;
     }

     // Optimistic update
     setUsers((prev) => prev.filter((u) => u.uid !== uid));

     try {
         await api.deleteUser(uid, currentUser?.username);
         
         await api.logAction({
          userId: currentUser?.uid || '',
          userName: currentUser?.username || 'System',
          action: 'حذف مستخدم',
          entityType: 'user',
          entityId: uid,
          details: { username }
         });

         const updated = await api.getUsers();
         setUsers(updated.map((u: any) => ({...u, uid: u.id})));
     } catch(e) {
         console.error(e);
         // Revert on error
         const updated = await api.getUsers();
         setUsers(updated.map((u: any) => ({...u, uid: u.id})));
         alert('حدث خطأ أثناء الحذف');
     }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'مدير عام';
      case 'sales': return 'موظف مبيعات';
      case 'vip': return 'عميل VIP';
      case 'normal': return 'عميل عادي';
      default: return role;
    }
  };

  const getDeviceIcon = (device?: DeviceAccess) => {
      switch (device) {
          case 'mobile': return <Smartphone size={14} className="text-white/50" />;
          case 'desktop': return <Monitor size={14} className="text-white/50" />;
          default: return <Globe size={14} className="text-white/50" />;
      }
  };

  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return '-';
    const diffMins = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} د`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} س`;
    const diffDays = Math.floor(diffHours / 24);
    return `منذ ${diffDays} ي`;
  };

  const getUserShowcaseVisits = (user: User) => {
    const uId = String(user.uid || user.id || '').toLowerCase().trim();
    const uName = String(user.username || '').toLowerCase().trim();
    const uFull = String(user.fullName || '').toLowerCase().trim();

    return showcaseVisits.filter(v => {
      const vAgentId = String(v.agentId || '').toLowerCase().trim();
      const vAgentName = String(v.agentName || '').toLowerCase().trim();

      return (
        (uId && (vAgentId === uId || vAgentName === uId)) ||
        (uName && (vAgentId === uName || vAgentName === uName)) ||
        (uFull && (vAgentId === uFull || vAgentName === uFull))
      );
    });
  };

  // Online detection: activity within last 5 minutes (300000 ms)
  const isUserOnline = (user: User) => {
      if (user.isOnline) return true;
      if (user.lastActive && (Date.now() - user.lastActive < 300000)) return true;
      return false;
  };

  const onlineUsersCount = users.filter(isUserOnline).length;
  const activeUsersCount = users.filter(u => u.status === 'active').length;

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-brq-gold w-12 h-12" />
      </div>
    );
  }

  const handleToggleBlockVisitor = async (visit: { visitorPhone?: string | null; visitorName: string; agentId?: string; agentName?: string }) => {
    const isCurrentlyBlocked = isVisitorInBlockedList(visit.visitorPhone, visit.visitorName, blockedVisitors);
    setIsBlockingLoading(true);
    try {
      if (isCurrentlyBlocked) {
        const identifier = visit.visitorPhone || visit.visitorName;
        const updated = await unblockVisitor(identifier);
        setBlockedVisitors(updated);
        showToast(`تم تفعيل حساب الزائر (${visit.visitorName}) بنجاح`);
      } else {
        const updated = await blockVisitor({
          phone: visit.visitorPhone,
          visitorName: visit.visitorName,
          agentId: visit.agentId,
          agentName: visit.agentName,
          blockedBy: currentUser?.fullName || currentUser?.username || 'الإدارة',
          reason: 'تم إيقاف الحساب من قبل الإدارة'
        });
        setBlockedVisitors(updated);
        showToast(`تم إيقاف حساب الزائر (${visit.visitorName}) ومنعه من دخول المعرض`);
      }
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء تعديل حالة الزائر');
    } finally {
      setIsBlockingLoading(false);
    }
  };

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBlockPhone.trim() && !manualBlockName.trim()) {
      showToast('يرجى كتابة رقم الهاتف أو اسم الزائر');
      return;
    }
    setIsBlockingLoading(true);
    try {
      const updated = await blockVisitor({
        phone: manualBlockPhone.trim() || undefined,
        visitorName: manualBlockName.trim() || undefined,
        reason: manualBlockReason.trim() || 'تم إيقاف الحساب يدوياً من لوحة التحكم',
        blockedBy: currentUser?.fullName || currentUser?.username || 'الإدارة'
      });
      setBlockedVisitors(updated);
      setManualBlockPhone('');
      setManualBlockName('');
      setManualBlockReason('');
      showToast('تمت إضافة الزائر إلى قائمة المحظورين بنجاح');
    } catch (err: any) {
      showToast(err.message || 'فشل إيقاف الحساب');
    } finally {
      setIsBlockingLoading(false);
    }
  };

  const handleDirectUnblock = async (identifier: string, name?: string | null) => {
    setIsBlockingLoading(true);
    try {
      const updated = await unblockVisitor(identifier);
      setBlockedVisitors(updated);
      showToast(`تم إلغاء الحظر وتفعيل الحساب ${name ? `(${name})` : ''} بنجاح`);
    } catch (err: any) {
      showToast(err.message || 'فشل تفعيل الحساب');
    } finally {
      setIsBlockingLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const sq = searchQuery.toLowerCase();
    return (
      (u.username && String(u.username).toLowerCase().includes(sq)) ||
      (u.fullName && String(u.fullName).toLowerCase().includes(sq)) ||
      (u.phone && String(u.phone).toLowerCase().includes(sq)) ||
      (u.userNumber && String(u.userNumber).toLowerCase().includes(sq))
    );
  });

  const filteredShowcaseVisits = showcaseVisits.filter(v => {
    if (modalAgentFilter !== 'all') {
      const filterKey = modalAgentFilter.toLowerCase().trim();
      const vAgentId = String(v.agentId || '').toLowerCase().trim();
      const vAgentName = String(v.agentName || '').toLowerCase().trim();
      if (vAgentId !== filterKey && vAgentName !== filterKey) return false;
    }
    if (!modalSearch) return true;
    const sq = modalSearch.toLowerCase().trim();
    return (
      (v.visitorName && v.visitorName.toLowerCase().includes(sq)) ||
      (v.visitorPhone && v.visitorPhone.toLowerCase().includes(sq)) ||
      (v.agentName && v.agentName.toLowerCase().includes(sq)) ||
      (v.agentId && v.agentId.toLowerCase().includes(sq))
    );
  });

  const groupedShowcaseVisits = useMemo(() => {
    const groupsMap = new Map<string, {
      agentKey: string;
      agentName: string;
      agentId?: string;
      agentPhone?: string | null;
      user?: User | null;
      visits: ShowcaseVisitRecord[];
      latestTimestamp: number;
    }>();

    filteredShowcaseVisits.forEach(visit => {
      const hostAgent = users.find(u => 
        (u.uid && u.uid === visit.agentId) || 
        (u.id && u.id === visit.agentId) || 
        (u.username && u.username === visit.agentId) || 
        (u.fullName && u.fullName === visit.agentName)
      );

      const rawAgentName = (visit.agentName || hostAgent?.fullName || 'معرض عام').trim();
      const agentKey = rawAgentName.toLowerCase();

      if (!groupsMap.has(agentKey)) {
        groupsMap.set(agentKey, {
          agentKey,
          agentName: rawAgentName,
          agentId: visit.agentId,
          agentPhone: hostAgent?.phone || null,
          user: hostAgent || null,
          visits: [],
          latestTimestamp: 0
        });
      }

      const grp = groupsMap.get(agentKey)!;
      grp.visits.push(visit);
      if ((visit.timestamp || 0) > grp.latestTimestamp) {
        grp.latestTimestamp = visit.timestamp || 0;
      }
    });

    return Array.from(groupsMap.values())
      .map(grp => ({
        ...grp,
        visits: [...grp.visits].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      }))
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [filteredShowcaseVisits, users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
             <h2 className="text-2xl font-bold text-white mb-1">إدارة المستخدمين والمعرض</h2>
             <p className="text-sm text-white/50">التحكم في الصلاحيات والمستخدمين وزوار روابط المعرض</p>
         </div>
         <div className="flex flex-wrap items-center gap-2.5">
            <button 
              onClick={() => setAllVisitsModalOpen(true)}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(245,158,11,0.2)] active:scale-95"
            >
               <Eye size={18} />
               <span>سجل زوار المعرض ({showcaseVisits.length} زائر)</span>
            </button>
            <button 
              onClick={() => setBlockedVisitorsModalOpen(true)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all text-sm font-bold border active:scale-95 ${
                blockedVisitors.length > 0 
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/40 shadow-[0_4px_15px_rgba(239,68,68,0.2)]' 
                  : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
              }`}
            >
               <ShieldAlert size={18} className={blockedVisitors.length > 0 ? "text-red-400 animate-pulse" : "text-white/50"} />
               <span>الزوار الموقوفين ({blockedVisitors.length})</span>
            </button>
            <button onClick={() => {
               if (!isAdding) {
                  const maxNum = users.reduce((max, u) => Math.max(max, u.userNumber || 0), 0);
                  setNewUser(prev => ({ ...prev, userNumber: maxNum + 1 }));
               }
               setIsAdding(!isAdding);
            }} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(30,94,255,0.3)] active:scale-95">
                <Plus size={18} /> إضافة مستخدم
            </button>
         </div>
      </div>

      {isAdding && (
         <div className="glass-panel p-6 rounded-2xl border border-brq-gold/30 relative">
            <button onClick={() => setIsAdding(false)} className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-black/40 rounded-full">
               <X size={16} />
            </button>
            <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">إضافة مستخدم جديد</h3>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
               <div>
                  <label className="text-xs text-white/50 block mb-1">اسم المستخدم *</label>
                  <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.replace(/[^ \u0600-\u06FF]/g, '')})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" placeholder="أحرف عربية فقط" />
               </div>
               <div>
                  <label className="text-xs text-white/50 block mb-1">كلمة المرور *</label>
                  <input required type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
               </div>
               <div>
                  <label className="text-xs text-white/50 block mb-1">رقم المستخدم *</label>
                  <input required type="number" value={newUser.userNumber || ""} onChange={e => setNewUser({...newUser, userNumber: parseInt(e.target.value) || undefined})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
               </div>
               <div>
                  <label className="text-xs text-white/50 block mb-1">رقم الهاتف (اختياري)</label>
                  <input type="text" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" placeholder="مثلاً: 07..." />
               </div>
               <div>
                  <label className="text-xs text-white/50 block mb-1">صلاحية المستخدم</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white">
                     <option value="normal">عميل عادي</option>
                     <option value="vip">عميل VIP</option>
                     <option value="sales">موظف مبيعات</option>
                     <option value="admin">مدير عام</option>
                  </select>
               </div>
               <div>
                  <label className="text-xs text-white/50 block mb-1">أجهزة الدخول المسموحة</label>
                  <select value={newUser.allowedDevice} onChange={e => setNewUser({...newUser, allowedDevice: e.target.value as DeviceAccess})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white">
                     <option value="all">جميع الأجهزة (حاسوب + هواتف)</option>
                     <option value="mobile">الموبايل فقط (واجهة مبسطة)</option>
                     <option value="desktop">الحاسوب فقط</option>
                  </select>
               </div>
               <div className="md:col-span-2 mt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-brq-gold text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                     {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                     حفظ المستخدم
                  </button>
               </div>
            </form>
         </div>
      )}
            {editingUser && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white text-black border border-gray-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
               <div className="flex justify-between items-center p-4 border-b border-gray-200">
                  <h3 className="font-bold text-lg">تعديل المستخدم: {editingUser.username}</h3>
                  <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-black transition-colors">
                     <X size={20} />
                  </button>
               </div>
               <form onSubmit={handleUpdate} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs text-gray-500 block mb-1 font-semibold">اسم المستخدم *</label>
                     <input required type="text" value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value.trim()})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-black font-mono" />
                  </div>
                  <div>
                     <label className="text-xs text-gray-500 block mb-1 font-semibold">رقم المستخدم *</label>
                     <input required type="number" value={editingUser.userNumber || ""} onChange={e => setEditingUser({...editingUser, userNumber: parseInt(e.target.value) || undefined})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-black font-mono" />
                  </div>
                  <div>
                     <label className="text-xs text-gray-500 block mb-1 font-semibold">كلمة المرور (اتركها فارغة لعدم التغيير)</label>
                     <input type="text" value={editingUser.password || ""} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-black font-mono" placeholder="********" />
                  </div>
                  <div>
                     <label className="text-xs text-gray-500 block mb-1 font-semibold">رقم الهاتف</label>
                     <input type="text" value={editingUser.phone || ""} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-black font-mono" />
                  </div>
                  <div>
                     <label className="text-xs text-gray-500 block mb-1 font-semibold">صلاحية المستخدم</label>
                     <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-black">
                        <option value="normal">عميل عادي</option>
                        <option value="vip">عميل VIP</option>
                        <option value="sales">موظف مبيعات</option>
                        <option value="admin">مدير عام</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs text-gray-500 block mb-1 font-semibold">أجهزة الدخول المسموحة</label>
                     <select value={editingUser.allowedDevice} onChange={e => setEditingUser({...editingUser, allowedDevice: e.target.value as DeviceAccess})} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-black">
                        <option value="all">جميع الأجهزة (حاسوب + هواتف)</option>
                        <option value="mobile">الموبايل فقط (واجهة مبسطة)</option>
                        <option value="desktop">الحاسوب فقط</option>
                     </select>
                  </div>
                  <div className="md:col-span-2 pt-4 flex justify-end gap-2">
                     <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 hover:bg-gray-100 rounded-lg text-sm transition-colors text-black font-medium">إلغاء</button>
                     <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/30">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        حفظ التعديلات
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
         {/* Live User Stats */}
         <div className="glass-panel border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="font-bold text-sm text-white/60">إحصائيات مباشرة</h3>
            <div className="flex items-center justify-between">
                <span className="text-sm">المتصلون الآن</span>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                   <span className="text-xl font-bold text-emerald-400">{onlineUsersCount}</span>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm">إجمالي المستخدمين</span>
                <span className="text-xl font-bold text-brq-gold">{users.length}</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm">مستخدمين نشطين</span>
                <span className="text-xl font-bold text-blue-400">{activeUsersCount}</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm">المستخدمين الموقوفين</span>
                <span className="text-xl font-bold text-red-400">{users.length - activeUsersCount}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-amber-300">
                   <Eye size={15} />
                   <span className="text-xs font-bold">إجمالي زوار المعرض</span>
                </div>
                <button 
                  onClick={() => setAllVisitsModalOpen(true)}
                  className="text-lg font-bold text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
                  title="عرض سجل جميع الزوار"
                >
                  {showcaseVisits.length}
                </button>
            </div>
         </div>

         {/* Users Table */}
         <div className="lg:col-span-3 glass-panel border border-white/5 rounded-2xl overflow-hidden p-1">
            {users.length === 0 && !isAdding ? (
               <div className="flex-1 flex flex-col justify-center items-center h-48 text-center">
                  <p className="text-white/50 mb-4">لا يوجد مستخدمون حالياً.</p>
               </div>
            ) : (
            <>
               <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3">
                   <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                      <input 
                         type="text"
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="w-full bg-black/40 border border-white/10 rounded-lg pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:border-brq-gold/50 text-white"
                         placeholder="بحث بالاسم، اسم المستخدم، أو رقم المستخدم..."
                      />
                   </div>
               </div>
               
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right whitespace-nowrap">
                     <thead className="bg-black/40 text-white/60">
                        <tr>
                           <th className="p-4 font-medium rounded-tr-lg">اسم المستخدم</th>
                           <th className="p-4 font-medium">رقم المستخدم</th>
                           <th className="p-4 font-medium">رقم الهاتف</th>
                           <th className="p-4 font-medium">كلمة السر</th>
                           <th className="p-4 font-medium">الصلاحية</th>
                           <th className="p-4 font-medium">الدخول</th>
                           <th className="p-4 font-medium">الحالة</th>
                           <th className="p-4 font-medium">آخر نشاط</th>
                           <th className="p-4 font-medium">زيارات المعرض</th>
                           <th className="p-4 font-medium rounded-tl-lg">الإجراءات</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5 text-white/90">
                        {filteredUsers.map((user) => {
                           const online = isUserOnline(user);
                           let lastActivityText = 'غير معروف';
                           if (user.lastActive) {
                               const diffMins = Math.floor((Date.now() - user.lastActive)/60000);
                               if (diffMins < 1) lastActivityText = 'الآن';
                               else if (diffMins < 60) lastActivityText = `منذ ${diffMins} دقيقة`;
                               else lastActivityText = formatDate(user.lastActive);
                           }

                           const userVisits = getUserShowcaseVisits(user);

                           return (
                           <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                 <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-white/20'}`}></span>
                                    <span className="font-mono text-white/70 font-bold">{user.username}</span>
                                 </div>
                              </td>
                              <td className="p-4 font-mono text-white/70">{user.userNumber || "-"}</td>
                              <td className="p-4 font-mono text-white/70" dir="ltr">{user.phone || "-"}</td>
                              <td className="p-4">
                                 <div className="flex items-center gap-2">
                                    <span className="font-mono text-white/70">
                                       {visiblePasswords.has(user.uid) ? (user.password || "---") : "••••••"}
                                    </span>
                                    {user.password && (
                                       <button 
                                          onClick={() => {
                                             const newVisible = new Set(visiblePasswords);
                                             if (newVisible.has(user.uid)) newVisible.delete(user.uid);
                                             else newVisible.add(user.uid);
                                             setVisiblePasswords(newVisible);
                                          }}
                                          className="text-white/40 hover:text-white transition-colors"
                                       >
                                          {visiblePasswords.has(user.uid) ? <EyeOff size={14} /> : <Eye size={14} />}
                                       </button>
                                    )}

                                 </div>
                              </td>
                              <td className="p-4 text-xs font-bold">
                                  <span className={`px-2 py-1 rounded border border-white/10 ${
                                      user.role === 'admin' ? 'bg-brq-gold/20 text-brq-gold' : 
                                      user.role === 'sales' ? 'bg-blue-400/20 text-blue-400' :
                                      user.role === 'vip' ? 'bg-purple-400/20 text-purple-400' :
                                      'bg-gray-400/20 text-gray-400'
                                  }`}>
                                      {getRoleLabel(user.role)}
                                  </span>
                              </td>
                              <td className="p-4">
                                 <div className="flex items-center gap-1.5" title={user.allowedDevice === 'all' ? 'جميع الأجهزة' : user.allowedDevice === 'mobile' ? 'موبايل' : 'حاسوب'}>
                                     {getDeviceIcon(user.allowedDevice)}
                                     <span className="text-xs text-white/50">{user.allowedDevice === 'all' ? 'الكل' : user.allowedDevice === 'mobile' ? 'موبايل' : 'حاسوب'}</span>
                                 </div>
                              </td>
                              <td className="p-4">
                                  <div className="flex items-center gap-1.5 object-contain">
                                      <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                      <span className="text-xs">{user.status === 'active' ? 'نشط' : 'موقوف'}</span>
                                  </div>
                              </td>
                              <td className="p-4 text-xs text-white/50">
                                  {lastActivityText}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-1 min-w-[130px]">
                                   <button
                                      onClick={() => setSelectedAgentVisits({ user, visits: userVisits })}
                                      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                         userVisits.length > 0
                                            ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                                            : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                                      }`}
                                      title="انقر لفتح سجل زوار هذا الحساب"
                                   >
                                      <span className="flex items-center gap-1.5">
                                         <Eye size={14} className={userVisits.length > 0 ? 'text-amber-400' : 'text-white/30'} />
                                         <span>{userVisits.length} زائر</span>
                                      </span>
                                      {userVisits.length > 0 && (
                                         <span className="text-[10px] bg-amber-400/20 px-1.5 py-0.5 rounded text-amber-200">عرض</span>
                                      )}
                                   </button>

                                   {userVisits.length > 0 && (
                                      <div className="flex flex-col gap-0.5 max-h-16 overflow-y-auto no-scrollbar pr-0.5">
                                         {userVisits.slice(0, 2).map((v, i) => (
                                            <div key={i} className="text-[10px] text-white/70 flex items-center justify-between gap-1 truncate" title={`${v.visitorName} (${formatDateTime(v.timestamp)})`}>
                                               <span className="truncate text-amber-200/90">• {v.visitorName}</span>
                                               <span className="text-[9px] text-white/40 shrink-0">{formatTimeAgo(v.timestamp)}</span>
                                            </div>
                                         ))}
                                         {userVisits.length > 2 && (
                                            <button 
                                               onClick={() => setSelectedAgentVisits({ user, visits: userVisits })}
                                               className="text-[9px] text-amber-400/80 font-bold hover:underline text-right"
                                            >
                                               +{userVisits.length - 2} زوار آخرين...
                                            </button>
                                         )}
                                      </div>
                                   )}
                                </div>
                              </td>
                              <td className="p-4">
                                 <div className="flex items-center gap-2">
                                    {user.status === 'active' ? (
                                       <button onClick={() => toggleStatus(user.uid, user.status)} title="إيقاف" className="p-1.5 hover:bg-orange-500/20 text-orange-400 rounded transition-colors"><ShieldX size={16} /></button>
                                    ) : (
                                       <button onClick={() => toggleStatus(user.uid, user.status)} title="تفعيل" className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"><CheckCircle size={16} /></button>
                                    )}

                                    {user.role !== 'admin' && (
                                       <>
                                       <button onClick={() => setEditingUser({...user, password: ""})} title="تعديل" className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"><Edit size={16} /></button>
                                       <button onClick={() => handleDelete(user.uid, user.username, user.role)} title="حذف" className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"><X size={16} /></button>
                                       </>
                                    )}

                                 </div>
                              </td>
                           </tr>
                        )})}
                     </tbody>
                  </table></div></>)}</div></div>

      {/* Modal 1: Selected Agent Visitors Modal */}
      {selectedAgentVisits && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-2xl border border-amber-500/30 bg-slate-950 p-6 relative shadow-2xl flex flex-col max-h-[85vh]">
            <button 
              onClick={() => setSelectedAgentVisits(null)}
              className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Eye size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">سجل زوار المعرض للوكيل</h3>
                <p className="text-xs text-amber-300/90 font-medium mt-0.5">
                  {selectedAgentVisits.user.fullName || selectedAgentVisits.user.username} (#{selectedAgentVisits.user.userNumber || '-'})
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3 text-xs bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-white/60">إجمالي الزوار المسجلين لهذا الوكيل:</span>
              <span className="text-amber-400 font-bold text-sm font-mono">{selectedAgentVisits.visits.length} زائر</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {selectedAgentVisits.visits.length === 0 ? (
                <div className="text-center py-10 text-white/40 text-xs">
                  لم يقم أي زائر بالدخول عبر رابط هذا الوكيل حتى الآن.
                </div>
              ) : (
                selectedAgentVisits.visits.map((visit, idx) => {
                  const isBlocked = isVisitorInBlockedList(visit.visitorPhone, visit.visitorName, blockedVisitors);
                  return (
                    <div key={idx} className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isBlocked ? 'bg-red-950/20 border-red-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${
                          isBlocked ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                            <span>{visit.visitorName}</span>
                            {visit.visitorPhone && (
                              <a
                                href={`https://wa.me/${visit.visitorPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-1 font-mono transition-colors"
                                title="تواصل عبر واتساب"
                              >
                                <Phone size={11} />
                                <span dir="ltr">{visit.visitorPhone}</span>
                              </a>
                            )}
                            {isBlocked ? (
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold flex items-center gap-1">
                                <ShieldAlert size={10} />
                                موقوف
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold flex items-center gap-1">
                                <CheckCircle size={10} />
                                نشط
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/40 flex items-center gap-1.5 mt-0.5">
                            <Clock size={11} />
                            <span>{formatDateTime(visit.timestamp)}</span>
                            <span className="text-amber-300/80 font-mono">({formatTimeAgo(visit.timestamp)})</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <span className="px-2 py-1 text-[10px] rounded bg-white/5 text-white/60 border border-white/10 font-bold">
                          {visit.inviteToken ? 'رابط دعوة' : 'دخول مباشر'}
                        </span>
                        <button
                          onClick={() => handleToggleBlockVisitor(visit)}
                          disabled={isBlockingLoading}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 ${
                            isBlocked
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                              : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                          }`}
                          title={isBlocked ? "تفعيل حساب الزائر" : "إيقاف حساب الزائر"}
                        >
                          {isBlocked ? (
                            <>
                              <UserCheck size={13} />
                              <span>تفعيل</span>
                            </>
                          ) : (
                            <>
                              <UserX size={13} />
                              <span>إيقاف</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setSelectedAgentVisits(null)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: All Showcase Visitors Modal */}
      {allVisitsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl rounded-2xl border border-amber-500/30 bg-slate-950 p-6 relative shadow-2xl flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setAllVisitsModalOpen(false)}
              className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Eye size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">سجل جميع زوار المعرض</h3>
                  <p className="text-xs text-white/50">
                    متابعة حية وشاملة لجميع الزوار مع إمكانية إيقاف أو تفعيل أي حساب مباشرة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => printVisitorsLogToPDF(filteredShowcaseVisits, users, {
                  title: 'سجل زوار المعارض والمستخدمين الداخلين (حتى لحظة الطباعة)',
                  filterDescription: modalAgentFilter !== 'all' ? `الوكيل المختار: ${modalAgentFilter}` : undefined
                })}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
                title="طباعة وحفظ السجل كملف PDF"
              >
                <Printer size={15} />
                <span>طباعة كملف PDF</span>
              </button>
            </div>

            {/* Filter and Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                <input 
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg pr-10 pl-4 py-2 text-xs focus:outline-none focus:border-amber-500/50 text-white"
                  placeholder="بحث باسم الزائر أو رقم الهاتف أو الوكيل..."
                />
              </div>
              <select 
                value={modalAgentFilter}
                onChange={(e) => setModalAgentFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-amber-500/50 outline-none text-white"
              >
                <option value="all">جميع الوكلاء والحسابات ({showcaseVisits.length} زائر)</option>
                {users.map(u => {
                  const count = getUserShowcaseVisits(u).length;
                  return (
                    <option key={u.uid} value={u.username || u.fullName}>
                      {u.fullName || u.username} ({count} زائر)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* View Mode Switcher: Grouped by Agent (Default) vs Flat List */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-white/5 p-1.5 rounded-xl border border-white/10">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVisitorViewMode('grouped')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    visitorViewMode === 'grouped'
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title="عرض كل وكيل ومعه قائمة زبائنه والداخلين من طرفه بالسرة"
                >
                  <Store size={14} />
                  <span>تصنيف حسب الوكلاء (كل وكيل وزبائنه سوة)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    visitorViewMode === 'list'
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title="عرض زمني شامل لكافة الزوار"
                >
                  <Layers size={14} />
                  <span>عرض زمني موحد</span>
                </button>
              </div>
              <span className="text-[11px] text-amber-300/80 px-2 font-mono">
                {groupedShowcaseVisits.length} جهة / وكيل
              </span>
            </div>

            {/* Visits List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {filteredShowcaseVisits.length === 0 ? (
                <div className="text-center py-12 text-white/40 text-sm">
                  لا توجد زيارات مسجلة تطابق خيارات البحث.
                </div>
              ) : visitorViewMode === 'grouped' ? (
                // Grouped by Agent Mode ("كل وكيل وزبائنه سوة ومصنفين")
                groupedShowcaseVisits.map((group, gIdx) => (
                  <div key={group.agentKey} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    {/* Agent Header Section */}
                    <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                          <Store size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-black text-white flex items-center gap-2">
                            <span>الوكيل: {group.agentName}</span>
                            {group.user?.userNumber && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono">
                                #{group.user.userNumber}
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                              {group.visits.length} زائر مسجل
                            </span>
                          </div>
                          <div className="text-[11px] text-white/50 flex items-center gap-2 mt-0.5">
                            <span>الجهة المضيفة للرابط</span>
                            {group.agentPhone && (
                              <span className="text-emerald-400 font-mono" dir="ltr">{group.agentPhone}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {group.agentPhone && (
                        <a
                          href={`https://wa.me/${group.agentPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Phone size={12} />
                          <span>واتساب الوكيل</span>
                        </a>
                      )}
                    </div>

                    {/* Visitors of this Agent Listed One Under Another ("واحد تحت الثاني") */}
                    <div className="p-3 space-y-2.5">
                      {group.visits.map((visit, vIdx) => {
                        const isBlocked = isVisitorInBlockedList(visit.visitorPhone, visit.visitorName, blockedVisitors);
                        return (
                          <div key={visit.id || vIdx} className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isBlocked ? 'bg-red-950/20 border-red-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${
                                isBlocked ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              }`}>
                                {vIdx + 1}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                                  <span>{visit.visitorName}</span>
                                  {visit.visitorPhone && (
                                    <a
                                      href={`https://wa.me/${visit.visitorPhone.replace(/[^0-9]/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-1 font-mono transition-colors"
                                      title="تواصل عبر واتساب"
                                    >
                                      <Phone size={11} />
                                      <span dir="ltr">{visit.visitorPhone}</span>
                                    </a>
                                  )}
                                  {isBlocked ? (
                                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold flex items-center gap-1">
                                      <ShieldAlert size={10} />
                                      موقوف
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold flex items-center gap-1">
                                      <CheckCircle size={10} />
                                      نشط
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-white/40 flex items-center gap-2 mt-1">
                                  <Clock size={11} />
                                  <span>{formatDateTime(visit.timestamp)}</span>
                                  <span className="text-amber-300/80 font-mono">({formatTimeAgo(visit.timestamp)})</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <span className="px-2.5 py-1 text-[11px] rounded-lg bg-white/5 text-white/60 border border-white/10 font-bold">
                                {visit.inviteToken ? 'رابط دعوة' : 'دخول مباشر'}
                              </span>
                              <button
                                onClick={() => handleToggleBlockVisitor(visit)}
                                disabled={isBlockingLoading}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 ${
                                  isBlocked
                                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 shadow-sm'
                                }`}
                                title={isBlocked ? "تفعيل حساب الزائر والسماح له بالدخول" : "إيقاف حساب الزائر ومنعه من دخول المعرض"}
                              >
                                {isBlocked ? (
                                  <>
                                    <UserCheck size={14} />
                                    <span>تفعيل الحساب</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX size={14} />
                                    <span>إيقاف الحساب</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                // Chronological Flat List
                filteredShowcaseVisits.map((visit, idx) => {
                  const isBlocked = isVisitorInBlockedList(visit.visitorPhone, visit.visitorName, blockedVisitors);
                  return (
                    <div key={idx} className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isBlocked ? 'bg-red-950/20 border-red-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${
                          isBlocked ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                            <span>{visit.visitorName}</span>
                            {visit.visitorPhone && (
                              <a
                                href={`https://wa.me/${visit.visitorPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-1 font-mono transition-colors"
                                title="تواصل عبر واتساب"
                              >
                                <Phone size={11} />
                                <span dir="ltr">{visit.visitorPhone}</span>
                              </a>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                              الوكيل: {visit.agentName}
                            </span>
                            {isBlocked ? (
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold flex items-center gap-1">
                                <ShieldAlert size={10} />
                                موقوف
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold flex items-center gap-1">
                                <CheckCircle size={10} />
                                نشط
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/40 flex items-center gap-2 mt-1">
                            <Clock size={11} />
                            <span>{formatDateTime(visit.timestamp)}</span>
                            <span className="text-amber-300/80 font-mono">({formatTimeAgo(visit.timestamp)})</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <span className="px-2.5 py-1 text-[11px] rounded-lg bg-white/5 text-white/60 border border-white/10 font-bold">
                          {visit.inviteToken ? 'رابط دعوة' : 'دخول مباشر'}
                        </span>
                        <button
                          onClick={() => handleToggleBlockVisitor(visit)}
                          disabled={isBlockingLoading}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 ${
                            isBlocked
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                              : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 shadow-sm'
                          }`}
                          title={isBlocked ? "تفعيل حساب الزائر والسماح له بالدخول" : "إيقاف حساب الزائر ومنعه من دخول المعرض"}
                        >
                          {isBlocked ? (
                            <>
                              <UserCheck size={14} />
                              <span>تفعيل الحساب</span>
                            </>
                          ) : (
                            <>
                              <UserX size={14} />
                              <span>إيقاف الحساب</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
              <span>المعروض: {filteredShowcaseVisits.length} من إجمالي {showcaseVisits.length} زائر</span>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => printVisitorsLogToPDF(filteredShowcaseVisits, users, {
                    title: 'سجل زوار المعارض والمستخدمين الداخلين (حتى لحظة الطباعة)',
                    filterDescription: modalAgentFilter !== 'all' ? `الوكيل المختار: ${modalAgentFilter}` : undefined
                  })}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>طباعة السجل كملف PDF</span>
                </button>
                <button 
                  onClick={() => setAllVisitsModalOpen(false)}
                  className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Blocked Visitors Management Modal */}
      {blockedVisitorsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-3xl rounded-2xl border border-red-500/40 bg-slate-950 p-6 relative shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setBlockedVisitorsModalOpen(false)}
              className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">إدارة الحسابات والزوار الموقوفين</h3>
                <p className="text-xs text-white/50">
                  إيقاف أو حظر أرقام هواتف وزوار روابط المعرض لمنعهم من تصفح الموديلات والأسعار
                </p>
              </div>
            </div>

            {/* Quick manual block form */}
            <form onSubmit={handleManualBlock} className="p-4 bg-red-950/20 border border-red-500/25 rounded-2xl mb-4">
              <h4 className="text-xs font-bold text-red-300 mb-2 flex items-center gap-1.5">
                <Ban size={14} />
                <span>إيقاف حساب زائر يدوياً</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-white/60 block mb-1">رقم الهاتف (أساسي)</label>
                  <input
                    type="text"
                    value={manualBlockPhone}
                    onChange={(e) => setManualBlockPhone(e.target.value)}
                    placeholder="مثلاً: 07801234567"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-red-500 outline-none text-white font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-white/60 block mb-1">اسم الزائر (اختياري)</label>
                  <input
                    type="text"
                    value={manualBlockName}
                    onChange={(e) => setManualBlockName(e.target.value)}
                    placeholder="اسم الزائر للتأكيد"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-red-500 outline-none text-white"
                  />
                </div>
                <div className="sm:self-end">
                  <button
                    type="submit"
                    disabled={isBlockingLoading || (!manualBlockPhone.trim() && !manualBlockName.trim())}
                    className="w-full py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isBlockingLoading ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                    <span>إيقاف الحساب فوراً</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Blocked List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {blockedVisitors.length === 0 ? (
                <div className="text-center py-12 text-white/40 text-xs flex flex-col items-center gap-2">
                  <ShieldCheck size={32} className="text-emerald-400/60" />
                  <p>لا يوجد أي زائر موقوف حالياً. جميع الزوار يمتلكون صلاحية الدخول وتصفح المعرض.</p>
                </div>
              ) : (
                blockedVisitors.map((b, idx) => (
                  <div key={b.id || idx} className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-red-950/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-300 font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                          <span>{b.visitorName || 'زائر غير محدد'}</span>
                          {b.phone && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-mono" dir="ltr">
                              {b.phone}
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/30 text-red-200 border border-red-500/40 font-bold">
                            موقوف عن الدخول
                          </span>
                        </div>
                        <div className="text-[11px] text-white/40 flex items-center gap-2 mt-1">
                          <Clock size={11} />
                          <span>تاريخ الإيقاف: {formatDateTime(b.blockedAt)}</span>
                          {b.blockedBy && <span>• بواسطة: {b.blockedBy}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleDirectUnblock(b.id || b.phone || b.visitorName || '', b.visitorName)}
                        disabled={isBlockingLoading}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                        title="إلغاء الحظر وتفعيل الحساب فوراً"
                      >
                        <UserCheck size={14} />
                        <span>تفعيل الحساب</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
              <span>إجمالي المحظورين: {blockedVisitors.length} زائر</span>
              <button 
                onClick={() => setBlockedVisitorsModalOpen(false)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default function UserManager() {
  return (
    <UserManagerErrorBoundary>
      <UserManagerContent />
    </UserManagerErrorBoundary>
  );
}
