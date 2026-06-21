import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  BarChart2,
  FolderTree,
  Layers,
  Download,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { api } from "../../api";
import { supabase } from "../../supabase";
import { Category, Product } from "../../types";
import { useStore } from "../../store";

export default function CategoryManager() {
  const { user } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const fetchCats = async () => {
    try {
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let mounted = true;
    const initialFetch = async () => {
      await fetchCats();
      if (mounted) setLoading(false);
    };
    initialFetch();

    // Set up Realtime Sync
    const channel = supabase
      .channel("categories_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          fetchCats();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreate = async () => {
    if (!newCatName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const newCat = await api.createCategory({
        name: newCatName,
        order: categories.length + 1,
        parentId: null,
        isHidden: false,
      });
      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "إنشاء قسم رئيسي",
        entityType: "category",
        entityId: newCat.id,
        details: { name: newCatName },
      });
      setNewCatName("");
      setIsAdding(false);
      const updated = await api.getCategories();
      setCategories(updated);
    } catch (e: any) {
      console.error(e);
      alert("حدث خطأ أثناء الإضافة: " + (e.message || JSON.stringify(e)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      // Optimistic update
      setCategories((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
      
      const allProducts = await api.getProducts();
      const productsInCat = allProducts.filter(
        (p) => p.categoryId === id || p.subcategoryId === id,
      );

      await api.deleteCategory(id, user?.username);
      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "حذف قسم",
        entityType: "category",
        entityId: id,
        details: { name },
      });
      const updated = await api.getCategories();
      setCategories(updated);
    } catch (e) {
      console.error(e);
      // Revert optimistic update
      const updated = await api.getCategories();
      setCategories(updated);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const handleToggleHide = async (id: string, currentIsHidden: boolean) => {
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, isHidden: !currentIsHidden } : c
      )
    );
    try {
      await api.updateCategory(id, {
        isHidden: !currentIsHidden,
      });
      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: currentIsHidden ? "إظهار قسم" : "إخفاء قسم",
        entityType: "category",
        entityId: id,
      });
      const updated = await api.getCategories();
      setCategories(updated);
    } catch (e) {
      console.error(e);
      // Revert optimistic update
      const updated = await api.getCategories();
      setCategories(updated);
    }
  };

  const parentCategories = categories
    .filter((c) => !c.parentId)
    .sort((a: any, b: any) => a.order - b.order);
  const getSubcategories = (parentId: string) =>
    categories
      .filter((c) => c.parentId === parentId)
      .sort((a: any, b: any) => a.order - b.order);

  const [activeParentForSub, setActiveParentForSub] = useState<string | null>(
    null,
  );
  const [newSubName, setNewSubName] = useState("");

  const handleCreateSub = async (parentId: string) => {
    if (!newSubName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const subs = getSubcategories(parentId);
      const newSub = await api.createCategory({
        name: newSubName,
        order: subs.length + 1,
        parentId: parentId,
        isHidden: false,
      });
      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "إنشاء قسم فرعي",
        entityType: "category",
        entityId: newSub.id,
        details: { name: newSubName, parentId },
      });
      setNewSubName("");
      setActiveParentForSub(null);
      const updated = await api.getCategories();
      setCategories(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [downloadProgress, setDownloadProgress] = useState<{
    id: string;
    progress: number;
    total: number;
  } | null>(null);

  const handleDownloadCategory = async (
    catId: string,
    catName: string,
    isSub: boolean,
  ) => {
    try {
      const allProducts = await api.getProducts();
      const productsToDownload = allProducts.filter((p) =>
        isSub ? p.subcategoryId === catId : p.categoryId === catId,
      );

      const imagesWithData = productsToDownload.filter(
        (p) => p.finalImageUrl || p.imageUrl,
      );
      if (imagesWithData.length === 0) {
        alert("لا توجد صور في هذا القسم لتحميلها.");
        return;
      }

      setDownloadProgress({
        id: catId,
        progress: 0,
        total: imagesWithData.length,
      });

      const zip = new JSZip();
      let completed = 0;

      for (const p of imagesWithData) {
        const imgUrl = p.finalImageUrl || p.imageUrl;
        if (imgUrl) {
          try {
            // Fetch the image as blob
            const res = await fetch(imgUrl);
            const blob = await res.blob();

            // Add to zip
            const ext = blob.type.split("/")[1] || "jpg";
            const filename = `${p.productCode || p.name || "product"}.${ext}`;
            zip.file(filename, blob);
          } catch (err) {
            console.error(`Failed to download image for ${p.name}`, err);
          }
        }
        completed++;
        setDownloadProgress({
          id: catId,
          progress: completed,
          total: imagesWithData.length,
        });
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `BRQ-${catName}.zip`);

      setDownloadProgress(null);

      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "تحميل صور قسم",
        entityType: "category",
        entityId: catId,
        details: { name: catName, total: imagesWithData.length },
      });
    } catch (e) {
      console.error("Error generating zip", e);
      alert("حدث خطأ أثناء تحميل القسم");
      setDownloadProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-brq-gold w-12 h-12" />
      </div>
    );
  }

  if (categories.length === 0 && !isAdding) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-[60vh] text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-brq-navy flex items-center justify-center text-brq-gold">
          <Search size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">لا توجد أقسام</h2>
          <p className="text-white/50 max-w-md mx-auto">
            لم يتم العثور على أي أقسام في قاعدة البيانات. يمكنك إضافة قسم جديد
            لبدء تصنيف منتجاتك.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all font-bold"
          >
            <Plus size={20} />
            إنشاء قسم يدوي
          </button>

          <button
            onClick={async () => {
              const CATEGORIES = [
                {
                  name: "جديد الوفاء",
                  order: 1,
                  subs: ["ولادي", "بناتي", "محير"],
                },
                {
                  name: "جديد لاستيك & ايفا",
                  order: 2,
                  subs: ["رجالي", "نسائي"],
                },
                {
                  name: "جديد تركي",
                  order: 3,
                  subs: ["رجالي", "نسائي", "ولادي"],
                },
                { name: "سكيجر راقي", order: 4, subs: ["رجالي", "نسائي"] },
                {
                  name: "جديد الوفاء مدرسي & سفر",
                  order: 5,
                  subs: ["مدرسي", "سفر"],
                },
                { name: "صيفي", order: 6, subs: [] },
                { name: "تحطيم الأسعار", order: 7, subs: [] },
              ];
              for (const cat of CATEGORIES) {
                const parent = await api.createCategory({
                  name: cat.name,
                  order: cat.order,
                  parentId: null,
                  isHidden: false,
                });
                let subOrder = 1;
                for (const sub of cat.subs) {
                  await api.createCategory({
                    name: sub,
                    order: subOrder++,
                    parentId: parent.id,
                    isHidden: false,
                  });
                }
              }
              const updated = await api.getCategories();
              setCategories(updated);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-brq-gold hover:bg-brq-gold/80 text-black rounded-xl transition-all font-bold"
          >
            <Layers size={20} />
            تحميل القوائم المتفق عليها
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">إدارة الأقسام</h2>
          <p className="text-sm text-white/50">
            تنظيم وتصنيف المنتجات في المتجر
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(30,94,255,0.3)]"
        >
          <Plus size={18} /> {isAdding ? "إلغاء" : "إضافة قسم رئيسي"}
        </button>
      </div>

      {isAdding && (
        <div className="glass-panel p-4 rounded-xl border border-brq-gold/30 flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-xs text-white/50 block mb-1">
              اسم القسم الجديد
            </label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white"
              placeholder="مثال: أحذية رياضية..."
              autoFocus
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!newCatName.trim() || isSubmitting}
            className="px-6 py-2 bg-brq-gold text-black rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            حفظ
          </button>
        </div>
      )}

      {categories.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {parentCategories.map((c) => {
            const subs = getSubcategories(c.id!);
            return (
              <div
                key={c.id}
                className="glass-panel border border-white/5 rounded-2xl p-4 overflow-hidden"
              >
                <div
                  className={`flex flex-col md:flex-row justify-between md:items-center gap-4 ${c.isHidden ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-brq-gold font-bold">
                      {c.order}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{c.name}</h3>
                      <p className="text-xs text-white/50">
                        {subs.length} أقسام فرعية
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t border-white/5 md:border-none pt-3 md:pt-0">
                    <button
                      onClick={() =>
                        setActiveParentForSub(
                          activeParentForSub === c.id ? null : c.id!,
                        )
                      }
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors text-blue-400"
                    >
                      <Plus size={14} /> قسم فرعي
                    </button>
                    <button
                      onClick={() =>
                        handleDownloadCategory(c.id!, c.name, false)
                      }
                      disabled={downloadProgress?.id === c.id}
                      className="p-2 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors flex items-center gap-2"
                      title="تحميل صور القسم الكامل"
                    >
                      {downloadProgress?.id === c.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Download size={18} />
                      )}
                    </button>
                    <span
                      className={`px-2 py-1 rounded text-[10px] border mr-2 ${c.isHidden ? "bg-red-500/20 text-red-500 border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"}`}
                    >
                      {c.isHidden ? "مخفي" : "مرئي"}
                    </span>
                    <button
                      onClick={() =>
                        handleToggleHide(c.id!, c.isHidden === true)
                      }
                      className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors"
                      title={c.isHidden ? "إظهار" : "إخفاء"}
                    >
                      {c.isHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id!, c.name)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {downloadProgress?.id === c.id && (
                  <div className="mt-4 p-3 bg-white/5 rounded-xl border border-emerald-500/30">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-400 font-bold">
                        جاري التحضير والتحميل...
                      </span>
                      <span className="text-white/60">
                        {downloadProgress.progress} / {downloadProgress.total}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{
                          width: `${(downloadProgress.progress / downloadProgress.total) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {activeParentForSub === c.id && (
                  <div className="mt-4 p-3 bg-black/40 rounded-xl border border-blue-500/30 flex gap-2">
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      placeholder="اسم القسم الفرعي..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500/50"
                      autoFocus
                    />
                    <button
                      onClick={() => handleCreateSub(c.id!)}
                      disabled={!newSubName.trim() || isSubmitting}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {activeParentForSub === c.id && isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                      إضافة
                    </button>
                  </div>
                )}

                {subs.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {subs.map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-black/30 border border-white/5 p-3 rounded-lg flex items-center justify-between group relative overflow-hidden"
                      >
                        {downloadProgress?.id === sub.id && (
                          <div
                            className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-300 z-0"
                            style={{
                              width: `${(downloadProgress.progress / downloadProgress.total) * 100}%`,
                            }}
                          ></div>
                        )}
                        <span className="text-sm font-semibold z-10 relative">
                          {sub.name}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10 relative">
                          <button
                            onClick={() =>
                              handleDownloadCategory(sub.id!, sub.name, true)
                            }
                            disabled={downloadProgress?.id === sub.id}
                            className="text-emerald-400 p-1 hover:bg-emerald-500/20 rounded"
                            title="تحميل صور هذا القسم الفرعي"
                          >
                            {downloadProgress?.id === sub.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id!, sub.name)}
                            className="text-red-400 p-1 hover:bg-red-500/20 rounded"
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
