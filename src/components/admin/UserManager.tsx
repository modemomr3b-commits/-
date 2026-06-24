import { Users, Plus, Search, Filter, Edit, ShieldX, CheckCircle, KeyRound, MoreVertical, Loader2, X, Trash2, Smartphone, Monitor, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import bcryptjs from 'bcryptjs';
import { api } from '../../api';
import { User, UserRole, DeviceAccess, UserStatus } from '../../types';
import { useStore } from '../../store';

export default function UserManager() {
  const { user: currentUser } = useStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '', password: '', fullName: '', phone: '', role: 'normal', status: 'active', allowedDevice: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchUsers = async () => {
      try {
        const dbUsers = await api.getUsers();
        if (mounted) {
          setUsers(dbUsers.map((u: any) => ({...u, uid: u.id})));
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setLoading(false);
      }
    };
    fetchUsers();
    const inv = setInterval(fetchUsers, 5000);
    return () => {
      mounted = false;
      clearInterval(inv);
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.fullName || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const salt = bcryptjs.genSaltSync(10);
      const hashedPassword = newUser.password ? bcryptjs.hashSync(newUser.password, salt) : '';
      const userToCreate = {
        id: newUser.username,
        uid: newUser.username,
        username: newUser.username,
        password: hashedPassword,
        fullName: newUser.fullName,
        phone: newUser.phone || '',
        role: newUser.role || 'normal',
        status: newUser.status || 'active',
        allowedDevice: newUser.allowedDevice || 'all',
        createdAt: Date.now()
      };
      await api.createUser(userToCreate);
      
      // log action
      await api.logAction({
        userId: currentUser?.uid || '',
        userName: currentUser?.username || 'System',
        action: 'إنشاء مستخدم',
        entityType: 'user',
        entityId: newUser.username,
        details: { role: newUser.role, fullName: newUser.fullName }
      });

      setIsAdding(false);
      setNewUser({ username: '', password: '', fullName: '', phone: '', role: 'normal', status: 'active', allowedDevice: 'all' });
      const updated = await api.getUsers();
      setUsers(updated.map((u: any) => ({...u, uid: u.id})));
    } catch(e) {
      console.error(e);
      alert('فشل إنشاء المستخدم. ربما اسم المستخدم موجود مسبقاً.');
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

  const filteredUsers = users.filter(u => 
    (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
             <h2 className="text-2xl font-bold text-white mb-1">إدارة المستخدمين</h2>
             <p className="text-sm text-white/50">التحكم في الصلاحيات والمستخدمين النشطين</p>
         </div>
         <button onClick={() => setIsAdding(!isAdding)} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(30,94,255,0.3)]">
             <Plus size={18} /> إضافة مستخدم
         </button>
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
                  <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.trim()})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
               </div>
               <div>
                  <label className="text-xs text-white/50 block mb-1">كلمة المرور *</label>
                  <input required type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
               </div>
               <div>
                  <label className="text-xs text-white/50 block mb-1">الاسم الكامل *</label>
                  <input required type="text" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white" />
               </div>
               <div>
                  <label className="text-xs text-white/50 block mb-1">رقم الهاتف (اختياري)</label>
                  <input type="text" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
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
                         placeholder="بحث بالاسم أو اسم المستخدم..."
                      />
                   </div>
               </div>
               
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right whitespace-nowrap">
                     <thead className="bg-black/40 text-white/60">
                        <tr>
                           <th className="p-4 font-medium rounded-tr-lg">اسم المستخدم</th>
                           <th className="p-4 font-medium">الاسم الكامل</th>
                           <th className="p-4 font-medium">الصلاحية</th>
                           <th className="p-4 font-medium">الدخول</th>
                           <th className="p-4 font-medium">الحالة</th>
                           <th className="p-4 font-medium">آخر نشاط</th>
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
                               else lastActivityText = new Date(user.lastActive).toLocaleDateString('ar-IQ');
                           }

                           return (
                           <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                 <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-white/20'}`}></span>
                                    <span className="font-mono text-white/70 font-bold">{user.username}</span>
                                 </div>
                              </td>
                              <td className="p-4">{user.fullName}</td>
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
                                 <div className="flex items-center gap-2">
                                    {user.status === 'active' ? (
                                       <button onClick={() => toggleStatus(user.uid, user.status)} title="إيقاف" className="p-1.5 hover:bg-orange-500/20 text-orange-400 rounded transition-colors"><ShieldX size={16} /></button>
                                    ) : (
                                       <button onClick={() => toggleStatus(user.uid, user.status)} title="تفعيل" className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"><CheckCircle size={16} /></button>
                                    )}
                                    {user.role !== 'admin' && (
                                       <button onClick={() => handleDelete(user.uid, user.username, user.role)} title="حذف" className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"><X size={16} /></button>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        )})}
                     </tbody>
                  </table>
               </div>
            </>
            )}
         </div>
      </div>
    </div>
  );
}
