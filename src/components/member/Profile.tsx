import { useStore } from '../../store';
import { Download, Share, UserCircle, ShoppingBag, Eye, LogOut, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { subscribeToPushNotifications, isSubscribed } from '../../pushService';
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Order, OrderStatus } from '../../types';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const statusMap: Record<OrderStatus, { label: string, color: string }> = {
  new: { label: 'قيد المراجعة', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
  reviewing: { label: 'جاري التجهيز', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  contacted: { label: 'تم التواصل', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  completed: { label: 'تم القبول', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'مرفوض/ملغى', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function Profile() {
  const { user, setUser } = useStore();
  const { deferredPrompt, isIOS: isIos, handleInstallClick: handleInstall } = usePWAInstall();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  useEffect(() => { isSubscribed().then(setPushEnabled); }, []);
  const handleEnablePush = async () => {
    const success = await subscribeToPushNotifications();
    if (success) setPushEnabled(true);
  };
  
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  useEffect(() => {
    const fetchMyOrders = async () => {
       if (!user?.id && !user?.uid) return;
       try {
         const allOrders = await api.getOrders();
         const myOrders = allOrders.filter(o => o.userId === user.id || o.userId === user.uid).sort((a: any, b: any) => b.createdAt - a.createdAt);
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
  }, [user?.uid, user?.id]);

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

  const toggleOrderExpand = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
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

            <div className="glass-panel p-6 rounded-2xl border border-brq-royal/30 bg-brq-royal/10 mb-8 text-center flex flex-col items-center">
        <Bell className={`w-12 h-12 mb-3 ${pushEnabled ? 'text-green-400' : 'text-brq-gold animate-pulse'}`} />
        <h3 className="text-lg font-bold text-white mb-2">إشعارات الهاتف</h3>
        <p className="text-sm text-white/60 mb-4 max-w-xs leading-relaxed">
          {pushEnabled ? 'الإشعارات مفعلة بنجاح، ستصلك أحدث العروض والمنتجات.' : 'احصل على تنبيهات فورية عند إضافة منتجات جديدة أو عروض مميزة، حتى والتطبيق مغلق.'}
        </p>
        {!pushEnabled ? (
          <button 
            onClick={handleEnablePush}
            className="bg-brq-gold text-brq-navy px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 w-full max-w-xs hover:bg-brq-gold/90 transition-all active:scale-95"
          >
            <Bell className="w-4 h-4" />
            تفعيل الإشعارات
          </button>
        ) : (
          <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 w-full max-w-xs">
            الإشعارات مفعلة ✓
          </div>
        )}
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
                  <div key={order.id} className="bg-black/40 border border-white/5 rounded-xl p-4 transition-all">
                     <div className="flex justify-between items-start mb-3 cursor-pointer" onClick={() => toggleOrderExpand(order.id)}>
                        <div className="flex flex-col gap-1">
                           <span className="font-bold text-white break-all flex items-center gap-2">
                             طلب #{order.orderNumber || order.id.slice(0,8).toUpperCase()}
                           </span>
                           <span className="text-xs text-white/40" dir="ltr">{(`${new Date(order.createdAt).getFullYear()}/${new Date(order.createdAt).getMonth() + 1}/${new Date(order.createdAt).getDate()} ${new Date(order.createdAt).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}`)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className={`px-2 py-1 rounded border text-xs font-bold whitespace-nowrap ${statusMap[order.status || 'new']?.color}`}>
                              {statusMap[order.status || 'new']?.label}
                           </span>
                           {expandedOrderId === order.id ? <ChevronUp size={20} className="text-white/50" /> : <ChevronDown size={20} className="text-white/50" />}
                        </div>
                     </div>
                     <div className="flex justify-between items-end border-t border-white/5 pt-3 mt-3">
                        <span className="text-sm text-white/60 font-medium">عدد المنتجات: <span className="text-brq-gold font-bold">{order.totalQuantity}</span></span>
                     </div>
                     
                     {/* Expanded Order Details */}
                     {expandedOrderId === order.id && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                           <h4 className="text-sm font-bold text-white mb-2">المنتجات المطلوبة:</h4>
                           {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                 <div className="flex flex-col gap-1">
                                    <span className="text-sm font-bold text-white">{item.product?.name || 'منتج غير معروف'}</span>
                                    <span className="text-xs text-white/50">كود: {item.product?.productCode || '---'} | موديل: {item.product?.modelNumber || '---'}</span>
                                 </div>
                                 <div className="text-sm font-bold text-brq-gold bg-brq-gold/10 px-3 py-1 rounded-lg">
                                    الكمية: {item.quantity}
                                 </div>
                              </div>
                           ))}
                           {order.notes && (
                              <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                 <span className="text-xs font-bold text-white/50 block mb-1">الملاحظات:</span>
                                 <span className="text-sm text-white/80 whitespace-pre-wrap">{order.notes}</span>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               ))}
            </div>
         )}
      </div>

    </div>
  );
}
