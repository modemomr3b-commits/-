import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Archive,
  Upload,
  Package,
  Loader2,
  X,
  Download,
  DollarSign,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Share2,
  History,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { supabase } from "../../supabase";
import { Product, Category } from "../../types";
import { burnProductOverlay } from "../../utils/burnImage";
import { BatchProductUpload } from "./BatchProductUpload";
import { useStore } from "../../store";
import { CategoryDownloadDialog } from "../shared/CategoryDownloadDialog";
import ImageViewer from "../ImageViewer";
import { PriceHistoryViewer } from "../member/PriceHistoryViewer";

export default function ProductManager() {
  const { user } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewImage, setViewImage] = useState<{ src: string, alt: string } | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usdRate, setUsdRate] = useState<number>(1500);

  const [isAdding, setIsAdding] = useState(false);
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [batchCategoryId, setBatchCategoryId] = useState<string>("");
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<{
    progress: number;
    total: number;
  } | null>(null);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    price: 0,
    dozenPriceUsd: 0,
    modelNumber: "",
    productCode: "",
    barcode: "",
    categoryId: "",
    imageUrl: "",
    forceStandardCrush: true,
    isHidden: true,
  });

  const [filterStatus, setFilterStatus] = useState<"active" | "archived" | "inactive" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  const autoSelectSubcategory = (name: string, categoryId: string, currentSubcategoryId?: string) => {
    if (!categoryId || !name) return currentSubcategoryId || "";
    
    const lowerName = name.toLowerCase();
    const subs = categories.filter(c => c.parentId === categoryId);
    
    const matches = [
        { key: "رجالي", term: "رجالي" },
        { key: "نسائي", term: "نسائي" },
        { key: "شبابي", term: "شبابي" },
        { key: "ولادي", term: "ولادي" },
        { key: "طفل", term: "ولادي" },
        { key: "بناتي", term: "بناتي" },
        { key: "طفلة", term: "بناتي" },
        { key: "بيبي", term: "بيبي" },
        { key: "اعدادي", term: "اعدادي" },
        { key: "مدرسي", term: "مدرسي" },
        { key: "سفر", term: "سفر" },
    ];
    
    for (const match of matches) {
        if (lowerName.includes(match.key)) {
            const foundSub = subs.find(s => s.name.includes(match.term) || s.name.includes(match.key));
            if (foundSub) {
                return foundSub.id;
            }
        }
    }
    return currentSubcategoryId || "";
  };

  const loadData = async () => {
    try {
      const [cats, prods, settings] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
        api.getSettings(),
      ]);
      setCategories(cats);
      setProducts(
        prods.map((p: any) => ({
          ...p,
          createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
        })),
      );
      if (settings?.usdExchangeRate) {
        setUsdRate(settings.usdExchangeRate);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let mounted = true;
    let fetchTimeout: any;
    const initialLoad = async () => {
      await loadData();
      if (mounted) setLoading(false);
    };
    initialLoad();

    const channel = supabase
      .channel("products_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          clearTimeout(fetchTimeout);
          fetchTimeout = setTimeout(() => {
             if (mounted) loadData();
          }, 1500);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        () => {
          clearTimeout(fetchTimeout);
          fetchTimeout = setTimeout(() => {
             if (mounted) loadData();
          }, 1500);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(fetchTimeout);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateUsdRate = async (newRate: number) => {
    setUsdRate(newRate);
    try {
      const currentSettings = (await api.getSettings()) || {};
      await api.updateSettings({
        ...currentSettings,
        usdExchangeRate: newRate,
      });
    } catch (e) {
      console.error("Failed to update USD rate", e);
    }
  };

  const handlePriceAndPackaging = (
    usdValue: number,
    packaging: string,
    customPieces: number,
    isEditing: boolean = false,
    forceStandardCrush: boolean = false,
  ) => {
    let pieces = customPieces || 12;

    const iqdValue = usdValue * usdRate;
    const calcPieces = forceStandardCrush ? 12 : pieces;
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    if (isEditing && editingProduct) {
      setEditingProduct({
        ...editingProduct,
        dozenPriceUsd: usdValue,
        price: iqdValue,
        packaging,
        piecesCount: pieces,
        forceStandardCrush,
        piecePriceUsd: pieceUsd,
        piecePriceIqd: pieceIqd,
      });
    } else {
      setNewProduct({
        ...newProduct,
        dozenPriceUsd: usdValue,
        price: iqdValue,
        packaging,
        piecesCount: pieces,
        forceStandardCrush,
        piecePriceUsd: pieceUsd,
        piecePriceIqd: pieceIqd,
      });
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEditing: boolean,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          if (isEditing && editingProduct) {
            setEditingProduct({ ...editingProduct, imageUrl: dataUrl });
          } else {
            setNewProduct({ ...newProduct, imageUrl: dataUrl });
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let finalImg = newProduct.imageUrl;
      if (newProduct.imageUrl) {
        try {
          finalImg = await burnProductOverlay(newProduct, newProduct.imageUrl);
        } catch (e) {
          console.error("Failed to generate burned image", e);
        }
      }

      const created = await api.createProduct({
        ...newProduct,
        finalImageUrl: finalImg,
        views: 0,
        isArchived: false,
        isHidden: newProduct.isHidden ?? true,
      });
      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "إضافة منتج جديد",
        entityType: "product",
        entityId: created.id,
        details: { name: newProduct.name, code: newProduct.productCode },
      });
      setIsAdding(false);
      setNewProduct({
        name: "",
        price: 0,
        dozenPriceUsd: 0,
        modelNumber: "",
        productCode: "",
        barcode: "",
        categoryId: "",
        imageUrl: "",
        forceStandardCrush: true,
        isHidden: true,
      });
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (error: any) {
      console.error(error);
      alert("حدث خطأ أثناء الإضافة: " + (error.message || JSON.stringify(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.price || isSubmitting)
      return;
    setIsSubmitting(true);
    try {
      const originalProduct = products.find(p => p.id === editingProduct.id);
      let finalImg = editingProduct.finalImageUrl || editingProduct.imageUrl;
      if (editingProduct.imageUrl) {
        try {
          finalImg = await burnProductOverlay(
            editingProduct,
            editingProduct.imageUrl,
          );
        } catch (err) {
          console.error("Failed to generate burned image on update", err);
        }
      }

      const isPriceChanged = originalProduct && (
        originalProduct.price !== editingProduct.price ||
        originalProduct.piecePriceIqd !== editingProduct.piecePriceIqd ||
        originalProduct.dozenPriceUsd !== editingProduct.dozenPriceUsd
      );

      const oldPriceInfo = (isPriceChanged && originalProduct?.finalImageUrl) ? {
        price: originalProduct.price,
        piecePriceIqd: originalProduct.piecePriceIqd,
        dozenPriceUsd: originalProduct.dozenPriceUsd,
        finalImageUrl: originalProduct.finalImageUrl,
        updatedAt: Date.now()
      } : originalProduct?.oldPriceInfo;

      await api.updateProduct(editingProduct.id!, {
        ...editingProduct,
        finalImageUrl: finalImg,
        oldPriceInfo: oldPriceInfo
      });
      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "تعديل بيانات أو صورة منتج",
        entityType: "product",
        entityId: editingProduct.id,
        details: { name: editingProduct.name },
      });
      setEditingProduct(null);
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء التحديث");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      if (!id) {
        alert("حدث خطأ: لا يوجد معرف للمنتج");
        return;
      }
      
      // Optimistic update
      setProducts((prev) => prev.filter((prod) => prod.id !== id));
      
      await api.deleteProduct(id, user?.username);
      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "حذف منتج",
        entityType: "product",
        entityId: id,
        details: { name },
      });
      const updated = await api.getProducts();
      setProducts(updated);
      setDeleteConfirmId(null);
    } catch (e: any) {
      console.error("Error deleting:", e);
      // Revert on error
      const updated = await api.getProducts();
      setProducts(updated);
      alert("فشل الحذف: " + e.message);
    }
  };

  const handleToggleArchive = async (p: Product) => {
    // Optimistic update
    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === p.id ? { ...prod, isArchived: !prod.isArchived } : prod
      )
    );
    try {
      await api.updateProduct(p.id!, { isArchived: !p.isArchived });
    } catch (e) {
      console.error(e);
      // Revert optimistic update
      const updated = await api.getProducts();
      setProducts(updated);
      alert("فشل تغيير حالة المنتج");
    }
  };

  const handleToggleHide = async (p: Product) => {
    // Optimistic update
    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === p.id ? { ...prod, isHidden: !prod.isHidden } : prod
      )
    );
    try {
      await api.updateProduct(p.id!, { isHidden: !p.isHidden });
    } catch (e) {
      console.error(e);
      // Revert optimistic update
      const updated = await api.getProducts();
      setProducts(updated);
      alert("فشل تغيير حالة إخفاء المنتج");
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = (visibleProducts: Product[]) => {
    if (selectedIds.size === visibleProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleProducts.map((p) => p.id!)));
    }
  };

  const handleBulkShare = async () => {
    if (selectedIds.size === 0) return;

    const productsToDownload = products.filter((p) => selectedIds.has(p.id!));
    const imagesWithData = productsToDownload.filter(
      (p) => p.finalImageUrl || p.imageUrl,
    );

    if (imagesWithData.length === 0) {
      alert("لا توجد صور للمنتجات المحددة.");
      return;
    }

    setDownloadProgress({ progress: 0, total: imagesWithData.length });
    let completed = 0;
    const files: File[] = [];

    for (const p of imagesWithData) {
      const imgUrl = p.finalImageUrl || p.imageUrl;
      if (imgUrl) {
        try {
          const res = await fetch(imgUrl);
          const blob = await res.blob();
          const ext = blob.type.split("/")[1] || "jpg";
          const safeName = (p.productCode || p.name || "product").replace(/[\/\?<>\\:\*\|":]/g, '-');
          const filename = `${safeName}.${ext}`;
          files.push(new File([blob], filename, { type: blob.type }));
        } catch (err) {
          console.error(`Failed to fetch image for ${p.name}`, err);
        }
      }
      completed++;
      setDownloadProgress({
        progress: completed,
        total: imagesWithData.length,
      });
    }

    setDownloadProgress(null);

    if (files.length > 0) {
      if (navigator.canShare && navigator.canShare({ files })) {
        try {
          await navigator.share({
            files,
            title: 'منتجات BRQ',
          });
          setSelectedIds(new Set());
        } catch (error) {
          console.error('Error sharing files', error);
        }
      } else {
        alert("متصفحك لا يدعم مشاركة هذه الصور مباشرة. جرب تحميلها بدلاً من ذلك.");
      }
    }
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;

    const productsToDownload = products.filter((p) => selectedIds.has(p.id!));
    const imagesWithData = productsToDownload.filter(
      (p) => p.finalImageUrl || p.imageUrl,
    );

    if (imagesWithData.length === 0) {
      alert("لا توجد صور للمنتجات المحددة.");
      return;
    }

    setDownloadProgress({ progress: 0, total: imagesWithData.length });
    let completed = 0;

    for (const p of imagesWithData) {
      const imgUrl = p.finalImageUrl || p.imageUrl;
      if (imgUrl) {
        try {
          const res = await fetch(imgUrl);
          const blob = await res.blob();
          const ext = blob.type.split("/")[1] || "jpg";
          
          const safeName = (p.productCode || p.name || "product").replace(/[\/\?<>\\:\*\|":]/g, '-');
          const filename = `${safeName}.${ext}`;
          
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Small delay to prevent browser from blocking multiple downloads
          await new Promise(resolve => setTimeout(resolve, 300));
          
          URL.revokeObjectURL(objectUrl);
        } catch (err) {
          console.error(`Failed to download image for ${p.name}`, err);
        }
      }
      completed++;
      setDownloadProgress({
        progress: completed,
        total: imagesWithData.length,
      });
    }

    setDownloadProgress(null);
    setSelectedIds(new Set());
  };

  const getCategoryName = (id: string) => {
    return categories.find((c) => c.id === id)?.name || "بدون قسم";
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-brq-gold w-12 h-12 mb-4" />
        <p className="text-white/50">جاري تحميل المنتجات...</p>
      </div>
    );
  }

  const filteredProducts = products.filter(p => {
    if (filterCategoryId && p.categoryId !== filterCategoryId) {
      return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.productCode && p.productCode.toLowerCase().startsWith(q)) ||
        (p.modelNumber && p.modelNumber.toLowerCase().startsWith(q)) ||
        (p.barcode && p.barcode.toLowerCase().startsWith(q));
      
      if (!matchesSearch) return false;
    } else {
      if (filterStatus === 'archived') {
        if (!p.isArchived) return false;
      } else if (filterStatus === 'inactive') {
        if (!p.isHidden || p.isArchived) return false;
      } else if (filterStatus === 'active') {
        if (p.isHidden || p.isArchived) return false;
      } else if (filterStatus === null) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">إدارة المنتجات</h2>
          <p className="text-sm text-white/50">
            التحكم الكامل في كتالوج المنتجات والمخزون
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto items-center">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-brq-gold/50 transition-colors hidden md:flex">
            <DollarSign size={16} className="text-brq-gold" />
            <div className="flex flex-col">
              <span className="text-[10px] text-white/50 leading-none mb-1">
                سعر التكسير
              </span>
              <input
                type="number"
                value={usdRate}
                onChange={(e) => handleUpdateUsdRate(Number(e.target.value))}
                className="w-16 bg-transparent text-sm text-white font-mono outline-none leading-none"
                dir="ltr"
              />
            </div>
          </div>
          <button onClick={() => setIsDownloadDialogOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-gold/20 border border-brq-gold/50 text-brq-gold rounded-xl hover:bg-brq-gold/30 transition-all text-sm font-bold">
            <Download size={18} /> تحميل متقدم
          </button>
          <button onClick={() => { setIsBatchAdding(!isBatchAdding); setIsAdding(false); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-navy border border-brq-gold/50 text-brq-gold rounded-xl hover:bg-brq-gold hover:text-black transition-all text-sm font-bold">
            <Upload size={18} /> رفع سريع (10 منتجات)
          </button>
          <button
            onClick={() => { setIsAdding(!isAdding); setIsBatchAdding(false); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(30,94,255,0.3)]"
          >
            <Plus size={18} /> إضافة منتج
          </button>
        </div>
      </div>

      {isDownloadDialogOpen && (
        <CategoryDownloadDialog 
          categories={categories}
          products={products}
          onClose={() => setIsDownloadDialogOpen(false)}
        />
      )}

      {isBatchAdding && (
        <BatchProductUpload 
            categories={categories}
            usdRate={usdRate}
            user={user}
            onAdded={loadData}
            onClose={() => setIsBatchAdding(false)}
        />
      )}

      {isAdding && (
        <div className="glass-panel p-6 rounded-2xl border border-brq-gold/30 relative">
          <button
            onClick={() => setIsAdding(false)}
            className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-black/40 rounded-full"
          >
            <X size={16} />
          </button>
          <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">
            إضافة منتج جديد
          </h3>
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="text-xs text-white/50 block mb-1">
                اسم المنتج *
              </label>
              <input
                required
                type="text"
                value={newProduct.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  const autoSub = autoSelectSubcategory(newName, newProduct.categoryId || "");
                  setNewProduct({ ...newProduct, name: newName, subcategoryId: autoSub || newProduct.subcategoryId });
                }}
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                سعر الدرزن (بالدولار)
              </label>
              <input
                type="number"
                step="0.01"
                value={newProduct.dozenPriceUsd || ""}
                onChange={(e) =>
                  handlePriceAndPackaging(
                    Number(e.target.value),
                    newProduct.packaging || "",
                    newProduct.piecesCount || 12,
                    false,
                    newProduct.forceStandardCrush
                  )
                }
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
              />
              <p className="text-[10px] text-white/40 mt-1">
                يتم ضربه بسعر الصرف الحالي: {usdRate}
              </p>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                سعر الدرزن (بالدينار) *
              </label>
              <input
                required
                type="number"
                value={newProduct.price || ""}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    price: Number(e.target.value),
                  })
                }
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                التعبئة (رقم أو نص يظهر في الصورة)
              </label>
              <input
                type="text"
                value={newProduct.packaging || ""}
                placeholder="مثال: 12"
                onChange={(e) => {
                  const val = e.target.value;
                  const num = parseInt(val) || 12;
                  handlePriceAndPackaging(
                    newProduct.dozenPriceUsd || 0,
                    val,
                    num,
                    false,
                    newProduct.forceStandardCrush
                  );
                }}
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 md:col-span-2">
              <label className="text-sm text-white/80 select-none flex-1">
                تشغيل التكسير التلقائي (تقسيم سعر القطعة على 12 دائماً)
              </label>
              <select
                value={newProduct.forceStandardCrush ? "yes" : "no"}
                onChange={(e) => {
                  const forceCrush = e.target.value === "yes";
                  handlePriceAndPackaging(
                    newProduct.dozenPriceUsd || 0,
                    newProduct.packaging || "",
                    newProduct.piecesCount || 12,
                    false,
                    forceCrush
                  );
                }}
                className="bg-white border border-black rounded-lg px-3 py-1.5 text-sm focus:border-brq-gold/50 outline-none text-black w-24 placeholder:text-gray-500"
              >
                <option value="no">لا</option>
                <option value="yes">نعم</option>
              </select>
            </div>
            {newProduct.piecesCount ? (
              <div className="md:col-span-2 bg-white/5 p-3 rounded-lg border border-white/10 mt-2 text-center">
                <p className="text-xs text-white/50 mb-1">
                  سعر القطعة (بالدينار)
                </p>
                <p className="font-mono text-lg font-bold text-brq-gold">
                  {newProduct.piecePriceIqd?.toLocaleString()}{" "}
                  <span className="text-sm">د.ع</span>
                </p>
              </div>
            ) : null}
            <div>
              <label className="text-xs text-white/50 block mb-1">القسم</label>
              <select
                value={newProduct.categoryId}
                onChange={(e) => {
                  const newCat = e.target.value;
                  const autoSub = autoSelectSubcategory(newProduct.name || "", newCat);
                  setNewProduct({
                    ...newProduct,
                    categoryId: newCat,
                    subcategoryId: autoSub || "",
                  });
                }}
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
              >
                <option value="">-- إختر القسم --</option>
                {categories
                  .filter((c) => !c.parentId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                القسم الفرعي
              </label>
              <select
                value={newProduct.subcategoryId || ""}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    subcategoryId: e.target.value,
                  })
                }
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black disabled:opacity-50 placeholder:text-gray-500"
                disabled={!newProduct.categoryId}
              >
                <option value="">-- إختر القسم الفرعي --</option>
                {categories
                  .filter((c) => c.parentId === newProduct.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                كود المنتج
              </label>
              <input
                type="text"
                value={newProduct.productCode}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, productCode: e.target.value })
                }
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">
                صورة المنتج
              </label>
              <div className="flex items-center gap-3">
                {newProduct.imageUrl && (
                  <img
                    src={newProduct.imageUrl}
                    alt="preview"
                    className="w-10 h-10 rounded object-contain border border-white/20 bg-black/50"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, false)}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black/10 file:text-black hover:file:bg-black/20 transition-colors placeholder:text-gray-500"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-brq-gold text-black font-bold rounded-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  "أضف المنتج"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {products.length === 0 && !isAdding ? (
        <div className="flex-1 flex flex-col justify-center items-center h-[40vh] text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-brq-navy flex items-center justify-center text-brq-gold">
            <Package size={48} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              لا توجد منتجات
            </h2>
            <p className="text-white/50 max-w-md mx-auto">
              لم يتم العثور على أي منتجات في قاعدة البيانات.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-white/10 pb-0">
            <button
              onClick={() => setFilterStatus("active")}
              className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${filterStatus === "active" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}`}
            >
              المنتجات الفعالة
            </button>
            <button
              onClick={() => setFilterStatus("inactive")}
              className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${filterStatus === "inactive" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}`}
            >
              المواد غير الفعالة
            </button>
            <button
              onClick={() => setFilterStatus("archived")}
              className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${filterStatus === "archived" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}`}
            >
              المواد النافذة
            </button>
          </div>

          <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden p-1">
            <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-black rounded-lg pr-10 pl-4 py-2.5 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-brq-gold/50"
                    placeholder="بحث بالاسم، الكود، الباركود..."
                  />
                </div>
                <div className="relative">
                  <select
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    className="appearance-none pl-8 pr-10 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white hover:bg-white/5 transition-colors focus:outline-none focus:border-brq-gold/50"
                  >
                    <option value="">جميع الأقسام</option>
                    {categories.filter(c => !c.parentId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4 pointer-events-none" />
                </div>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white/80">
                    تم تحديد: {selectedIds.size}
                  </span>
                  <button
                    onClick={handleBulkShare}
                    disabled={downloadProgress !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-500/30 transition-colors font-bold"
                  >
                    <Share2 size={16} />
                    مشاركة الصور
                  </button>
                  <button
                    onClick={handleBulkDownload}
                    disabled={downloadProgress !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors font-bold"
                  >
                    {downloadProgress ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    {downloadProgress
                      ? `جاري التحميل ${downloadProgress.progress}/${downloadProgress.total}`
                      : "تحميل الصور"}
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              {filterStatus === null && !searchQuery ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-center p-8 space-y-6">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/30 border border-white/10">
                    <Package size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">اختر القسم للبدء</h3>
                    <p className="text-white/50 max-w-sm">
                      قم باختيار المنتجات الفعالة، غير الفعالة، أو النافذة من القائمة العلوية لعرض المنتجات، أو ابدأ بالبحث مباشرة.
                    </p>
                  </div>
                </div>
              ) : (
              <table className="w-full text-sm text-right">
                <thead className="bg-black/40 text-white/60">
                  <tr>
                    <th className="p-4 font-medium rounded-tr-lg w-10">
                      <button
                        onClick={() => toggleAll(filteredProducts)}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        {selectedIds.size > 0 && selectedIds.size === filteredProducts.length ? (
                          <CheckSquare size={18} className="text-brq-gold" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </th>
                    <th className="p-4 font-medium">صورة</th>
                    <th className="p-4 font-medium">اسم المنتج</th>
                    <th className="p-4 font-medium">الكود</th>
                    <th className="p-4 font-medium">الرمز</th>
                    <th className="p-4 font-medium">القسم</th>
                    <th className="p-4 font-medium">السعر</th>
                    <th className="p-4 font-medium">التعبئة</th>
                    <th className="p-4 font-medium">المشاهدات</th>
                    <th className="p-4 font-medium rounded-tl-lg">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/90">
                  {filteredProducts.map((p) => (
                      <tr
                        key={p.id}
                        className={`hover:bg-white/5 transition-colors ${selectedIds.has(p.id!) ? "bg-brq-gold/5" : ""}`}
                      >
                        <td className="p-4">
                          <button
                            onClick={() => toggleSelection(p.id!)}
                            className="text-white/40 hover:text-white transition-colors"
                          >
                            {selectedIds.has(p.id!) ? (
                              <CheckSquare
                                size={18}
                                className="text-brq-gold"
                              />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <div 
                            className="w-12 h-12 rounded-lg bg-brq-navy flex items-center justify-center border border-white/10 overflow-hidden text-2xl cursor-pointer"
                            onClick={() => {
                              if (p.finalImageUrl || p.imageUrl) {
                                setViewImage({ src: p.finalImageUrl || p.imageUrl || '', alt: p.name });
                              }
                            }}
                          >
                            {p.finalImageUrl || p.imageUrl ? (
                              <img
                                src={p.finalImageUrl || p.imageUrl}
                                alt={p.name}
                                className="w-full h-full object-contain bg-black/20"
                              />
                            ) : (
                              "👟"
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-bold flex flex-col justify-center items-start gap-1">
                          <span>{p.name}</span>
                          {searchQuery && (
                            <div className="flex gap-1">
                              {p.isArchived ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">
                                  نافذ
                                </span>
                              ) : p.isHidden ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                  غير فعال
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400 border border-green-500/30">
                                  فعال
                                </span>
                              )}
                            </div>
                          )}
                          {!searchQuery && p.isHidden && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              مخفي
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono text-brq-gold">
                          {p.productCode || "-"}
                        </td>
                        <td className="p-4 font-mono text-white/80">
                          {p.modelNumber || "-"}
                        </td>
                        <td className="p-4 text-xs bg-black/20">
                          <span className="px-2 py-1 rounded bg-brq-navy/50 border border-white/10">
                            {getCategoryName(p.categoryId)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-brq-gold">
                              {(p.price || 0).toLocaleString("ar-IQ")} د.ع
                            </span>
                            {p.dozenPriceUsd !== undefined && (
                              <span className="font-mono text-xs text-brq-blue mt-0.5">
                                ${p.dozenPriceUsd}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-xs">
                          {p.packaging || "-"}
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1 text-white/60">
                            <Search size={12} /> {p.views || 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {(p.finalImageUrl || p.imageUrl) && (
                              <a
                                href={p.finalImageUrl || p.imageUrl}
                                download={`BRQ-${p.name}.jpg`}
                                className="p-1.5 hover:bg-white/20 text-white/70 rounded transition-colors"
                                title="تحميل"
                              >
                                <Download size={16} />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleHide(p)}
                              className={`p-1.5 rounded transition-colors ${p.isHidden ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'hover:bg-purple-500/20 text-white/50 hover:text-purple-400'}`}
                              title={p.isHidden ? "إظهار المنتج للمستخدمين" : "إخفاء المنتج عن المستخدمين"}
                            >
                              {p.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            {p.oldPriceInfo && (
                              <button
                                type="button"
                                onClick={() => setHistoryProduct(p)}
                                className="p-1.5 hover:bg-brq-gold/20 text-brq-gold rounded transition-colors"
                                title="تم تغيير السعر - عرض التاريخ"
                              >
                                <History size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingProduct({ ...p, forceStandardCrush: p.forceStandardCrush ?? true })}
                              className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"
                              title="تعديل"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleArchive(p)}
                              className="p-1.5 hover:bg-yellow-500/20 text-yellow-400 rounded transition-colors"
                              title={
                                p.isArchived
                                  ? "استرجاع من المواد النافذة"
                                  : "نقل مباشر إلى المواد النافذة"
                              }
                            >
                              <Package size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id, p.name)}
                              className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              )}
            </div>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-brq-gold/30 relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-black/40 rounded-full"
            >
              <X size={16} />
            </button>
            <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">
              تعديل المنتج
            </h3>
            <form
              onSubmit={handleUpdate}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  اسم المنتج *
                </label>
                <input
                  required
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const autoSub = autoSelectSubcategory(newName, editingProduct.categoryId || "");
                    setEditingProduct({
                      ...editingProduct,
                      name: newName,
                      subcategoryId: autoSub || editingProduct.subcategoryId
                    });
                  }}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  سعر الدرزن (بالدولار)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingProduct.dozenPriceUsd || ""}
                  onChange={(e) =>
                    handlePriceAndPackaging(
                      Number(e.target.value),
                      editingProduct.packaging || "",
                      editingProduct.piecesCount || 12,
                      true,
                      editingProduct.forceStandardCrush
                    )
                  }
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
                <p className="text-[10px] text-white/40 mt-1">
                  يتم ضربه بسعر الصرف الحالي: {usdRate}
                </p>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  سعر الدرزن (بالدينار) *
                </label>
                <input
                  required
                  type="number"
                  value={editingProduct.price || ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  التعبئة (رقم أو نص يظهر في الصورة)
                </label>
                <input
                  type="text"
                  value={editingProduct.packaging || ""}
                  placeholder="مثال: 12"
                  onChange={(e) => {
                    const val = e.target.value;
                    const num = parseInt(val) || 12;
                    handlePriceAndPackaging(
                      editingProduct.dozenPriceUsd || 0,
                      val,
                      num,
                      true,
                      editingProduct.forceStandardCrush
                    );
                  }}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
              </div>
              <div className="flex items-center gap-2 mt-2 md:col-span-2">
                <label className="text-sm text-white/80 select-none flex-1">
                  تشغيل التكسير التلقائي (تقسيم سعر القطعة على 12 دائماً)
                </label>
                <select
                  value={editingProduct.forceStandardCrush ? "yes" : "no"}
                  onChange={(e) => {
                    const forceCrush = e.target.value === "yes";
                    handlePriceAndPackaging(
                      editingProduct.dozenPriceUsd || 0,
                      editingProduct.packaging || "",
                      editingProduct.piecesCount || 12,
                      true,
                      forceCrush
                    );
                  }}
                  className="bg-white border border-black rounded-lg px-3 py-1.5 text-sm focus:border-brq-gold/50 outline-none text-black w-24 placeholder:text-gray-500"
                >
                  <option value="no">لا</option>
                  <option value="yes">نعم</option>
                </select>
              </div>
              {editingProduct.piecesCount ? (
                <div className="md:col-span-2 bg-white/5 p-3 rounded-lg border border-white/10 mt-2 text-center">
                  <p className="text-xs text-white/50 mb-1">
                    سعر القطعة (بالدينار)
                  </p>
                  <p className="font-mono text-lg font-bold text-brq-gold">
                    {editingProduct.piecePriceIqd?.toLocaleString()}{" "}
                    <span className="text-sm">د.ع</span>
                  </p>
                </div>
              ) : null}
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  القسم
                </label>
                <select
                  value={editingProduct.categoryId}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    const autoSub = autoSelectSubcategory(editingProduct.name || "", newCat);
                    setEditingProduct({
                      ...editingProduct,
                      categoryId: newCat,
                      subcategoryId: autoSub || "",
                    });
                  }}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                >
                  <option value="">-- إختر القسم --</option>
                  {categories
                    .filter((c) => !c.parentId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  القسم الفرعي
                </label>
                <select
                  value={editingProduct.subcategoryId || ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      subcategoryId: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black disabled:opacity-50 placeholder:text-gray-500"
                  disabled={!editingProduct.categoryId}
                >
                  <option value="">-- إختر القسم الفرعي --</option>
                  {categories
                    .filter((c) => c.parentId === editingProduct.categoryId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  كود المنتج
                </label>
                <input
                  type="text"
                  value={editingProduct.productCode}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      productCode: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  صورة المنتج
                </label>
                <div className="flex items-center gap-3">
                  {editingProduct.imageUrl && (
                    <img
                      src={editingProduct.imageUrl}
                      alt="preview"
                      className="w-10 h-10 rounded object-contain border border-white/20 bg-black/50"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black/10 file:text-black hover:file:bg-black/20 transition-colors placeholder:text-gray-500"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-brq-gold text-black font-bold rounded-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    "حفظ التعديلات"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {viewImage && (
        <ImageViewer 
          src={viewImage.src} 
          alt={viewImage.alt} 
          onClose={() => setViewImage(null)} 
        />
      )}

      {historyProduct && (
        <PriceHistoryViewer product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
    </div>
  );
}
