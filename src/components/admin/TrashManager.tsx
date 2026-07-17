import { useState, useEffect } from "react";
import {
  Trash2,
  AlertTriangle,
  RefreshCcw,
  Loader2,
  Info,
  CheckSquare,
} from "lucide-react";
import { api } from "../../api";

type CollectionType =
  | "products"
  | "categories"
  | "users"
  | "orders"
  | "updates";

export default function TrashManager() {
  const [activeTab, setActiveTab] = useState<CollectionType>("products");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const data = await api.getDeletedItems(activeTab);
      setItems(
        data.sort((a: any, b: any) => (b.deletedAt || 0) - (a.deletedAt || 0)),
      );
      setSelectedItems(new Set());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, [activeTab]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItems(newSet);
  };

  const selectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((i) => i.id)));
    }
  };

  const handleRestore = async (id?: string) => {
    const itemsToRestore = id ? [id] : Array.from(selectedItems);
    if (itemsToRestore.length === 0) return;

    // Optimistic UI updates
    setItems((prev) => prev.filter(i => !itemsToRestore.includes(i.id)));
    setSelectedItems(new Set());
    
    try {
      for (const itemId of itemsToRestore) {
        if (activeTab === "products") await api.restoreProduct(itemId);
        else if (activeTab === "categories") await api.restoreCategory(itemId);
        else if (activeTab === "users") await api.restoreUser(itemId);
        else if (activeTab === "orders") await api.restoreOrder(itemId);
        else if (activeTab === "updates") await api.restoreUpdate(itemId);
      }
      fetchTrash();
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء الاستعادة");
      fetchTrash();
    }
  };

  const handleHardDelete = async (id?: string) => {
    const itemsToDelete = id ? [id] : Array.from(selectedItems);
    if (itemsToDelete.length === 0) return;

    // Optimistic UI updates
    setItems((prev) => prev.filter(i => !itemsToDelete.includes(i.id)));
    
    try {
      for (const itemId of itemsToDelete) {
        if (activeTab === "products") await api.hardDeleteProduct(itemId);
        else if (activeTab === "categories") await api.hardDeleteCategory(itemId);
        else if (activeTab === "users") await api.hardDeleteUser(itemId);
        else if (activeTab === "orders") await api.hardDeleteOrder(itemId);
        else if (activeTab === "updates") await api.hardDeleteUpdate(itemId);
      }
      setSelectedItems(new Set());
      fetchTrash();
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء الحذف");
      fetchTrash();
    }
  };

  const tabs: { id: CollectionType; label: string }[] = [
    { id: "products", label: "المنتجات" },
    { id: "categories", label: "الأقسام" },
    { id: "users", label: "المستخدمين" },
    { id: "orders", label: "الطلبات" },
    { id: "updates", label: "الإشعارات" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Trash2 className="text-red-500" /> سلة المحذوفات
          </h2>
          <p className="text-sm text-white/50">
            يتم الاحتفاظ بالعناصر المحذوفة لمدة 30 يوماً قبل حذفها نهائياً
          </p>
        </div>
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRestore()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-xl hover:bg-emerald-500/30 transition-colors font-bold text-sm"
            >
              <RefreshCcw size={16} /> استعادة ({selectedItems.size})
            </button>
            <button
              onClick={() => handleHardDelete()}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-500 border border-red-500/50 rounded-xl hover:bg-red-500/30 transition-colors font-bold text-sm"
            >
              <Trash2 size={16} /> حذف نهائي ({selectedItems.size})
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${activeTab === tab.id ? "bg-brq-gold text-black" : "bg-black/40 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden p-1">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-white/50">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20">
              <Trash2 size={32} />
            </div>
            <p className="text-white/50">
              سلة المحذوفات فارغة (لا توجد{" "}
              {tabs.find((t) => t.id === activeTab)?.label} محذوفة)
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-black/40 text-white/60">
                <tr>
                  <th className="p-4 w-12 text-center rounded-tr-lg">
                    <button
                      onClick={selectAll}
                      className={`p-1 rounded ${selectedItems.size === items.length ? "text-brq-gold" : "text-white/30 hover:text-white/50"}`}
                    >
                      <CheckSquare size={18} />
                    </button>
                  </th>
                  <th className="p-4 font-medium">الاسم / التفاصيل</th>
                  <th className="p-4 font-medium">تاريخ الحذف</th>
                  <th className="p-4 font-medium">بواسطة</th>
                  <th className="p-4 font-medium rounded-tl-lg">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/90">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${selectedItems.has(item.id) ? "bg-brq-gold/5" : "hover:bg-white/5"}`}
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 accent-brq-gold cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white">
                        {item.name ||
                          item.username ||
                          item.title ||
                          item.orderNumber ||
                          (activeTab === "updates"
                            ? "إشعار"
                            : "عنصر غير معروف")}
                      </div>
                      <div className="text-xs text-white/50 font-mono mt-1">
                        ID: {item.id}
                      </div>
                    </td>
                    <td className="p-4 text-white/60 text-xs" dir="ltr">
                      {item.deletedAt
                        ? new Date(item.deletedAt).toLocaleString("en-US")
                        : "غير معروف"}
                    </td>
                    <td className="p-4 text-white/60 text-xs font-mono">
                      {item.deletedBy || "---"}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestore(item.id)}
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                        >
                          <RefreshCcw size={14} /> استعادة
                        </button>
                        <button
                          onClick={() => handleHardDelete(item.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                        >
                          <Trash2 size={14} /> حذف نهائي
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
