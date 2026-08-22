import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { api } from '../../api';
import { Order } from '../../types';
import { Users, CheckCircle, XCircle, Clock, Package, Eye, Download, Printer, Search, Loader2, ArrowRight, Truck, FileText, AlertCircle } from 'lucide-react';
import { Link } from 'react-router';
import OptimizedImage from '../OptimizedImage';
import { downloadImages } from '../../utils/download';
import { printOrderInvoice } from '../../utils/printOrder';
import { parseOrderDetails } from '../../utils/orderUtils';

export default function CustomerOrders() {
  const { user, showToast } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [processingOrderIds, setProcessingOrderIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const allOrders = await api.getOrders();
      
      let userOrders = allOrders;
      if (user) {
        const uName = (user.username || '').toLowerCase().trim();
        const uFull = (user.fullName || '').toLowerCase().trim();
        const uId = (user.id || user.uid || '').toString().toLowerCase().trim();

        userOrders = allOrders.filter(o => {
          const oUser = (o.userId || '').toString().toLowerCase().trim();
          const oName = (o.username || '').toLowerCase().trim();
          const oFull = (o.fullName || '').toLowerCase().trim();
          const oCust = (o.customerName || '').toLowerCase().trim();
          const oNotes = (o.notes || '').toLowerCase();

          if (uId && (oUser === uId || oNotes.includes(uId))) return true;
          if (uName && (oUser === uName || oName === uName || oFull === uName || oCust === uName || oNotes.includes(uName))) return true;
          if (uFull && (oUser === uFull || oName === uFull || oFull === uFull || oCust === uFull || oNotes.includes(uFull))) return true;
          return false;
        });
      }
      
      // Filter orders that have customer information or came from showcase (or status pending_agent)
      userOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(userOrders);
    } catch (err) {
      console.error(err);
      showToast("فشل تحميل طلبات الزبائن", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleAgentAction = async (orderId: string, action: 'approve' | 'reject') => {
    if (processingOrderIds.has(orderId)) return;
    setProcessingOrderIds(prev => new Set(prev).add(orderId));
    try {
      const newStatus = action === 'approve' ? 'new' : 'cancelled';
      await api.updateOrder(orderId, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      showToast(
        action === 'approve' 
          ? 'تمت الموافقة على الطلبية بنجاح وتم إرسالها لإدارة الموقع!' 
          : 'تم رفض الطلبية', 
        'success'
      );
    } catch (err) {
      showToast('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    } finally {
      setProcessingOrderIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
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
      showToast("جاري تنزيل الصور...", "loading");
      const success = await downloadImages(imagesToDownload);
      if (success) {
        showToast("تم حفظ جميع الصور بنجاح", "success");
      } else {
        showToast("حدث خطأ أثناء تنزيل الصور", "error");
      }
    } catch (err) {
      showToast("حدث خطأ أثناء تنزيل الصور", "error");
    } finally {
      setIsDownloading(false);
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

  const customerOnlyOrders = orders.filter(o => {
    const info = parseOrderDetails(o);
    // Show orders that either came from showcase (pending_agent) or have explicit customer info
    return o.status === 'pending_agent' || !!info.customerName || !!o.customerName;
  });

  const pendingOrders = orders.filter(o => o.status === 'pending_agent');
  const approvedOrders = customerOnlyOrders.filter(o => o.status !== 'pending_agent' && o.status !== 'cancelled');

  const displayedOrders = customerOnlyOrders.filter(o => {
    const info = parseOrderDetails(o);
    const matchesSearch = 
      !searchTerm ||
      (o.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      info.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      info.transport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'pending') {
      return o.status === 'pending_agent';
    }
    if (activeTab === 'approved') {
      return o.status !== 'pending_agent' && o.status !== 'cancelled';
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_agent':
        return { label: 'بانتظار موافقتك', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: Clock };
      case 'new':
        return { label: 'تمت الموافقة (تم الإرسال للإدارة)', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: CheckCircle };
      case 'reviewing':
        return { label: 'قيد المراجعة والتجهيز', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', icon: Clock };
      case 'completed':
        return { label: 'مكتملة وجاهزة', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: CheckCircle };
      case 'cancelled':
        return { label: 'ملغية / مرفوضة', color: 'bg-red-500/20 text-red-300 border-red-500/40', icon: XCircle };
      default:
        return { label: status, color: 'bg-white/10 text-white/70 border-white/20', icon: Package };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-white/60 text-sm font-medium">جاري تحميل طلبات الزبائن...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24" dir="rtl">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-black/60 to-purple-900/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-inner">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                طلبات الزبائن
                {pendingOrders.length > 0 && (
                  <span className="bg-purple-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.6)] animate-pulse">
                    {pendingOrders.length} جديدة
                  </span>
                )}
              </h1>
              <p className="text-white/60 text-xs mt-0.5">
                مراجعة واعتماد الطلبيات الواردة من زوار المعرض قبل إرسالها لإدارة الموقع
              </p>
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="بحث برقم الطلب أو الزبون..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-white focus:border-purple-400/60 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5 max-w-md">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock size={15} />
          <span>بانتظار الموافقة</span>
          {pendingOrders.length > 0 && (
            <span className="bg-white text-purple-900 text-[11px] font-black px-1.5 py-0.2 rounded-full">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'approved'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <CheckCircle size={15} />
          <span>تمت الموافقة والإرسال</span>
          <span className="text-white/40 text-[11px]">({approvedOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>الكل</span>
        </button>
      </div>

      {/* Orders List */}
      {displayedOrders.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl flex flex-col items-center justify-center text-center border border-white/5">
          <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 mb-4 border border-purple-500/20">
            <Users size={36} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {activeTab === 'pending' ? 'لا توجد طلبات جديدة بانتظار الموافقة' : 'لا توجد طلبات زبائن مطابقة'}
          </h2>
          <p className="text-white/50 text-sm max-w-sm mb-6">
            {activeTab === 'pending' 
              ? 'عندما يقوم أي زبون من زوار المعرض بإرسال طلبية، ستظهر هنا مباشرة لتراجعها وتوافق عليها.'
              : 'لم يتم العثور على أي طلبيات في هذا القسم حالياً.'}
          </p>
          <Link
            to="/orders"
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all border border-white/10"
          >
            الانتقال إلى سجل الطلبات العام
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map(order => {
            const info = parseOrderDetails(order);
            const statusConfig = getStatusBadge(order.status);
            const StatusIcon = statusConfig.icon;
            const isPending = order.status === 'pending_agent';
            const isProcessing = processingOrderIds.has(order.id);

            return (
              <div
                key={order.id}
                className={`glass-panel rounded-3xl border transition-all overflow-hidden p-5 space-y-4 ${
                  isPending 
                    ? 'border-purple-500/40 bg-purple-950/10 shadow-[0_0_30px_rgba(168,85,247,0.1)]' 
                    : 'border-white/5 hover:border-purple-500/30'
                }`}
              >
                {/* Header: Customer Name & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg text-white">{order.orderNumber}</span>
                      <div className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${statusConfig.color}`}>
                        <StatusIcon size={13} />
                        <span>{statusConfig.label}</span>
                      </div>
                    </div>
                    
                    {/* Customer Highlight Badge */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-white/50">الزبون:</span>
                      <span className="inline-flex items-center px-3 py-1 rounded-xl bg-amber-300 border border-amber-400 text-black font-black text-sm shadow-md">
                        {info.customerName || order.customerName || 'زائر المعرض'}
                      </span>
                    </div>

                    <span className="text-[11px] text-white/40 block pt-0.5">{formatDate(order.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => printOrderInvoice(order)}
                      className="p-2.5 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white rounded-xl border border-white/10 transition-colors text-xs flex items-center gap-1.5"
                      title="طباعة الطلبية"
                    >
                      <Printer size={16} />
                      <span className="hidden sm:inline">طباعة</span>
                    </button>
                    <button
                      onClick={() => handleDownloadAllImages(order)}
                      disabled={isDownloading}
                      className="p-2.5 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white rounded-xl border border-white/10 transition-colors text-xs flex items-center gap-1.5"
                      title="تنزيل الصور"
                    >
                      <Download size={16} />
                      <span className="hidden sm:inline">الصور</span>
                    </button>
                  </div>
                </div>

                {/* Transport & Notes if any */}
                {(info.transport || info.notes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {info.transport && (
                      <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-center gap-2">
                        <Truck size={16} className="text-blue-400 flex-shrink-0" />
                        <span className="text-white/70">النقليات:</span>
                        <strong className="text-white font-bold">{info.transport}</strong>
                      </div>
                    )}
                    {info.notes && (
                      <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-2">
                        <FileText size={16} className="text-brq-gold flex-shrink-0" />
                        <span className="text-white/70">ملاحظات:</span>
                        <span className="text-white">{info.notes}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Items Thumbnails */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex-shrink-0 flex items-center gap-2 bg-black/40 border border-white/10 p-2 rounded-2xl">
                      <div className="w-14 h-14 bg-black/60 rounded-xl overflow-hidden relative">
                        {item.product?.finalImageUrl || item.product?.imageUrl ? (
                          <OptimizedImage
                            src={item.product.finalImageUrl || item.product.imageUrl!}
                            alt={item.product.name}
                            size="thumbnail"
                            className="w-full h-full"
                            imgClassName="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-white/30">لا صورة</div>
                        )}
                      </div>
                      <div className="text-xs pr-1">
                        <p className="font-bold text-white line-clamp-1 max-w-[120px]">{item.product?.name}</p>
                        <p className="font-mono text-brq-gold text-[11px]">{item.product?.productCode}</p>
                        <p className="font-bold text-emerald-400 text-xs mt-0.5">{item.quantity} قطعة</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary & Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
                  <div className="text-xs text-white/70">
                    <span>إجمالي كمية الطلب: </span>
                    <strong className="text-emerald-400 text-sm font-bold">
                      {order.totalQuantity || order.items?.reduce((a, b) => a + (b.quantity || 0), 0) || 0} قطعة
                    </strong>
                  </div>

                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAgentAction(order.id, 'approve')}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        <span>الموافقة وإرسال للإدارة</span>
                      </button>
                      <button
                        onClick={() => handleAgentAction(order.id, 'reject')}
                        disabled={isProcessing}
                        className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-red-500/30 disabled:opacity-50"
                      >
                        <XCircle size={15} />
                        <span>رفض</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-white/50">
                      <CheckCircle size={14} className="text-emerald-400" />
                      <span>تم تحويلها لسجل الطلبات العام للمتابعة</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
