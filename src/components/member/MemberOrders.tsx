import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { api } from '../../api';
import { Order } from '../../types';
import { Package, Clock, CheckCircle, Search, XCircle, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import OptimizedImage from '../OptimizedImage';

export default function MemberOrders() {
  const { user, showToast } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const allOrders = await api.getOrders();
        
        let userOrders = allOrders;
        if (user) {
          const uName = (user.username || '').toLowerCase().trim();
          const uFull = (user.fullName || '').toLowerCase().trim();
          const uId = (user.id || user.uid || '').toString();

          userOrders = allOrders.filter(o => {
             const oUser = (o.userId || '').toString().toLowerCase().trim();
             const oName = (o.username || '').toLowerCase().trim();
             const oFull = (o.fullName || o.customerName || '').toLowerCase().trim();

             if (uId && oUser === uId) return true;
             if (uName && (oUser === uName || oName === uName || oFull === uName)) return true;
             if (uFull && (oUser === uFull || oName === uFull || oFull === uFull)) return true;
             return false;
          });
        }
        
        // Sort by newest first
        userOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOrders(userOrders);
      } catch (err) {
        console.error(err);
        showToast("فشل تحميل الطلبات", "error");
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [user]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'new': return { label: 'جديد', color: 'bg-blue-500 text-white border-blue-400', icon: Clock };
      case 'reviewing': return { label: 'قيد المراجعة', color: 'bg-yellow-500 text-black border-yellow-400', icon: MoreHorizontal };
      case 'contacted': return { label: 'تم التواصل', color: 'bg-orange-500 text-white border-orange-400', icon: Clock };
      case 'completed': return { label: 'مكتمل', color: 'bg-green-500 text-white border-green-400', icon: CheckCircle };
      case 'cancelled': return { label: 'ملغي', color: 'bg-red-500 text-white border-red-400', icon: XCircle };
      default: return { label: status, color: 'bg-gray-500 text-white border-gray-400', icon: Package };
    }
  };

  const filteredOrders = orders.filter(o => 
    !searchTerm || (o.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-white/5">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Package className="text-brq-gold" /> سجل الطلبات
          </h1>
          <p className="text-white/60 text-sm">متابعة حالة طلباتك السابقة</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="بحث برقم الطلب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-brq-gold/50 outline-none transition-all"
            dir="rtl"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center border border-white/5">
          <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center text-brq-gold/50 mb-4 border border-white/10">
            <Package size={40} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">لا توجد طلبات</h2>
          <p className="text-white/50 mb-6">لم تقم بإجراء أي طلبات حتى الآن، أو لا توجد نتائج للبحث.</p>
          <Link to="/" className="px-6 py-2 bg-brq-gold text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors">
            تصفح المنتجات
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const statusConfig = getStatusDisplay(order.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={order.id} className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <span className="text-xs text-white/50 mb-1 block">رقم الطلب</span>
                    <span className="font-mono font-bold text-lg text-white">{order.orderNumber}</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold ${statusConfig.color}`}>
                    <StatusIcon size={14} />
                    {statusConfig.label}
                  </div>
                </div>
                                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-3 min-w-max">
                    {(order.items || []).slice(0, 5).map((item, idx) => (
                      <div key={idx} className="w-16 h-16 bg-black/40 rounded-xl border border-white/10 overflow-hidden relative group">
                         {item?.product?.finalImageUrl || item?.product?.imageUrl ? (
                           <OptimizedImage src={item.product.finalImageUrl || item.product.imageUrl!} alt={item.product.name} size="thumbnail" className="w-full h-full" imgClassName="object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-xl">👟</div>
                         )}
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-brq-gold">
                           {item?.quantity || 1}
                         </div>
                      </div>
                    ))}
                    {(order.items || []).length > 5 && (
                      <div className="w-16 h-16 bg-black/40 rounded-xl border border-white/10 flex items-center justify-center font-bold text-white/50 text-sm">
                        +{(order.items || []).length - 5}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
