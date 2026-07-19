import { formatDateTime, formatDate } from '../../utils/time';
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
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Lock,
  Unlock,
  FolderInput,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ isBulk: boolean; ids?: string[]; name?: string; count?: number; } | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState<{ atNumber: string; existingName: string; type: 'create' | 'update'; payload: any } | null>(null);
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

  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "archived" | "inactive" | "duplicates" | "locked" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveToCategoryId, setMoveToCategoryId] = useState("");
  const [moveToSubcategoryId, setMoveToSubcategoryId] = useState("");
  const itemsPerPage = 30;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchDate, filterCategoryId, filterStatus]);

  const autoSelectSubcategory = (name: string, categoryId: string, currentSubcategoryId?: string) => {
    if (!categoryId || !name) return currentSubcategoryId || "";
    
    const lowerName = name.toLowerCase();
    const subs = categories.filter(c => c.parentId === categoryId);
    
    const matches = [
        { key: "رجالي", term: "رجالي" },
        { key: "نسائي", term: "نسائي" },
        { key: "شبابي", term: "شبابي" },
        { key: "ولادي", term: "ولادي" },
        { key: "طفلة", term: "طفلة" },
        { key: "طفل", term: "طفل" },
        { key: "بناتي", term: "بناتي" },
        { key: "بيبي", term: "بيبي" },
        { key: "مواليد", term: "مواليد" },
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
      api.getCategories().then(cats => setCategories(cats));
      api.getSettings().then(settings => {
        if (settings?.usdExchangeRate) {
          setUsdRate(settings.usdExchangeRate);
        }
      });
      const prods = await api.getProducts();
      setProducts(
        prods.map((p: any) => ({
          ...p,
          createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
        })),
      );
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

  const handleUsdPriceChange = (
    usdValue: number,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;
    
    const iqdValue = usdValue * usdRate;
    const calcPieces = (target.forceStandardCrush ?? true) ? 12 : (target.piecesCount || 12);
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    const updated = {
      ...target,
      dozenPriceUsd: Number(usdValue.toFixed(2)),
      price: iqdValue,
      piecePriceUsd: Number(pieceUsd.toFixed(2)),
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };

  const handleIqdPriceChange = (
    iqdValue: number,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;
    
    const usdValue = usdRate > 0 ? iqdValue / usdRate : 0;
    const calcPieces = (target.forceStandardCrush ?? true) ? 12 : (target.piecesCount || 12);
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    const updated = {
      ...target,
      dozenPriceUsd: Number(usdValue.toFixed(2)),
      price: iqdValue,
      piecePriceUsd: Number(pieceUsd.toFixed(2)),
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };

  const handlePackagingChange = (
    packaging: string,
    isEditing: boolean = false
  ) => {
    if (isEditing) {
      setEditingProduct(prev => prev ? { ...prev, packaging } as any : prev);
    } else {
      setNewProduct(prev => prev ? { ...prev, packaging } as any : prev);
    }
  };

  const handleForceStandardCrushChange = (
    forceStandardCrush: boolean,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;

    const calcPieces = forceStandardCrush ? 12 : (target.piecesCount || 12);
    const usdValue = target.dozenPriceUsd || 0;
    const iqdValue = target.price || 0;
    
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    const updated = {
      ...target,
      forceStandardCrush,
      piecePriceUsd: Number(pieceUsd.toFixed(2)),
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };

  const handlePiecesCountChange = (
    piecesCount: number,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;

    const calcPieces = (target.forceStandardCrush ?? true) ? 12 : piecesCount;
    const usdValue = target.dozenPriceUsd || 0;
    const iqdValue = target.price || 0;
    
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    const updated = {
      ...target,
      piecesCount,
      piecePriceUsd: Number(pieceUsd.toFixed(2)),
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
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

  const extractAtNumber = (name: string) => {
    if (!name) return null;
    const words = name.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    if (lastWord && !/[\u0600-\u06FF]/.test(lastWord) && lastWord.length >= 3) {
      return lastWord.toUpperCase().replace(/[-_]/g, '');
    }
    return null;
  };

  const proceedCreate = async (payloadToCreate: any) => {
    setIsSubmitting(true);
    setDuplicateConfirm(null);
    try {
      let finalImg = payloadToCreate.imageUrl;
      if (payloadToCreate.imageUrl) {
        try {
          finalImg = await burnProductOverlay(payloadToCreate, payloadToCreate.imageUrl);
        } catch (e) {
          console.error("Failed to generate burned image", e);
        }
      }

      const created = await api.createProduct({
        ...payloadToCreate,
        finalImageUrl: finalImg,
        views: 0,
        isArchived: false,
        isHidden: payloadToCreate.isHidden ?? true,
      });
      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "إضافة منتج جديد",
        entityType: "product",
        entityId: created.id,
        details: { name: payloadToCreate.name, code: payloadToCreate.productCode },
      });
      // setIsAdding(false); removed to keep form open
      setPublishSuccess(true);
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (error: any) {
      console.error(error);
      setAlertMessage("حدث خطأ أثناء الإضافة: " + (error.message || JSON.stringify(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || isSubmitting) return;

    const atNumber = extractAtNumber(newProduct.name);
    if (atNumber) {
      const existing = products.find(p => {
        const existingAt = extractAtNumber(p.name || "");
        return existingAt === atNumber;
      });
      if (existing) {
        setDuplicateConfirm({
          atNumber,
          existingName: existing.name || '',
          type: 'create',
          payload: newProduct
        });
        return;
      }
    }

    proceedCreate(newProduct);
  };

  const proceedUpdate = async (payloadToUpdate: any) => {
    setIsSubmitting(true);
    setDuplicateConfirm(null);
    try {
      const originalProduct = products.find(p => p.id === payloadToUpdate.id);
      let finalImg = payloadToUpdate.finalImageUrl || payloadToUpdate.imageUrl;
      if (payloadToUpdate.imageUrl) {
        try {
          finalImg = await burnProductOverlay(
            payloadToUpdate,
            payloadToUpdate.imageUrl,
          );
        } catch (err) {
          console.error("Failed to generate burned image on update", err);
        }
      }

      const isPriceChanged = originalProduct && (
        originalProduct.price !== payloadToUpdate.price ||
        originalProduct.piecePriceIqd !== payloadToUpdate.piecePriceIqd ||
        originalProduct.dozenPriceUsd !== payloadToUpdate.dozenPriceUsd
      );

      const oldPriceInfo = (isPriceChanged && originalProduct?.finalImageUrl) ? {
        price: originalProduct.price,
        piecePriceIqd: originalProduct.piecePriceIqd,
        dozenPriceUsd: originalProduct.dozenPriceUsd,
        finalImageUrl: originalProduct.finalImageUrl,
        updatedAt: Date.now()
      } : originalProduct?.oldPriceInfo;

      await api.updateProduct(payloadToUpdate.id!, {
        ...payloadToUpdate,
        finalImageUrl: finalImg,
        oldPriceInfo: oldPriceInfo
      });

      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "تعديل بيانات أو صورة منتج",
        entityType: "product",
        entityId: payloadToUpdate.id,
        details: { name: payloadToUpdate.name },
      });

      setEditingProduct(null);
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (error) {
      console.error(error);
      setAlertMessage("حدث خطأ أثناء التحديث");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.price || isSubmitting)
      return;

    const atNumber = extractAtNumber(editingProduct.name);
    if (atNumber) {
      const existing = products.find(p => {
        if (p.id === editingProduct.id) return false;
        const existingAt = extractAtNumber(p.name || "");
        return existingAt === atNumber;
      });
      if (existing) {
        setDuplicateConfirm({
          atNumber,
          existingName: existing.name || '',
          type: 'update',
          payload: editingProduct
        });
        return;
      }
    }

    proceedUpdate(editingProduct);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ isBulk: false, ids: [id], name });
  };

  const executeDelete = async () => {
    if (!deleteConfirm || !deleteConfirm.ids) return;
    
    try {
      if (deleteConfirm.isBulk) {
        setProducts((prev) => prev.filter((prod) => !deleteConfirm.ids!.includes(prod.id!)));
        await Promise.all(deleteConfirm.ids.map(id => api.deleteProduct(id, user?.username)));
        await api.logAction({
          userId: user?.uid || "",
          userName: user?.username || "System",
          action: "حذف مجموعة منتجات",
          entityType: "product",
          details: { count: deleteConfirm.ids.length, ids: deleteConfirm.ids },
        });
        setSelectedIds(new Set());
      } else {
        const id = deleteConfirm.ids[0];
        setProducts((prev) => prev.filter((prod) => prod.id !== id));
        await api.deleteProduct(id, user?.username);
        await api.logAction({
          userId: user?.uid || "",
          userName: user?.username || "System",
          action: "حذف منتج",
          entityType: "product",
          entityId: id,
          details: { name: deleteConfirm.name },
        });
      }
      const updated = await api.getProducts();
      setProducts(updated);
      setDeleteConfirm(null);
    } catch (e: any) {
      console.error("Error deleting:", e);
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل الحذف: " + e.message);
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
      setAlertMessage("فشل تغيير حالة المنتج");
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
      setAlertMessage("فشل تغيير حالة إخفاء المنتج");
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

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ isBulk: true, ids: Array.from(selectedIds), count: selectedIds.size });
  };

  const handleBulkToggleHide = async (hide: boolean) => {
    if (selectedIds.size === 0) return;
    
    try {
      setProducts((prev) =>
        prev.map((prod) =>
          selectedIds.has(prod.id!) ? { ...prod, isHidden: hide } : prod
        )
      );
      
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => api.updateProduct(id, { isHidden: hide })));
      
      setSelectedIds(new Set());
    } catch (e: any) {
      console.error("Error bulk toggling hide:", e);
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل التحديث المجمع: " + e.message);
    }
  };

  const handleBulkToggleLock = async (lock: boolean) => {
    if (selectedIds.size === 0) return;
    
    try {
      setProducts((prev) =>
        prev.map((prod) =>
          selectedIds.has(prod.id!) ? { ...prod, isLocked: lock } : prod
        )
      );
      
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => api.updateProduct(id, { isLocked: lock })));
      
      setSelectedIds(new Set());
    } catch (e: any) {
      console.error("Error bulk toggling lock:", e);
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل التحديث المجمع: " + e.message);
    }
  };

  const handleBulkMoveCategory = async () => {
    if (selectedIds.size === 0 || !moveToCategoryId) return;
    setIsSubmitting(true);
    try {
      setProducts((prev) =>
        prev.map((prod) =>
          selectedIds.has(prod.id!) ? { ...prod, categoryId: moveToCategoryId, subcategoryId: moveToSubcategoryId } : prod
        )
      );
      
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => api.updateProduct(id, { categoryId: moveToCategoryId, subcategoryId: moveToSubcategoryId })));
      
      setSelectedIds(new Set());
      setIsMoveModalOpen(false);
      setMoveToCategoryId("");
      setMoveToSubcategoryId("");
    } catch (e: any) {
      console.error("Error bulk moving categories:", e);
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل نقل الأقسام: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkShare = async () => {
    if (selectedIds.size === 0) return;

    const productsToDownload = products.filter((p) => selectedIds.has(p.id!));
    const imagesWithData = productsToDownload.filter(
      (p) => p.finalImageUrl || p.imageUrl,
    );

    if (imagesWithData.length === 0) {
      setAlertMessage("لا توجد صور للمنتجات المحددة.");
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
        setAlertMessage("متصفحك لا يدعم مشاركة هذه الصور مباشرة. جرب تحميلها بدلاً من ذلك.");
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
      setAlertMessage("لا توجد صور للمنتجات المحددة.");
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

  const handleDownloadInactiveImages = async () => {
    const productsToDownload = products.filter((p) => p.isHidden && !p.isArchived);
    const imagesWithData = productsToDownload.filter(
      (p) => p.finalImageUrl || p.imageUrl,
    );

    if (imagesWithData.length === 0) {
      setAlertMessage("لا توجد صور للمنتجات الغير فعالة.");
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
  };

  const getCategoryName = (id: string) => {
    return categories.find((c) => c.id === id)?.name || "بدون قسم";
  };

  const { duplicatesSet, modelMap } = useMemo(() => {
    const dups = new Set<string>();
    const map = new Map<string, string[]>();
    products.forEach(p => {
      const key = p.modelNumber || p.productCode;
      if (key) {
        if (map.has(key)) {
           dups.add(key);
           map.get(key)!.push(p.id!);
        } else {
           map.set(key, [p.id!]);
        }
      }
    });
    return { duplicatesSet: dups, modelMap: map };
  }, [products]);

  const filteredProducts = useMemo(() => products.filter(p => {
    if (filterStatus === 'archived') {
      if (!p.isArchived) return false;
    } else if (filterStatus === 'locked') {
      if (!p.isLocked) return false;
    } else {
      if (p.isArchived) return false;
      if (p.isLocked) return false;
      
      if (filterStatus === 'inactive' && !p.isHidden) return false;
      if (filterStatus === 'active' && p.isHidden) return false;
      if (filterStatus === 'duplicates' && !duplicatesSet.has(p.modelNumber || p.productCode)) return false;
      if (filterStatus === null && !searchQuery) return false;
    }

    if (filterStatus !== 'archived' && filterStatus !== 'locked') {
      if (filterCategoryId && p.categoryId !== filterCategoryId) {
        return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim().replace(/[-_]/g, '');
      const matchesSearch = 
        (p.name && p.name.toLowerCase().replace(/[-_]/g, '').includes(q)) ||
        (p.productCode && p.productCode.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.modelNumber && p.modelNumber.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.barcode && p.barcode.toLowerCase().replace(/[-_]/g, '').startsWith(q));
      if (!matchesSearch) return false;
    }

    if (searchDate) {
      const productDateStr = new Date(p.createdAt || 0).toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
      if (productDateStr !== searchDate) return false;
    }

    return true;
  }), [products, filterCategoryId, searchQuery, searchDate, filterStatus, duplicatesSet]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = useMemo(() => filteredProducts.slice(startIndex, startIndex + itemsPerPage), [filteredProducts, startIndex, itemsPerPage]);

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
                  handleUsdPriceChange(Number(e.target.value), false)
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
                  handleIqdPriceChange(Number(e.target.value), false)
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
                onChange={(e) => handlePackagingChange(e.target.value, false)}
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
              />
            </div>
            <div className="flex items-center gap-2 mt-2 md:col-span-2">
              <label className="text-sm text-white/80 select-none flex-1">
                تشغيل التكسير التلقائي (تقسيم سعر القطعة على 12 دائماً)
              </label>
              <select
                value={(newProduct.forceStandardCrush ?? true) ? "yes" : "no"}
                onChange={(e) => handleForceStandardCrushChange(e.target.value === "yes", false)}
                className="bg-white border-2 border-brq-royal rounded-lg px-3 py-1.5 text-sm font-bold focus:border-brq-gold outline-none text-black w-24 shadow-sm"
              >
                <option value="no">لا</option>
                <option value="yes">نعم</option>
              </select>
            </div>
            {!(newProduct.forceStandardCrush ?? true) && (
              <div className="md:col-span-2">
                <label className="text-xs text-white/50 block mb-1">
                  عدد القطع للتقسيم (بما أن التكسير التلقائي مغلق)
                </label>
                <input
                  type="number"
                  value={newProduct.piecesCount || ""}
                  onChange={(e) => handlePiecesCountChange(parseInt(e.target.value) || 1, false)}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
              </div>
            )}
            {newProduct.piecesCount ? (
              <div className="md:col-span-2 bg-white/5 p-3 rounded-lg border border-white/10 mt-2 text-center">
                <p className="text-xs text-white/50 mb-1">
                  سعر القطعة (بالدينار)
                </p>
                <p className="font-mono text-lg font-bold text-brq-gold">
                  {newProduct.piecePriceIqd?.toLocaleString("en-US")}{" "}
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
          <div className="flex gap-4 border-b border-white/10 pb-0 overflow-x-auto">
            <button
              onClick={() => setFilterStatus("all")}
              className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${filterStatus === "all" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}`}
            >
              الكل
            </button>
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
            <button
              onClick={() => setFilterStatus("duplicates")}
              className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${filterStatus === "duplicates" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}`}
            >
              المواد المكررة
            </button>
            <button
              onClick={() => setFilterStatus("locked")}
              className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${filterStatus === "locked" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}`}
            >
              المواد المقفلة
            </button>
          </div>

          <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden p-1">
            <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full bg-white border border-black rounded-lg pr-10 pl-4 py-2.5 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-brq-gold/50"
                    placeholder="بحث بالاسم، الكود..."
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="w-full bg-white border border-black rounded-lg px-4 py-2.5 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-brq-gold/50"
                    placeholder="بحث بالتاريخ..."
                  />
                </div>
                <div className="relative w-full sm:w-auto">
                  <select
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    className="appearance-none pl-8 pr-10 py-2.5 bg-white border-2 border-brq-royal rounded-lg text-sm font-bold text-black hover:bg-gray-50 transition-colors focus:outline-none focus:border-brq-gold shadow-sm"
                  >
                    <option value="">جميع الأقسام</option>
                    {categories.filter(c => !c.parentId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4 pointer-events-none" />
                </div>
              </div>

              {(selectedIds.size > 0 || filterStatus === 'inactive') && (
                <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1">
                  {selectedIds.size > 0 && (
                    <span className="text-sm font-bold text-white/80 whitespace-nowrap">
                      تم تحديد: {selectedIds.size}
                    </span>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm hover:bg-red-500/30 transition-colors font-bold whitespace-nowrap"
                    >
                      <Trash2 size={16} />
                      حذف
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => handleBulkToggleHide(false)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm hover:bg-green-500/30 transition-colors font-bold whitespace-nowrap"
                    >
                      <Eye size={16} />
                      تفعيل
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => handleBulkToggleHide(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-sm hover:bg-yellow-500/30 transition-colors font-bold whitespace-nowrap"
                    >
                      <EyeOff size={16} />
                      إخفاء
                    </button>
                  )}
                  {selectedIds.size > 0 && filterStatus !== 'locked' && (
                    <button
                      onClick={() => handleBulkToggleLock(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition-colors font-bold whitespace-nowrap"
                    >
                      <Lock size={16} />
                      نقل للمواد المقفلة
                    </button>
                  )}
                  {selectedIds.size > 0 && filterStatus === 'locked' && (
                    <button
                      onClick={() => handleBulkToggleLock(false)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition-colors font-bold whitespace-nowrap"
                    >
                      <Unlock size={16} />
                      استرجاع من المواد المقفلة
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => setIsMoveModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors font-bold whitespace-nowrap"
                    >
                      <FolderInput size={16} />
                      نقل الأقسام
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkShare}
                      disabled={downloadProgress !== null}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-500/30 transition-colors font-bold whitespace-nowrap"
                    >
                      <Share2 size={16} />
                      مشاركة الصور
                    </button>
                  )}
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkDownload}
                      disabled={downloadProgress !== null}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors font-bold whitespace-nowrap"
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
                  )}
                  {filterStatus === 'inactive' && (
                    <button
                      onClick={handleDownloadInactiveImages}
                      disabled={downloadProgress !== null}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition-colors font-bold whitespace-nowrap"
                    >
                      {downloadProgress ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      {downloadProgress
                        ? `جاري التحميل ${downloadProgress.progress}/${downloadProgress.total}`
                        : "تحميل الصور الغير فعالة"}
                    </button>
                  )}
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
              ) : loading ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-center p-8 space-y-6">
                  <Loader2 className="animate-spin text-brq-gold w-12 h-12 mb-4" />
                  <p className="text-white/50">جاري تحميل المنتجات...</p>
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
                    <th className="p-4 font-medium">التاريخ</th>
                    <th className="p-4 font-medium">المشاهدات</th>
                    <th className="p-4 font-medium rounded-tl-lg">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/90">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-white/50">
                        لا توجد منتجات مطابقة في هذا القسم
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p) => (
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
                          {filterStatus === 'duplicates' && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {modelMap.get(p.modelNumber || p.productCode)?.filter(id => id !== p.id).map(id => {
                                const dup = products.find(prod => prod.id === id);
                                return dup ? (
                                  <span key={id} className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap" title={`الكود: ${dup.productCode}`}>
                                    مكرر مع: {dup.productCode}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-xs bg-black/20">
                          <span className="px-2 py-1 rounded bg-brq-navy/50 border border-white/10">
                            {getCategoryName(p.categoryId)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-brq-gold">
                              {(p.price || 0).toLocaleString("en-US")} د.ع
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
                        <td className="p-4 text-xs text-white/70">
                          {p.createdAt ? formatDate(p.createdAt) : "-"}
                          {p.updatedAt && p.updatedAt !== p.createdAt && (
                            <div className="text-[10px] text-white/40 mt-1">
                              تحديث: {formatDate(p.updatedAt)}
                            </div>
                          )}
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
                              onClick={() => {
                                setSelectedIds(new Set([p.id!]));
                                handleBulkToggleLock(!p.isLocked);
                              }}
                              className="p-1.5 hover:bg-purple-500/20 text-purple-400 rounded transition-colors"
                              title={
                                p.isLocked
                                  ? "استرجاع من المواد المقفلة"
                                  : "نقل للمواد المقفلة"
                              }
                            >
                              {p.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
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
                    ))
                  )}
                </tbody>
              </table>
              )}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && filterStatus !== null && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/20">
                <p className="text-sm text-white/50">
                  عرض {startIndex + 1} إلى {Math.min(startIndex + itemsPerPage, filteredProducts.length)} من أصل {filteredProducts.length} منتج
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <span className="text-sm text-white font-medium px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>
            )}
            
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
            
            <div className="flex gap-4 mb-4 text-xs text-white/50 bg-black/20 p-3 rounded-lg border border-white/5">
              <div className="flex-1">
                <span className="block opacity-60 mb-1">تاريخ نزول المنتج:</span>
                <span className="font-mono text-white/90">
                  {editingProduct.createdAt ? formatDateTime(editingProduct.createdAt) : 'غير متوفر'}
                </span>
              </div>
              <div className="flex-1 border-r border-white/10 pr-4">
                <span className="block opacity-60 mb-1">تاريخ اخر تحديث:</span>
                <span className="font-mono text-white/90">
                  {editingProduct.updatedAt ? formatDateTime(editingProduct.updatedAt) : (editingProduct.createdAt ? formatDateTime(editingProduct.createdAt) : 'غير متوفر')}
                </span>
              </div>
            </div>
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
                    handleUsdPriceChange(Number(e.target.value), true)
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
                    handleIqdPriceChange(Number(e.target.value), true)
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
                  onChange={(e) => handlePackagingChange(e.target.value, true)}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
              </div>
              <div className="flex items-center gap-2 mt-2 md:col-span-2">
                <label className="text-sm text-white/80 select-none flex-1">
                  تشغيل التكسير التلقائي (تقسيم سعر القطعة على 12 دائماً)
                </label>
                <select
                  value={(editingProduct.forceStandardCrush ?? true) ? "yes" : "no"}
                  onChange={(e) => handleForceStandardCrushChange(e.target.value === "yes", true)}
                  className="bg-white border-2 border-brq-royal rounded-lg px-3 py-1.5 text-sm font-bold focus:border-brq-gold outline-none text-black w-24 shadow-sm"
                >
                  <option value="no">لا</option>
                  <option value="yes">نعم</option>
                </select>
              </div>
              {!(editingProduct.forceStandardCrush ?? true) && (
                <div className="md:col-span-2">
                  <label className="text-xs text-white/50 block mb-1">
                    عدد القطع للتقسيم (بما أن التكسير التلقائي مغلق)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.piecesCount || ""}
                    onChange={(e) => handlePiecesCountChange(parseInt(e.target.value) || 1, true)}
                    className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                  />
                </div>
              )}
              {editingProduct.piecesCount ? (
                <div className="md:col-span-2 bg-white/5 p-3 rounded-lg border border-white/10 mt-2 text-center">
                  <p className="text-xs text-white/50 mb-1">
                    سعر القطعة (بالدينار)
                  </p>
                  <p className="font-mono text-lg font-bold text-brq-gold">
                    {editingProduct.piecePriceIqd?.toLocaleString("en-US")}{" "}
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

      
      {/* Duplicate AT Number Modal */}
      <AnimatePresence>
        {duplicateConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDuplicateConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white border border-brq-navy rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden"
            >
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 font-mono">
                الموديل ({duplicateConfirm.atNumber}) موجود
              </h3>
              <p className="text-gray-600 mb-6 text-sm">
                هذا الات نمبر موجود مسبقاً باسم:
                <br />
                <span className="font-bold text-gray-900">{duplicateConfirm.existingName}</span>
                <br /><br />
                هل تريد الاستمرار بنشر هذا الموديل على أي حال؟
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDuplicateConfirm(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  إلغاء النشر
                </button>
                <button
                  onClick={() => {
                    if (duplicateConfirm.type === 'create') {
                      proceedCreate(duplicateConfirm.payload);
                    } else {
                      proceedUpdate(duplicateConfirm.payload);
                    }
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors"
                >
                  نعم، أكمل النشر
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setDeleteConfirm(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white border-2 border-brq-royal rounded-2xl p-8 shadow-[0_0_40px_rgba(30,94,255,0.2)] flex flex-col items-center text-center overflow-hidden"
            dir="rtl"
          >
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-brq-gold to-brq-royal"></div>
            <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-brq-gold flex items-center justify-center mb-6 shadow-inner">
              <Trash2 size={40} className="text-brq-royal" />
            </div>
            <h3 className="text-3xl font-black text-black mb-4 tracking-tight">
              تنبيه هام!
            </h3>
            <p className="text-black text-xl font-bold mb-8 leading-relaxed">
              {deleteConfirm.isBulk 
                ? `هل أنت متأكد من حذف (${deleteConfirm.count}) منتجات بشكل نهائي ولا يمكن التراجع؟` 
                : `هل أنت متأكد من حذف المنتج "${deleteConfirm.name}" بشكل نهائي ولا يمكن التراجع؟`}
            </p>
            
            <div className="flex gap-4 w-full">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-4 px-4 rounded-xl font-black text-lg text-white bg-black hover:bg-gray-800 transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 py-4 px-4 rounded-xl font-black text-lg text-white bg-brq-royal hover:opacity-90 border border-brq-gold transition-colors shadow-[0_4px_14px_0_rgba(30,94,255,0.39)]"
              >
                نعم، احذف الموديل
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {publishSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => {
              setPublishSuccess(false);
              setNewProduct({
                name: "",
                price: 0,
                dozenPriceUsd: 0,
                modelNumber: "",
                productCode: "",
                barcode: "",
                categoryId: "",
                subcategoryId: "",
                imageUrl: "",
                forceStandardCrush: true,
                isHidden: true,
              });
            }}
          />
          <div
            className="relative w-full max-w-sm bg-brq-card border border-brq-gold/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(212,175,55,0.15)] flex flex-col items-center text-center overflow-hidden"
            dir="rtl"
          >
            <div className="w-20 h-20 rounded-full bg-brq-gold/10 flex items-center justify-center mb-6 border border-brq-gold/20">
              <CheckCircle size={40} className="text-brq-gold" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              تم النشر بنجاح!
            </h3>
            <p className="text-white/70 mb-8">
              تم النشر بنجاح داخل التطبيق
            </p>
            <button
              onClick={() => {
                setPublishSuccess(false);
                setNewProduct({
                  name: "",
                  price: 0,
                  dozenPriceUsd: 0,
                  modelNumber: "",
                  productCode: "",
                  barcode: "",
                  categoryId: "",
                  subcategoryId: "",
                  imageUrl: "",
                  forceStandardCrush: true,
                  isHidden: true,
                });
              }}
              className="w-full py-3 px-4 rounded-xl font-bold text-black bg-brq-gold hover:bg-yellow-500 transition-colors"
            >
              فهمت
            </button>
          </div>
        </div>
      )}

      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[200] backdrop-blur-sm">
          <div className="bg-brq-card border border-brq-border rounded-xl p-6 max-w-sm w-full relative overflow-hidden" dir="rtl">
            <h3 className="text-xl font-bold text-white mb-4">نقل {selectedIds.size} منتجات</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  القسم الرئيسي <span className="text-red-500">*</span>
                </label>
                <select
                  value={moveToCategoryId}
                  onChange={(e) => {
                    setMoveToCategoryId(e.target.value);
                    setMoveToSubcategoryId("");
                  }}
                  className="w-full bg-white border-2 border-brq-royal rounded-lg px-3 py-2 text-black font-bold focus:border-brq-gold focus:outline-none shadow-sm"
                  required
                >
                  <option value="">اختر القسم الرئيسي...</option>
                  {categories
                    .filter((c) => !c.parentId && !c.isHidden)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
              
              {moveToCategoryId && categories.some(c => c.parentId === moveToCategoryId && !c.isHidden) && (
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    القسم الفرعي
                  </label>
                  <select
                    value={moveToSubcategoryId}
                    onChange={(e) => setMoveToSubcategoryId(e.target.value)}
                    className="w-full bg-white border-2 border-brq-royal rounded-lg px-3 py-2 text-black font-bold focus:border-brq-gold focus:outline-none shadow-sm"
                  >
                    <option value="">بدون قسم فرعي (اختياري)</option>
                    {categories
                      .filter((c) => c.parentId === moveToCategoryId && !c.isHidden)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsMoveModalOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-all text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleBulkMoveCategory}
                disabled={!moveToCategoryId || isSubmitting}
                className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/50 rounded-lg transition-all font-bold text-sm disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "نقل"}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertMessage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[300] backdrop-blur-sm">
          <div className="bg-white border-2 border-brq-royal rounded-xl p-6 max-w-sm w-full relative overflow-hidden shadow-[0_0_40px_rgba(30,94,255,0.2)]" dir="rtl">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-brq-gold to-brq-royal"></div>
            <h3 className="text-xl font-bold text-black mb-3 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-brq-royal" />
              تنبيه
            </h3>
            <p className="text-black mb-6 leading-relaxed whitespace-pre-wrap font-medium">
              {alertMessage}
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setAlertMessage(null)}
                className="px-6 py-2 bg-brq-royal text-white border border-brq-gold rounded-lg transition-all font-bold text-sm shadow-[0_4px_14px_0_rgba(30,94,255,0.39)] hover:opacity-90"
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
