import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { api } from '../../api';
import { Order } from '../../types';
import { Package, Clock, CheckCircle, Search, XCircle, MoreHorizontal, Download, X, Eye, FileText, User, Truck, Hash, Calendar, Loader2, Printer } from 'lucide-react';
import { Link } from 'react-router';
import OptimizedImage from '../OptimizedImage';
import { downloadImages } from '../../utils/download';
import { printOrderInvoice } from '../../utils/printOrder';

export default function MemberOrders() {
  const { user, showToast } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selected order for detailed modal view
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number; total: number } | null>(null);

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
      case 'pending_agent': return { label: 'بإنتظار موافقتك (من المعرض)', color: 'bg-purple-500 text-white border-purple-400', icon: Clock };
      default: return { label: status, color: 'bg-gray-500 text-white border-gray-400', icon: Package };
    }
  };

  const getOrderCustomerName = (o: Order): string => {
    if (o.customerName && o.customerName.trim()) {
      return o.customerName.trim();
    }
    if (o.notes) {
      const match = o.notes.match(/اسم الزبون:\s*([^\n\r]+)/);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }
    if (o.fullName && o.fullName.trim() && o.fullName !== o.username) {
      return o.fullName.trim();
    }
    return o.fullName || o.username || "";
  };

  const filteredOrders = orders.filter(o => {
    const custName = getOrderCustomerName(o);
    return (
      !searchTerm || 
      (o.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleAgentAction = async (orderId: string, action: 'approve' | 'reject') => {
    try {
      const newStatus = action === 'approve' ? 'new' : 'cancelled';
      await api.updateOrder(orderId, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      showToast(action === 'approve' ? 'تم الموافقة على الطلبية وإرسالها للإدارة' : 'تم رفض الطلبية');
    } catch (err) {
      showToast('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    }
  };

  const handleDownloadAllImages = async (order: Order) => {
    if (!order.items || order.items.length === 0) {
      showToast("لا توجد منتجات في هذه الطلبية", "error");
      return;
    }

    const imagesToDownload: { url: string; filename: string }[] = [];
    
    order.items.forEach((item, idx) => {
      const url = item.product?.finalImageUrl || item.product?.imageUrl;
      if (url) {
        const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
        const safeCode = (item.product?.productCode || item.product?.name || `item-${idx + 1}`)
          .replace(/[\\/\\?<>\\:\\*\\|":]/g, '-');
        const filename = `order-${order.orderNumber || 'order'}-${safeCode}.${ext}`;
        imagesToDownload.push({ url, filename });
      }
    });

    if (imagesToDownload.length === 0) {
      showToast("لا توجد صور متوفرة للتنزيل في هذه الطلبية", "error");
      return;
    }

    try {
      setIsDownloading(true);
      showToast("جاري تجهيز وتنزيل الصور للطلب...", "loading");
      
      const success = await downloadImages(imagesToDownload, (progress, total) => {
        setDownloadProgress({ progress, total });
      });

      if (success) {
        showToast("تم حفظ جميع الصور بنجاح", "success");
      } else {
        showToast("حدث خطأ أثناء تنزيل الصور", "error");
      }
    } catch (err) {
      console.error("Error downloading order images:", err);
      showToast("حدث خطأ أثناء تنزيل الصور", "error");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '---';
    return new Date(timestamp).toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-white/5">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Package className="text-brq-gold" /> سجل الطلبات
          </h1>
          <p className="text-white/60 text-sm">متابعة وعرض كافة طلباتك السابقة وتفاصيلها</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="بحث برقم الطلب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-brq-gold/50 outline-none transition-all text-sm"
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
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-brq-gold/50 cursor-pointer transition-all flex flex-col gap-4 group"
              >
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div className="space-y-1">
                    <span className="text-xs text-white/50 block">رقم الطلب</span>
                    <span className="font-mono font-bold text-lg text-white group-hover:text-brq-gold transition-colors">{order.orderNumber}</span>
                    {getOrderCustomerName(order) && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-white/50 font-medium">الزبون:</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-300 border border-amber-400 text-black font-black text-xs shadow-sm">
                          {getOrderCustomerName(order)}
                        </span>
                      </div>
                    )}
                    <span className="text-[11px] text-white/40 block mt-1">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold ${statusConfig.color}`}>
                      <StatusIcon size={14} />
                      {statusConfig.label}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="overflow-x-auto pb-2 flex-1">
                    <div className="flex gap-3 min-w-max">
                      {(order.items || []).slice(0, 6).map((item, idx) => (
                        <div key={idx} className="w-16 h-16 bg-black/40 rounded-xl border border-white/10 overflow-hidden relative group/img">
                           {item?.product?.finalImageUrl || item?.product?.imageUrl ? (
                             <OptimizedImage src={item.product.finalImageUrl || item.product.imageUrl!} alt={item.product.name} size="thumbnail" className="w-full h-full" imgClassName="object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-xl">👟</div>
                           )}
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-brq-gold">
                             {item?.quantity || 1} قطعة
                           </div>
                        </div>
                      ))}
                      {(order.items || []).length > 6 && (
                        <div className="w-16 h-16 bg-black/40 rounded-xl border border-white/10 flex items-center justify-center font-bold text-white/50 text-sm">
                          +{(order.items || []).length - 6}
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                    }}
                    className="mr-4 px-4 py-2.5 bg-brq-gold/10 text-brq-gold border border-brq-gold/30 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-brq-gold hover:text-black transition-all shrink-0"
                  >
                    <Eye size={16} /> عرض التفاصيل
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-brq-gold/30 p-6 space-y-6 text-white max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <span className="text-xs text-brq-gold font-bold">تفاصيل الطلبية</span>
                <h2 className="text-2xl font-bold font-mono">{selectedOrder.orderNumber}</h2>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Actions & Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
              <div>
                <span className="text-xs text-white/50 block">حالة الطلب</span>
                <span className="font-bold text-sm text-brq-gold">
                  {getStatusDisplay(selectedOrder.status).label}
                </span>
              </div>
              <div>
                <span className="text-xs text-white/50 block">تاريخ الطلب</span>
                <span className="font-mono text-xs text-white/80">{formatDate(selectedOrder.createdAt)}</span>
              </div>
              <div>
                <span className="text-xs text-white/50 block">إجمالي القطع</span>
                <span className="font-bold text-lg text-emerald-400">{selectedOrder.totalQuantity || 0} قطعة</span>
              </div>
            </div>

            {selectedOrder.status === 'pending_agent' && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-bold text-purple-300 flex items-center gap-2">
                  <CheckCircle size={16} /> هذه الطلبية تم إنشاؤها من المعرض الخارجي وتنتظر موافقتك.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAgentAction(selectedOrder.id, 'approve')}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                  >
                    <CheckCircle size={16} /> الموافقة وإرسال للإدارة
                  </button>
                  <button
                    onClick={() => handleAgentAction(selectedOrder.id, 'reject')}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                  >
                    <XCircle size={16} /> رفض
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons: Save Images + Print Sheet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => handleDownloadAllImages(selectedOrder)}
                disabled={isDownloading}
                className="py-3 px-4 bg-gradient-to-r from-brq-gold to-yellow-400 text-black font-bold rounded-xl shadow-lg hover:shadow-brq-gold/20 flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>جاري الحفظ ({downloadProgress?.progress || 0} / {downloadProgress?.total || 0})...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>حفظ صور الطلبية</span>
                  </>
                )}
              </button>

              <button
                onClick={() => printOrderInvoice(selectedOrder)}
                className="py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 flex items-center justify-center gap-2 transition-all text-sm shadow-md"
                title="طباعة الطلبية (25 منتج في الورقة الواحدة)"
              >
                <Printer size={18} className="text-brq-gold" />
                <span>طباعة الطلبية (25 مادة بالورقة)</span>
              </button>
            </div>

            {/* Prominent Customer Name Banner */}
            {getOrderCustomerName(selectedOrder) && (
              <div className="p-4 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 rounded-2xl border-2 border-amber-500/50 shadow-lg text-black space-y-1">
                <div className="text-xs font-bold text-black/70">اسم الزبون:</div>
                <div className="flex items-center gap-2">
                  <User size={24} className="text-black flex-shrink-0" />
                  <span className="text-xl sm:text-2xl font-black text-black tracking-tight">
                    {getOrderCustomerName(selectedOrder)}
                  </span>
                </div>
              </div>
            )}

            {/* Customer & Transport Details */}
            {selectedOrder.notes && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                <h3 className="text-xs font-bold text-brq-gold flex items-center gap-1.5">
                  <FileText size={16} /> معلومات الطلب والزبون والنقليات
                </h3>
                <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed font-sans">
                  {selectedOrder.notes}
                </p>
              </div>
            )}

            {/* Products List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white/80 flex items-center justify-between">
                <span>المنتجات المطلوبة ({selectedOrder.items?.length || 0})</span>
              </h3>
              <div className="divide-y divide-white/10 max-h-72 overflow-y-auto pr-1">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="py-3 text-right space-y-2">
                    {/* Product Name on top */}
                    <h4 className="font-bold text-sm text-white">{item.product?.name || 'منتج'}</h4>
                    
                    {/* Code Box + Quantity Box side-by-side */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="bg-white/10 border border-brq-gold/30 px-3 py-1 rounded-lg inline-flex items-center gap-1.5 text-xs">
                        <span className="text-white/60">الكود:</span>
                        <strong className="text-brq-gold font-mono font-bold">{item.product?.productCode || '---'}</strong>
                        {item.product?.modelNumber && <span className="text-white/50 text-[11px]">({item.product.modelNumber})</span>}
                      </div>

                      <div className="bg-brq-gold/10 border border-brq-gold/30 px-3 py-1 rounded-lg inline-flex items-center gap-1.5 text-xs">
                        <span className="text-white/60">الكمية:</span>
                        <strong className="text-brq-gold font-mono font-bold">{item.quantity} قطعة</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors text-sm"
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
