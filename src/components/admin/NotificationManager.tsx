import { Bell, Search, Plus, CheckCircle, Trash2, Loader2, X, MessageCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Update, Notification } from '../../types';
import { useStore } from '../../store';

export default function NotificationManager() {
  const { user } = useStore();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newNotif, setNewNotif] = useState({ title: '', message: '', type: 'announcement' });
  const [activeTab, setActiveTab] = useState<'admin' | 'clients'>('admin');

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [dbUpdates, dbNotifications] = await Promise.all([
          api.getUpdates(),
          api.getNotifications()
        ]);
        if (mounted) {
          setAnnouncements(dbUpdates.map((n: any) => ({
             ...n,
             createdAt: new Date(n.createdAt).getTime()
          })));
          setAdminNotifications(dbNotifications.sort((a,b) => b.createdAt - a.createdAt));
          setLoading(false);
        }
      } catch (error) {
        console.error(error);
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    const inv = setInterval(fetchData, 5000);
    return () => {
      mounted = false;
      clearInterval(inv);
    };
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotif.title || !newNotif.message) return;
    try {
      await api.createUpdate({
        ...newNotif,
      });
      setIsAdding(false);
      setNewNotif({ title: '', message: '', type: 'announcement' });
      const updated = await api.getUpdates();
      setAnnouncements(updated.map((n: any) => ({
         ...n,
         createdAt: new Date(n.createdAt).getTime()
      })));
    } catch(e) {
      console.error(e);
    }
  };

  const markAllAdminAsRead = async () => {
    try {
      const unread = adminNotifications.filter(n => !n.read);
      for (const n of unread) {
        if (n.id) await api.markNotificationRead(n.id);
      }
      const updated = await api.getNotifications();
      setAdminNotifications(updated.sort((a,b) => b.createdAt - a.createdAt));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAnnouncement = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف التحديث "${title}" بشكل نهائي؟`)) return;
    try {
      await api.deleteUpdate(id, user?.username);
      const updated = await api.getUpdates();
      setAnnouncements(updated.map((n: any) => ({
         ...n,
         createdAt: new Date(n.createdAt).getTime()
      })));
    } catch(e) {
      console.error(e);
    }
  };

  const handleDeleteAdminNotif = async (id: string) => {
    try {
      await api.deleteNotification(id, user?.username);
      const updated = await api.getNotifications();
      setAdminNotifications(updated.sort((a,b) => b.createdAt - a.createdAt));
    } catch(e) {
       console.error(e);
    }
  };

  const markAsRead = async (id: string, read: boolean) => {
    if (read) return;
    try {
      await api.markNotificationRead(id);
      const updated = await api.getNotifications();
      setAdminNotifications(updated.sort((a,b) => b.createdAt - a.createdAt));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-brq-gold w-12 h-12" />
      </div>
    );
  }

  const unreadCount = adminNotifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
             <h2 className="text-2xl font-bold text-white mb-1">الإشعارات والتحديثات</h2>
             <p className="text-sm text-white/50">تلقي الطلبات الجديدة وإرسال التحديثات للعملاء</p>
         </div>
         <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setActiveTab('admin')} 
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'admin' ? 'bg-brq-navy text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
            >
               <Bell size={16} /> 
               إشعارات النظام
               {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('clients')} 
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'clients' ? 'bg-brq-navy text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
            >
               <MessageCircle size={16} /> 
               تحديثات العملاء
            </button>
         </div>
      </div>

      {activeTab === 'admin' && (
         <div className="space-y-4">
            <div className="flex justify-end">
               <button onClick={markAllAdminAsRead} className="flex items-center gap-2 text-sm text-brq-gold hover:text-yellow-400 bg-brq-gold/10 px-4 py-2 rounded-xl transition-colors font-bold">
                  <CheckCircle size={16} /> تحديد الكل كمقروء
               </button>
            </div>
            
            <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden p-1">
               {adminNotifications.length === 0 ? (
                  <div className="p-8 text-center text-white/50">لا توجد إشعارات حتى الآن</div>
               ) : (
                  <div className="divide-y divide-white/5">
                     {adminNotifications.map((notif) => (
                        <div key={notif.id} onClick={() => notif.id && markAsRead(notif.id, notif.read)} className={`p-4 flex gap-4 transition-colors cursor-pointer ${notif.read ? 'hover:bg-white/5' : 'bg-brq-gold/5 border-r-2 border-brq-gold hover:bg-brq-gold/10'}`}>
                           <div className={`p-2 rounded-full h-fit flex-shrink-0 ${notif.type === 'order' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/60'}`}>
                              {notif.type === 'order' ? <ShoppingCart size={20} /> : <AlertCircle size={20} />}
                           </div>
                           <div className="flex-1">
                              <p className={`text-sm ${notif.read ? 'text-white/70' : 'text-white font-bold'}`}>{notif.message}</p>
                              <span className="text-xs text-white/40 mt-1 block">{new Date(notif.createdAt).toLocaleString('ar-IQ')}</span>
                           </div>
                           <button onClick={(e) => { e.stopPropagation(); notif.id && handleDeleteAdminNotif(notif.id); }} className="text-white/30 hover:text-red-400 p-2">
                              <Trash2 size={16} />
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      )}

      {activeTab === 'clients' && (
         <div className="space-y-4">
            <div className="flex justify-end">
               <button onClick={() => setIsAdding(!isAdding)} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(30,94,255,0.3)]">
                  <Plus size={18} /> إنشاء تحديث / إعلان
               </button>
            </div>

            {isAdding && (
               <div className="glass-panel p-6 rounded-2xl border border-brq-gold/30 relative">
                  <button onClick={() => setIsAdding(false)} className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-black/40 rounded-full">
                     <X size={16} />
                  </button>
                  <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">إرسال إعلان للعملاء</h3>
                  <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs text-white/50 block mb-1">عنوان الإعلان *</label>
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
                        <label className="text-xs text-white/50 block mb-1">الرسالة *</label>
                        <textarea required rows={3} value={newNotif.message} onChange={e => setNewNotif({...newNotif, message: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white"></textarea>
                     </div>
                     <button type="submit" className="w-full py-3 bg-brq-gold text-black font-bold rounded-lg mt-2">
                        نشر الإعلان
                     </button>
                  </form>
               </div>
            )}

            <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden p-1">
               {announcements.length === 0 ? (
                  <div className="p-8 text-center text-white/50">لا توجد إعلانات نشطة</div>
               ) : (
                  <div className="divide-y divide-white/5">
                     {announcements.map((a) => (
                        <div key={a.id} className="p-4 flex gap-4 hover:bg-white/5 transition-colors">
                           <div className="p-2 rounded-full h-fit flex-shrink-0 bg-brq-navy text-brq-gold">
                              <Bell size={20} />
                           </div>
                           <div className="flex-1">
                              <h4 className="font-bold text-sm text-white mb-1">{a.title}</h4>
                              <p className="text-sm text-white/70">{a.message}</p>
                              <span className="text-xs text-white/40 mt-2 block">{new Date(a.createdAt).toLocaleString('ar-IQ')}</span>
                           </div>
                           <button onClick={() => handleDeleteAnnouncement(a.id, a.title)} className="text-white/30 hover:text-red-400 p-2">
                              <Trash2 size={16} />
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
}
