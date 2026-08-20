import { formatDateTime, formatDate } from "../../utils/time";
import {
  Search,
  Filter,
  Download,
  Eye,
  MoreVertical,
  Loader2,
  BellRing,
  UserCircle,
  Edit,
  Check,
  Trash2,
  Printer,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { Order, OrderStatus } from "../../types";
import { useStore } from "../../store";
import ImageViewer from "../ImageViewer";
import { printOrderInvoice } from "../../utils/printOrder";

const statusMap: Record<OrderStatus, { label: string; color: string }> = {
  new: {
    label: "جديد",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  reviewing: {
    label: "قيد المراجعة",
    color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  },
  contacted: {
    label: "تم التواصل",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  completed: {
    label: "مكتمل",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  cancelled: {
    label: "ملغى",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  pending_agent: {
    label: "بإنتظار موافقة الوكيل",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
};

export default function OrderManager() {
  const { user } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<"new" | "completed">("new");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewImage, setViewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  const previousOrdersCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
    ); // Notification sound
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async () => {
      try {
        const dbOrders = await api.getOrders();
        if (mounted) {
          const sortedOrders = dbOrders.sort(
            (a: any, b: any) => b.createdAt - a.createdAt,
          );
          setOrders(sortedOrders);
          setLoading(false);

          if (
            previousOrdersCount.current !== 0 &&
            sortedOrders.length > previousOrdersCount.current
          ) {
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
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    if (selectedOrder?.id === id) {
      setSelectedOrder({ ...selectedOrder, status });
    }

    try {
      await api.updateOrder(id, { status });
    } catch (e) {
      console.error("فشل تحديث حالة الطلب", e);
      // Revert on failure
      const updatedOrders = await api.getOrders();
      setOrders(
        updatedOrders.sort((a: any, b: any) => b.createdAt - a.createdAt),
      );
      if (selectedOrder?.id === id) {
        const original = updatedOrders.find((o: any) => o.id === id);
        if (original) setSelectedOrder(original);
      }
    }
  };

  const handleViewOrder = async (order: Order) => {
    let currentStatus = order.status;
    if (currentStatus !== "completed" && currentStatus !== "cancelled") {
      currentStatus = "completed";
      // Auto complete and notify
      await updateOrderStatus(order.id, "completed");
      try {
        await api.createNotification({
          userId: order.userId,
          type: "order",
          message: `تم قبول وتأكيد طلبيتك رقم ${order.orderNumber || order.id.slice(0, 8)}`,
          read: false,
        });
      } catch (e) {
        console.error("Failed to send notification", e);
      }
    }
    setSelectedOrder({ ...order, status: currentStatus as OrderStatus });
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
      setOrders(
        updatedOrders.sort((a: any, b: any) => b.createdAt - a.createdAt),
      );
    } catch (e) {
      console.error(e);
      // Revert initial UI change
      const updatedOrders = await api.getOrders();
      setOrders(
        updatedOrders.sort((a: any, b: any) => b.createdAt - a.createdAt),
      );
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const handlePrintOrder = (order: Order) => {
    printOrderInvoice(order);
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
    return o.fullName || o.username || "غير محدد";
  };

  const filteredOrders = orders.filter((o) => {
    if (o.status === 'pending_agent') return false;
    const custName = getOrderCustomerName(o);
    const matchesSearch =
      (o.orderNumber &&
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.username &&
        o.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.fullName &&
        o.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customerName &&
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      custName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.notes &&
        o.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = filterStatus === "all" || o.status === filterStatus;

    const matchesTab =
      activeTab === "new"
        ? o.status === "new"
        : o.status === "completed" ||
          o.status === "cancelled" ||
          o.status === "contacted" ||
          o.status === "reviewing";

    return matchesSearch && matchesStatus && matchesTab;
  });

  const newOrdersCount = orders.filter((o) => o.status === "new").length;

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
            {newOrdersCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                {newOrdersCount} جديد
              </span>
            )}
          </h2>
          <p className="text-sm text-white/50">متابعة ومعالجة طلبات العملاء</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/10 pb-0">
        <button
          onClick={() => setActiveTab("new")}
          className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === "new" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}`}
        >
          الطلبات الجديدة
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === "completed" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}`}
        >
          الطلبات المكتملة
        </button>
      </div>

      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden p-1">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:border-brq-gold/50 text-white"
              placeholder="بحث برقم الطلب، اسم المستخدم، الاسم..."
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
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
                  <th className="p-4 font-medium">اسم الزبون / الوكيل</th>
                  <th className="p-4 font-medium">الملاحظات</th>
                  <th className="p-4 font-medium">عدد المنتجات</th>
                  <th className="p-4 font-medium">التاريخ والوقت</th>
                  <th className="p-4 font-medium">الحالة</th>
                  <th className="p-4 font-medium rounded-tl-lg">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/90">
                {filteredOrders.map((o) => {
                  const customerName = getOrderCustomerName(o);
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-brq-gold">
                        <div className="flex items-center gap-2">
                          {o.status === "new" && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          )}
                          {o.orderNumber || o.id.slice(0, 8).toUpperCase()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-[11px] text-white/50 font-bold">
                            اسم الزبون:
                          </span>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-300 border border-amber-400 text-black shadow-md">
                            <UserCircle size={17} className="text-black flex-shrink-0" />
                            <span className="text-base font-black text-black tracking-wide leading-tight">
                              {customerName}
                            </span>
                          </div>
                          {o.username && (
                            <div className="text-xs text-white/60 flex items-center gap-1 mt-0.5">
                              <span className="text-white/40">حساب الوكيل:</span>
                              <span className="font-semibold text-white/90">{o.username}</span>
                              {o.fullName && o.fullName !== customerName && o.fullName !== o.username && (
                                <span className="text-white/50">({o.fullName})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {o.notes ? (
                          <div className="p-2 rounded-lg bg-white/90 border border-gray-300 text-black shadow-sm text-xs font-bold whitespace-pre-wrap max-w-[200px] break-words">
                            {o.notes}
                          </div>
                        ) : (
                          <span className="text-white/30 text-xs">لا يوجد</span>
                        )}
                      </td>
                      <td className="p-4 font-mono">
                        {o.totalQuantity ||
                          o.items?.reduce((acc, i) => acc + i.quantity, 0)}{" "}
                        قطعة/علبة
                      </td>
                      <td className="p-4 text-white/60 text-xs" dir="ltr">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="group relative w-fit">
                          <select
                            value={o.status}
                            onChange={(e) =>
                              updateOrderStatus(
                                o.id,
                                e.target.value as OrderStatus,
                              )
                            }
                            className={`px-3 py-1 rounded-lg border text-xs font-bold appearance-none bg-transparent outline-none cursor-pointer pr-4 pl-6 ${statusMap[o.status || "new"]?.color}`}
                          >
                            <option
                              value="new"
                              className="bg-brq-black text-white"
                            >
                              جديد
                            </option>
                            <option
                              value="reviewing"
                              className="bg-brq-black text-white"
                            >
                              قيد المراجعة
                            </option>
                            <option
                              value="contacted"
                              className="bg-brq-black text-white"
                            >
                              تم التواصل
                            </option>
                            <option
                              value="completed"
                              className="bg-brq-black text-white"
                            >
                              مكتمل
                            </option>
                            <option
                              value="cancelled"
                              className="bg-brq-black text-white"
                            >
                              ملغى
                            </option>
                          </select>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePrintOrder(o)}
                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                            title="طباعة الطلب"
                          >
                            <Printer size={14} /> طباعة
                          </button>
                          <button
                            onClick={() => handleViewOrder(o)}
                            className="p-2 bg-brq-gold/10 hover:bg-brq-gold/20 text-brq-gold rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                          >
                            <Eye size={14} /> عرض
                          </button>
                          <button
                            onClick={() => handleDelete(o.id, o.orderNumber)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                            title="حذف الطلب"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="glass-panel w-full max-w-5xl rounded-2xl flex flex-col max-h-[92vh] border border-white/10 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    طلب رقم:{" "}
                    <span className="text-brq-gold font-mono">
                      {selectedOrder.orderNumber}
                    </span>
                  </h2>
                  <p className="text-xs text-white/50" dir="ltr">
                    {formatDateTime(selectedOrder.createdAt)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full border text-xs font-bold ${statusMap[selectedOrder.status || "new"]?.color}`}
                >
                  {statusMap[selectedOrder.status || "new"]?.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintOrder(selectedOrder)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                  title="طباعة الطلب"
                >
                  <Printer size={16} /> طباعة
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                  title="إغلاق"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Split into 2 Columns with Divider Line */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-white/10">
              {/* Column 1: Order & Customer Details (5 Cols) */}
              <div className="md:col-span-5 p-5 space-y-4 overflow-y-auto max-h-[40vh] md:max-h-[calc(92vh-100px)] bg-black/20">
                {/* Customer Info */}
                <div className="space-y-3">
                  {/* Prominent Customer Name Block */}
                  <div className="p-4 bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 rounded-2xl border-2 border-amber-500/50 shadow-lg text-black space-y-1">
                    <div className="text-xs font-bold text-black/70">اسم الزبون:</div>
                    <div className="flex items-center gap-2">
                      <UserCircle size={26} className="text-black flex-shrink-0" />
                      <span className="text-xl sm:text-2xl font-black text-black tracking-tight">
                        {getOrderCustomerName(selectedOrder)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
                    <div className="text-xs text-white/50 mb-1">حساب الوكيل المرسل</div>
                    <div className="font-bold flex items-center gap-2 text-white">
                      <UserCircle size={18} className="text-brq-gold" />{" "}
                      {selectedOrder.username}
                      {selectedOrder.fullName && selectedOrder.fullName !== selectedOrder.username && selectedOrder.fullName !== getOrderCustomerName(selectedOrder) && (
                        <span className="text-xs text-white/60 font-normal">({selectedOrder.fullName})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Total Pieces Summary Box */}
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">
                    إجمالي عدد القطع المطلوبة:
                  </span>
                  <span className="text-lg font-black text-brq-gold font-mono">
                    {selectedOrder.totalQuantity} قطعة
                  </span>
                </div>

                {/* Customer Notes */}
                {selectedOrder.notes && (
                  <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl space-y-1">
                    <h4 className="text-xs font-bold text-yellow-400">
                      ملاحظات العميل والتفاصيل:
                    </h4>
                    <p className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}

                {/* Status quick changer */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-xs text-white/60 font-bold block">
                    تغيير حالة الطلب السريعة:
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        updateOrderStatus(selectedOrder.id, "cancelled")
                      }
                      className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 text-xs font-bold transition-colors border border-red-500/30"
                    >
                      ملغى
                    </button>
                    <button
                      onClick={() =>
                        updateOrderStatus(selectedOrder.id, "completed")
                      }
                      className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 text-xs font-bold transition-colors border border-emerald-500/30"
                    >
                      مكتمل
                    </button>
                  </div>
                </div>
              </div>

              {/* Column 2: Products List (7 Cols) - Scrollable */}
              <div className="md:col-span-7 p-5 flex flex-col h-full overflow-hidden bg-black/40">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                  <h3 className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
                    <span>المنتجات المطلوبة</span>
                    <span className="text-xs font-normal text-white/50">
                      ({selectedOrder.items?.length || 0} منتج)
                    </span>
                  </h3>
                  <span className="text-xs text-white/50 font-mono">
                    اسحب للاستعراض 📜
                  </span>
                </div>

                {/* Scrollable list of product items in 2 columns */}
                <div className="flex-1 overflow-y-auto pr-1 max-h-[50vh] md:max-h-[calc(92vh-160px)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedOrder.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-right flex flex-col justify-between gap-2 hover:border-amber-500/30 transition-colors"
                      >
                        {/* Product Name */}
                        <h4 className="text-xs sm:text-sm font-bold text-white/90 leading-snug">
                          {item.product?.name || "منتج محذوف"}
                        </h4>

                        {/* Code Box + Quantity Box */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {/* Code box */}
                          <div className="bg-amber-400 border border-amber-500/50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 shadow-sm">
                            <span className="text-[11px] font-extrabold text-black/80">
                              الكود:
                            </span>
                            <span className="font-mono font-black text-xs sm:text-sm text-black tracking-wider select-all">
                              {item.product?.productCode || "---"}
                            </span>
                            {item.product?.modelNumber && (
                              <span className="text-[10px] text-black/70 font-bold">
                                ({item.product.modelNumber})
                              </span>
                            )}
                          </div>

                          {/* Quantity box */}
                          <div className="bg-amber-400 border border-amber-500/50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 shadow-sm">
                            <span className="text-[11px] font-extrabold text-black/80">
                              الكمية:
                            </span>
                            <span className="font-mono font-black text-xs sm:text-sm text-black">
                              {item.quantity}
                            </span>
                            <span className="text-[10px] font-bold text-black/80">
                              قطع
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Lightbox */}
      {viewImage && (
        <ImageViewer
          src={viewImage.src}
          alt={viewImage.alt}
          onClose={() => setViewImage(null)}
        />
      )}
    </div>
  );
}
