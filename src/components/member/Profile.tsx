import { useStore } from '../../store';
import { Download, Share, UserCircle, ShoppingBag, Eye, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Order, OrderStatus } from '../../types';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const statusMap: Record<OrderStatus, { label: string, color: string }> = {
  new: { label: 'جديد', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  reviewing: { label: 'قيد المراجعة', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
  contacted: { label: 'تم التواصل', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  completed: { label: 'مكتمل', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'ملغى', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function Profile() {
  const { user, setUser } = useStore();
  const { deferredPrompt, isIOS: isIos, handleInstallClick: handleInstall } = usePWAInstall();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  useEffect(() => {
    const fetchMyOrders = async () => {
       if (!user?.uid) return;
       try {
         const allOrders = await api.getOrders();
         const myOrders = allOrders.filter(o => o.userId === user.uid).sort((a: any, b: any) => b.createdAt - a.createdAt);
         setOrders(myOrders);
       } catch(e) {
         console.error(e);
       } finally {
         setLoadingOrders(false);
       }
    };
    fetchMyOrders();
    const inv = setInterval(fetchMyOrders, 5000); // Check for order updates
    return () => clearInterval(inv);
  }, [user?.uid]);

  const handleLogout = () => {
    setUser(null);
  };

  const getRoleLabel = (role: string | undefined) => {
    switch (role) {
      case 'admin': return 'مدير عام';
      case 'sales': return 'موظف مبيعات';
      case 'vip': return 'عميل VIP';
      case 'normal': return 'عميل عادي';
      default: return role || 'مستخدم';
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 mt-4 max-w-3xl mx-auto flex flex-col gap-6">
      
      {/* Profile Header */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center md:items-start gap-4">
        <div className="w-20 h-20 bg-brq-navy rounded-full border-2 border-brq-gold flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)]">
           <UserCircle className="text-brq-gold w-12 h-12" />
        </div>
        <div className="flex-1 text-center md:text-right">
           <h2 className="text-2xl font-bold text-white mb-1">{user.fullName || user.username}</h2>
           <p className="text-white/60 font-mono mb-2">@{user.username}</p>
           <span className="bg-brq-gold/20 border border-brq-gold text-brq-gold px-3 py-1 rounded-full text-xs font-bold">
              {getRoleLabel(user.role)}
           </span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 bg-red-500/20 text-red-500 border border-red-500/50 px-6 py-2.5 rounded-xl hover:bg-red-500/30 transition-colors font-bold tracking-wide w-full md:w-auto mt-4 md:mt-0"
        >
          <LogOut size={18} /> خروج
        </button>
      </div>

      {!isInstalled && (
        <div className="glass-panel p-6 rounded-2xl border border-brq-royal/30 bg-brq-royal/10">
          <h3 className="text-lg font-bold text-white mb-2">تثبيت التطبيق</h3>
          <p className="text-white/60 text-sm mb-4">أضف التطبيق إلى الشاشة الرئيسية للوصول إليه بسرعة وسهولة.</p>
          
          {isIos ? (
            <div className="bg-black/30 rounded-xl p-4 flex flex-col gap-3 text-sm text-white/80">
               <p className="flex items-center gap-2">
                 ١. اضغط على زر المشاركة <Share size={16} className="text-brq-gold" /> في متصفح سفاري
               </p>
               <p className="flex items-center gap-2">
                 ٢. اختر "إضافة للشاشة الرئيسية" 
               </p>
            </div>
          ) : (
            <button 
              onClick={handleInstall}
              disabled={!deferredPrompt}
              className="w-full py-3 bg-brq-royal hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-colors"
            >
              <Download size={18} /> {deferredPrompt ? 'تثبيت الآن' : 'التثبيت غير متاح حالياً'}
            </button>
          )}
        </div>
      )}

      {/* Order History */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 flex-1">
         <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4 mb-4 flex items-center gap-2">
           <ShoppingBag className="text-brq-gold" size={24} /> سجل الطلبات السابقة
         </h3>

         {loadingOrders ? (
            <div className="flex justify-center py-8">
               <div className="w-8 h-8 border-2 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
         ) : orders.length === 0 ? (
            <div className="text-center py-12 text-white/50">
               لا يوجد لديك طلبات سابقة.
            </div>
         ) : (
            <div className="space-y-4">
               {orders.map(order => (
                  <div key={order.id} className="bg-black/40 border border-white/5 rounded-xl p-4">
                     <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1">
                           <span className="font-bold text-white break-all flex items-center gap-2">
                             طلب #{order.orderNumber || order.id.slice(0,8).toUpperCase()}
                           </span>
                           <span className="text-xs text-white/40" dir="ltr">{new Date(order.createdAt).toLocaleString('ar-IQ')}</span>
                        </div>
                        <span className={`px-2 py-1 rounded border text-xs font-bold whitespace-nowrap ${statusMap[order.status || 'new']?.color}`}>
                           {statusMap[order.status || 'new']?.label}
                        </span>
                     </div>
                     <div className="flex justify-between items-end border-t border-white/5 pt-3 mt-3">
                        <span className="text-sm text-white/60 font-medium">عدد المنتجات: <span className="text-brq-gold font-bold">{order.totalQuantity}</span></span>
                        <div className="flex gap-2">
                          {/* Maybe a summary of items here, but right now a quick list */}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

    </div>
  );
}
