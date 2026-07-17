import { formatDateTime, formatDate } from '../../utils/time';
import { Search, Filter, Download, Eye, MoreVertical, Loader2, BellRing, UserCircle, Edit, Check, Trash2, Printer } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { Order, OrderStatus } from '../../types';
import { useStore } from '../../store';

const statusMap: Record<OrderStatus, { label: string, color: string }> = {
  new: { label: 'جديد', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  reviewing: { label: 'قيد المراجعة', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
  contacted: { label: 'تم التواصل', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  completed: { label: 'مكتمل', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'ملغى', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function OrderManager() {
  const { user } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'incoming' | 'archived'>('incoming');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const previousOrdersCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Notification sound
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async () => {
      try {
        const dbOrders = await api.getOrders();
        if (mounted) {
          const sortedOrders = dbOrders.sort((a: any, b: any) => b.createdAt - a.createdAt);
          setOrders(sortedOrders);
          setLoading(false);
          
          if (previousOrdersCount.current !== 0 && sortedOrders.length > previousOrdersCount.current) {
             // New order arrived!
             audioRef.current?.play().catch(() => {}); // catch error if browser blocks autoplay
          }
           previousOrdersCount.current = sortedOrders.length;
        }
      } catch (e) {
        console.error(e);
        if (mounted) setLoading(false);
      }
    };
    fetchOrders();
    // In a real app we would use onSnapshot for immediate updates, 
    // but here we poll frequently like the prompt suggested immediate notifications.
    const inv = setInterval(fetchOrders, 3000); 
    return () => {
      mounted = false;
      clearInterval(inv);
    };
  }, []);

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    // Optimistic update
    setOrders((prev) => 
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
    if (selectedOrder?.id === id) {
       setSelectedOrder({ ...selectedOrder, status });
    }
       
    try {
      await api.updateOrder(id, { status });
    } catch(e) {
       console.error("فشل تحديث حالة الطلب", e);
       // Revert on failure
       const updatedOrders = await api.getOrders();
       setOrders(updatedOrders.sort((a: any, b: any) => b.createdAt - a.createdAt));
       if (selectedOrder?.id === id) {
          const original = updatedOrders.find((o: any) => o.id === id);
          if (original) setSelectedOrder(original);
       }
    }
  };

  const handleViewOrder = async (order: Order) => {
     setSelectedOrder(order);
     if (order.status === 'new') {
        // Auto complete and notify
        await updateOrderStatus(order.id, 'completed');
        try {
           await api.createNotification({
              userId: order.userId,
              type: 'order',
              message: `تم قبول وتأكيد طلبيتك رقم ${order.orderNumber || order.id.slice(0, 8)}`,
              read: false,
           });
        } catch (e) {
           console.error("Failed to send notification", e);
        }
     }
  };

  const handleDelete = async (id: string, orderNumber: string) => {
    // Optimistic update
    setOrders((prev) => prev.filter((o) => o.id !== id));
    if (selectedOrder?.id === id) {
        setSelectedOrder(null);
    }
    
    try {
      await api.deleteOrder(id, user?.username);
      const updatedOrders = await api.getOrders();
      setOrders(updatedOrders.sort((a: any, b: any) => b.createdAt - a.createdAt));
    } catch (e) {
      console.error(e);
      // Revert initial UI change
      const updatedOrders = await api.getOrders();
      setOrders(updatedOrders.sort((a: any, b: any) => b.createdAt - a.createdAt));
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const handlePrintOrder = (order: Order) => {
    const date = formatDateTime(order.createdAt);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة (Pop-ups) لطباعة الطلبية.");
      return;
    }

    const itemsHtml = order.items?.map((item, index) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          <div style="font-weight: bold; font-size: 18px;">${item.product?.name || 'منتج محذوف'}</div>
          <div style="color: #666; font-size: 14px; margin-top: 4px;">
            ${item.product?.modelNumber ? `الموديل/الرمز: ${item.product.modelNumber}` : ''}
          </div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 24px; font-family: monospace; letter-spacing: 2px;">
          ${item.product?.productCode || '---'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 20px;">${item.quantity}</td>
      </tr>
    `).join('') || '';

    const html = `
      <html dir="rtl" lang="ar">
        <head>
          <title>طباعة طلب رقم ${order.orderNumber || order.id.slice(0, 8)}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #000; direction: rtl; }
            .header { border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 28px; font-weight: bold; }
            .info-box { border: 2px solid #333; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .info-row { display: flex; margin-bottom: 10px; font-size: 16px; }
            .info-label { width: 160px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f0f0f0; padding: 12px; text-align: right; border-bottom: 2px solid #000; font-size: 16px; }
            td { text-align: right; border-bottom: 1px solid #ccc; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; color: #555; font-size: 14px; }
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">تفاصيل الطلبية</div>
            <div style="text-align: left; font-size: 16px;">
              <strong>رقم الطلب:</strong> <span style="font-family: monospace;">${order.orderNumber || order.id.slice(0, 8)}</span><br/>
              <strong>التاريخ:</strong> <span dir="ltr">${date}</span>
            </div>
          </div>
          
          <div class="info-box">
            <div class="info-row">
              <div class="info-label">اسم الوكيل:</div>
              <div>${order.username}</div>
            </div>
            <div class="info-row">
              <div class="info-label">اسم الزبون/المرسل:</div>
              <div>${order.fullName || '---'}</div>
            </div>
            ${order.notes ? `
            <div class="info-row" style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px;">
              <div class="info-label">الملاحظات:</div>
              <div style="font-weight: bold;">${order.notes}</div>
            </div>
            ` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>المنتج والتفاصيل</th>
                <th style="text-align: center; width: 180px;">الكود</th>
                <th style="text-align: center; width: 100px;">الكمية</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 15px; text-align: left; font-weight: bold; font-size: 18px;">إجمالي الكمية (قطع):</td>
                <td style="padding: 15px; text-align: center; font-weight: bold; font-size: 22px;">${order.totalQuantity}</td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            وثيقة طلبية مطبوعة من نظام الإدارة
          </div>
          
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
       (o.orderNumber && o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
       (o.username && o.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
       (o.fullName && o.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    
    const isArchived = o.status === 'completed' || o.status === 'cancelled';
    const matchesTab = activeTab === 'archived' ? isArchived : !isArchived;

    return matchesSearch && matchesStatus && matchesTab;
  });

  const newOrdersCount = orders.filter(o => o.status === 'new').length;

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-brq-gold w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
             <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
               إدارة الطلبات
               {newOrdersCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">{newOrdersCount} جديد</span>}
             </h2>
             <p className="text-sm text-white/50">متابعة ومعالجة طلبات العملاء</p>
         </div>
      </div>

      <div className="flex gap-4 border-b border-white/10 pb-0">
         <button
            onClick={() => setActiveTab('incoming')}
            className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'incoming' ? 'border-brq-gold text-brq-gold' : 'border-transparent text-white/50 hover:text-white'}`}
         >
            الطلبات الحالية
         </button>
         <button
            onClick={() => setActiveTab('archived')}
            className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'archived' ? 'border-brq-gold text-brq-gold' : 'border-transparent text-white/50 hover:text-white'}`}
         >
            الطلبيات المؤرشفة
         </button>
      </div>

      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden p-1">
         <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-3">
             <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                <input 
                   type="text" 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   className="w-full bg-black/40 border border-white/10 rounded-lg pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:border-brq-gold/50 text-white"
                   placeholder="بحث برقم الطلب، اسم المستخدم، الاسم..."
                />
             </div>
             <select 
               value={filterStatus}
               onChange={e => setFilterStatus(e.target.value as any)}
               className="bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none text-white focus:border-brq-gold/50"
             >
                <option value="all">جميع الحالات</option>
                <option value="new">جديد</option>
                <option value="reviewing">قيد المراجعة</option>
                <option value="contacted">تم التواصل</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغى</option>
             </select>
         </div>
         
         {filteredOrders.length === 0 ? (
           <div className="flex flex-col justify-center items-center h-64 text-center space-y-4">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/30">
               <Search size={32} />
             </div>
             <p className="text-white/50">لا توجد طلبات تطابق بحثك.</p>
           </div>
         ) : (
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                 <thead className="bg-black/40 text-white/60">
                    <tr>
                       <th className="p-4 font-medium rounded-tr-lg">رقم الطلب</th>
                       <th className="p-4 font-medium">اسم المستخدم</th>
                       <th className="p-4 font-medium">عدد المنتجات</th>
                       <th className="p-4 font-medium">التاريخ والوقت</th>
                       <th className="p-4 font-medium">الحالة</th>
                       <th className="p-4 font-medium rounded-tl-lg">التفاصيل</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 text-white/90">
                    {filteredOrders.map((o) => {
                       return (
                       <tr key={o.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-mono font-bold text-brq-gold">
                            <div className="flex items-center gap-2">
                               {o.status === 'new' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                               {o.orderNumber || o.id.slice(0, 8).toUpperCase()}
                            </div>
                          </td>
                          <td className="p-4">
                             <div>
                                <div className="font-bold text-white">{o.username}</div>
                                <div className="text-xs text-white/50">{o.fullName}</div>
                             </div>
                          </td>
                          <td className="p-4 font-mono">{o.totalQuantity || o.items?.reduce((acc, i) => acc+i.quantity,0)} قطعة/علبة</td>
                          <td className="p-4 text-white/60 text-xs" dir="ltr">{formatDateTime(o.createdAt)}</td>
                          <td className="p-4">
                             <div className="group relative w-fit">
                               <select 
                                 value={o.status}
                                 onChange={e => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                                 className={`px-3 py-1 rounded-lg border text-xs font-bold appearance-none bg-transparent outline-none cursor-pointer pr-4 pl-6 ${statusMap[o.status || 'new']?.color}`}
                               >
                                 <option value="new" className="bg-brq-black text-white">جديد</option>
                                 <option value="reviewing" className="bg-brq-black text-white">قيد المراجعة</option>
                                 <option value="contacted" className="bg-brq-black text-white">تم التواصل</option>
                                 <option value="completed" className="bg-brq-black text-white">مكتمل</option>
                                 <option value="cancelled" className="bg-brq-black text-white">ملغى</option>
                               </select>
                             </div>
                          </td>
                          <td className="p-4">
                             <div className="flex gap-2">
                               <button onClick={() => handlePrintOrder(o)} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold" title="طباعة الطلب">
                                 <Printer size={14} /> طباعة
                               </button>
                               <button onClick={() => handleViewOrder(o)} className="p-2 bg-brq-gold/10 hover:bg-brq-gold/20 text-brq-gold rounded-lg transition-colors flex items-center gap-2 text-xs font-bold">
                                 <Eye size={14} /> عرض
                               </button>
                               <button onClick={() => handleDelete(o.id, o.orderNumber)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold" title="حذف الطلب">
                                 <Trash2 size={14} />
                               </button>
                             </div>
                          </td>
                       </tr>
                    )})}
                 </tbody>
              </table>
           </div>
         )}
      </div>

      {selectedOrder && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-3xl rounded-2xl flex flex-col max-h-[90vh] border border-white/10 shadow-2xl overflow-hidden">
               {/* Modal Header */}
               <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/40">
                  <div className="flex items-center gap-4">
                     <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                           طلب رقم: <span className="text-brq-gold font-mono">{selectedOrder.orderNumber}</span>
                        </h2>
                        <p className="text-sm text-white/50" dir="ltr">{formatDateTime(selectedOrder.createdAt)}</p>
                     </div>
                     <span className={`px-3 py-1 rounded-full border text-xs font-bold ml-4 ${statusMap[selectedOrder.status || 'new']?.color}`}>
                        {statusMap[selectedOrder.status || 'new']?.label}
                     </span>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => handlePrintOrder(selectedOrder)} className="text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" title="طباعة الطلب">
                        <Printer size={20} />
                     </button>
                     <button onClick={() => setSelectedOrder(null)} className="text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" title="إغلاق">
                        ✕
                     </button>
                  </div>
               </div>

               {/* Modal Body */}
               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Customer Info */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="text-xs text-white/50 mb-1">اسم المستخدم</div>
                        <div className="font-bold flex items-center gap-2"><UserCircle size={16} className="text-brq-gold"/> {selectedOrder.username}</div>
                     </div>
                     <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="text-xs text-white/50 mb-1">المرسل (الاسم الكامل)</div>
                        <div className="font-bold">{selectedOrder.fullName || selectedOrder.username}</div>
                     </div>
                  </div>

                  {selectedOrder.notes && (
                     <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <h4 className="text-sm font-bold text-yellow-500 mb-2">ملاحظات العميل:</h4>
                        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{selectedOrder.notes}</p>
                     </div>
                  )}

                  {/* Order Items */}
                  <div>
                     <h3 className="font-bold text-white mb-4 border-b border-white/10 pb-2">المنتجات المطلوبة ({selectedOrder.totalQuantity} قطعة)</h3>
                     <div className="space-y-3">
                        {selectedOrder.items?.map((item, idx) => (
                           <div key={idx} className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                              {item.product?.finalImageUrl || item.product?.imageUrl ? (
                                 <img src={item.product.finalImageUrl || item.product.imageUrl} alt={item.product.name} className="w-16 h-16 rounded-lg object-contain bg-black/40 border border-white/10" />
                              ) : <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-2xl">👟</div>}
                              
                              <div className="flex-1">
                                 <h4 className="font-bold text-sm text-white">{item.product?.name || 'منتج محذوف'}</h4>
                                 <div className="text-xs text-white/50 font-mono mt-1">كود: {item.product?.productCode} | رمز: {item.product?.modelNumber}</div>
                              </div>
                              
                              <div className="px-4 py-2 bg-brq-navy rounded-lg border border-white/10 text-center min-w-[80px]">
                                 <div className="text-xs text-white/50 mb-1">الكمية</div>
                                 <div className="font-bold text-brq-gold text-lg">{item.quantity}</div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Modal Footer Controls */}
               <div className="p-6 border-t border-white/10 bg-black/40 flex justify-between items-center gap-4">
                  <span className="text-sm text-white/50">تغيير حالة الطلب السريعة:</span>
                  <div className="flex gap-2">
                     <button onClick={() => updateOrderStatus(selectedOrder.id, 'reviewing')} className="px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-lg hover:bg-yellow-500/30 text-sm font-bold transition-colors">قيد المراجعة</button>
                     <button onClick={() => updateOrderStatus(selectedOrder.id, 'contacted')} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm font-bold transition-colors">تم التواصل</button>
                     <button onClick={() => updateOrderStatus(selectedOrder.id, 'completed')} className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 text-sm font-bold transition-colors">مكتمل</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
