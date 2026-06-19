import { Bell, Search, Plus, CheckCircle, Trash2, Loader2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Update } from '../../types.ts';
import { useStore } from '../../store';

export default function NotificationManager() {
  const { user } = useStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newNotif, setNewNotif] = useState({ title: '', message: '', type: 'announcement' });

  useEffect(() => {
    let mounted = true;
    const fetchNotifs = async () => {
      try {
        const dbNotifs = await api.getUpdates();
        if (mounted) {
          setNotifications(dbNotifs.map((n: any) => ({
             ...n,
             createdAt: new Date(n.createdAt).getTime()
          })));
          setLoading(false);
        }
      } catch (error) {
        console.error(error);
        if (mounted) setLoading(false);
      }
    };
    fetchNotifs();
    const inv = setInterval(fetchNotifs, 5000);
    return () => {
      mounted = false;
      clearInterval(inv);
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotif.title || !newNotif.message) return;
    try {
      await api.createUpdate({
        ...newNotif,
      });
      setIsAdding(false);
      setNewNotif({ title: '', message: '', type: 'announcement' });
      const updated = await api.getUpdates();
      setNotifications(updated.map((n: any) => ({
         ...n,
         createdAt: new Date(n.createdAt).getTime()
      })));
    } catch(e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    // optional logic depending on how read status is stored (not in postgres schema currently)
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف الإشعار "${title}" ونقله لسلة المحذوفات؟`)) {
       return;
    }
    try {
      await api.deleteUpdate(id, user?.username);
      const updated = await api.getUpdates();
      setNotifications(updated.map((n: any) => ({
         ...n,
         createdAt: new Date(n.createdAt).getTime()
      })));
    } catch(e) {
      console.error(e);
      alert('حدث خطأ أثناء الحذف');
    }
  };

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
             <h2 className="text-2xl font-bold text-white mb-1">الإشعارات والتحديثات</h2>
             <p className="text-sm text-white/50">إرسال تنبيهات وعروض ومتابعة أحدث الأنشطة</p>
         </div>
         <div className="flex gap-2">
            <button onClick={() => setIsAdding(!isAdding)} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-navy border border-brq-gold/50 text-brq-gold rounded-xl hover:bg-brq-gold hover:text-black transition-all text-sm font-bold">
               <Plus size={18} /> إنشاء إشعار
            </button>
            <button onClick={markAllAsRead} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(30,94,255,0.3)]">
               <CheckCircle size={18} /> تحديد الكل كمقروء
            </button>
         </div>
      </div>

      {isAdding && (
         <div className="glass-panel p-6 rounded-2xl border border-brq-gold/30 relative">
            <button onClick={() => setIsAdding(false)} className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-black/40 rounded-full">
               <X size={16} />
            </button>
            <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">إرسال إشعار جديد للعملاء</h3>
            <form onSubmit={handleCreate} className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs text-white/50 block mb-1">عنوان الإشعار *</label>
                    <input required type="text" value={newNotif.title} onChange={e => setNewNotif({...newNotif, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white" />
                 </div>
                 <div>
                    <label className="text-xs text-white/50 block mb-1">النوع</label>
                    <select value={newNotif.type} onChange={e => setNewNotif({...newNotif, type: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white">
                       <option value="announcement">تنبيه / إعلان</option>
                       <option value="offer">عرض خاص</option>
                       <option value="new_product">منتج جديد</option>
                    </select>
                 </div>
               </div>
               <div>
                  <label className="text-xs text-white/50 block mb-1">رسالة الإشعار *</label>
                  <textarea required rows={3} value={newNotif.message} onChange={e => setNewNotif({...newNotif, message: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white"></textarea>
               </div>
               <button type="submit" className="w-full py-3 bg-brq-gold text-black font-bold rounded-lg mt-2">
                  نشر الإشعار
               </button>
            </form>
         </div>
      )}

      {notifications.length === 0 && !isAdding ? (
        <div className="flex-1 flex flex-col justify-center items-center h-[60vh] text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-brq-navy flex items-center justify-center text-brq-gold">
            <Bell size={48} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">لا توجد إشعارات</h2>
            <p className="text-white/50 max-w-md mx-auto">لم يتم العثور على أي تحديثات أو إشعارات حالياً.</p>
          </div>
        </div>
      ) : (
      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden p-1">
         <div className="divide-y divide-white/5 text-white/90">
            {notifications.map((n) => {
              const date = new Date(n.createdAt || Date.now()).toLocaleString('ar-IQ');
              return (
              <div key={n.id} className={`p-4 flex items-start gap-4 transition-colors hover:bg-white/5 ${!n.read ? 'bg-brq-gold/5 border-r-2 border-brq-gold' : ''}`}>
                 <div className={`p-2 rounded-full ${!n.read ? 'bg-brq-gold/20 text-brq-gold' : 'bg-white/5 text-white/50'}`}>
                   <Bell size={20} />
                 </div>
                 <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-sm">{n.title}</h4>
                      <span className="text-xs text-white/40">{date}</span>
                    </div>
                    <p className="text-sm text-white/60">{n.message}</p>
                 </div>
                 <div className="flex items-center">
                   <button onClick={() => handleDelete(n.id, n.title)} className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                     <Trash2 size={16} />
                   </button>
                 </div>
              </div>
            )})}
         </div>
      </div>
      )}
    </div>
  );
}
