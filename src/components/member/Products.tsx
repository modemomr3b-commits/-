import { formatDateTime, formatDate } from '../../utils/time';
import { useParams, Link, useNavigate } from "react-router";
import { Image as ImageIcon, ChevronRight, Lock, Filter, Download, ShoppingCart, Layers, Share2, CheckSquare, Square, History, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { api } from "../../api";
import { supabase } from "../../supabase";
import { Product, Category } from "../../types";
import { useStore } from "../../store";
import OptimizedImage from "../OptimizedImage";
import { CategoryDownloadDialog } from "../shared/CategoryDownloadDialog";
import { ShareDialog } from "../shared/ShareDialog";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { DownloadModeDialog } from "../shared/DownloadModeDialog";
import { PriceHistoryViewer } from "./PriceHistoryViewer";
import ImageViewer from "../ImageViewer";

const MOCK_PRODUCTS: Product[] = [];

export default function Products() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart, updateQuantity, removeFromCart, cart, user, showToast } = useStore();
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string, alt: string } | null>(null);

  const [categoryName, setCategoryName] = useState("جميع المنتجات");
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number, total: number } | null>(null);
  const [downloadModeState, setDownloadModeState] = useState<{ isOpen: boolean; imagesWithData: any[] } | null>(null);
  const [readyToShareFiles, setReadyToShareFiles] = useState<File[] | null>(null);
  const [shareChunks, setShareChunks] = useState<File[][] | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const cats = await api.getCategories();
      setAllCategories(cats);
      
      let allProducts = [];
      if (categoryId) {
        allProducts = await api.getProductsByCategory(categoryId);
      } else {
        allProducts = await api.getProducts();
      }
      
      let fetchedProducts = allProducts.filter((p: any) => !p.isArchived && !p.isHidden && !p.isLocked);
      
      if (categoryId) {
        const cat = cats.find((c: any) => c.id === categoryId);
        setCategoryName(cat ? cat.name : `القسم ${categoryId}`);
        const subs = cats
          .filter((c: any) => c.parentId === categoryId && !c.isHidden)
          .sort((a: any, b: any) => a.order - b.order);
        setSubCategories(subs);
      }

      setProducts(fetchedProducts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let mounted = true;
    let fetchTimeout: any;
    const init = async () => {
       await fetchProducts();
       if (mounted) {
         setLoading(false);
         setInitialLoading(false);
       }
    };
    init();

    const channel = supabase
      .channel('member_products_view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(() => {
          if (mounted) fetchProducts();
        }, 1500);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(() => {
          if (mounted) fetchProducts();
        }, 1500);
      })
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(fetchTimeout);
      supabase.removeChannel(channel);
    };
  }, [categoryId]);

  
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(`scroll_${categoryId || 'all'}`, window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categoryId]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        const savedScroll = sessionStorage.getItem(`scroll_${categoryId || 'all'}`);
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
        }
      }, 0);
    }
  }, [loading, categoryId]);

  const handleAddToCart = (e: React.MouseEvent, p: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(p, 1);
  };

  const handleUpdateQuantity = (e: React.MouseEvent, p: Product, quantity: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity <= 0) {
      removeFromCart(p.id!);
    } else {
      updateQuantity(p.id!, quantity);
    }
  };

  const filteredProductsAll = useMemo(() => activeSub
    ? products.filter((p) => p.subcategoryId === activeSub)
    : products, [activeSub, products]);
  
  // Pagination logic
  const totalPages = Math.ceil(filteredProductsAll.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const filteredProducts = useMemo(() => filteredProductsAll.slice(startIndex, startIndex + itemsPerPage), [filteredProductsAll, startIndex, itemsPerPage]);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSub, categoryId]);
  
  // Pagination handled above
  
  

  

  const executeDownload = async (mode: 'gallery' | 'zip') => {
    if (!downloadModeState) return;
    const { imagesWithData } = downloadModeState;
    setDownloadModeState(null);
    setDownloadProgress({ progress: 0, total: imagesWithData.length });
    
    const imagesToDownload = imagesWithData
      .filter(p => p.finalImageUrl || p.imageUrl)
      .map(p => {
        const imgUrl = p.finalImageUrl || p.imageUrl;
        const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
        const safeName = (p.productCode || p.name || 'product').replace(/[\/\?<>\\:\*\|":]/g, '-');
        const filename = `${safeName}.${ext}`;
        
        let mainCatName = 'عام';
        if (p.categoryId) {
          const mainCat = allCategories.find(c => c.id === p.categoryId);
          if (mainCat) mainCatName = mainCat.name;
        }
        
        const getProductType = (name: string) => {
          if (!name) return 'أخرى';
          const lowerName = name.toLowerCase();
          if (lowerName.includes('رياض')) return 'رياضة';
          if (lowerName.includes('شحاط')) return 'شحاطة';
          if (lowerName.includes('صندل') || lowerName.includes('صنادل')) return 'صندل';
          if (lowerName.includes('سليبر')) return 'سليبر';
          if (lowerName.includes('حذاء') || lowerName.includes('احذية') || lowerName.includes('أحذية')) return 'أحذية';
          if (lowerName.includes('لاستيك')) return 'لاستيك';
          if (lowerName.includes('ايفا') || lowerName.includes('إيفا')) return 'ايفا';
          if (lowerName.includes('قندر') || lowerName.includes('قنادر')) return 'قنادر';
          if (lowerName.includes('بوت') || lowerName.includes('جزم') || lowerName.includes('بسطال')) return 'بوت وجزم';
          if (lowerName.includes('نص')) return 'نصف';
          return 'أخرى';
        };
        const productType = getProductType(p.name);
        const folderName = `${mainCatName}/${productType}`;
        return { url: imgUrl!, filename, folderName };
      });
      
    if (mode === 'gallery') {
      const { fetchImageFiles } = await import('../../utils/download');
      const files = await fetchImageFiles(imagesToDownload, (progress, total) => {
        setDownloadProgress({ progress, total });
      });
      
      if (files.length === 0) {
         showToast("حدث خطأ أثناء تحميل الصور", "error");
         setDownloadProgress(null);
         return;
      }
      
      setDownloadProgress(null);
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS && files.length > 10) {
         const chunks = [];
         for (let i = 0; i < files.length; i += 10) {
            chunks.push(files.slice(i, i + 10));
         }
         setShareChunks(chunks);
      } else {
         setReadyToShareFiles(files);
      }
    } else {
      const { downloadAsZip } = await import('../../utils/zipDownload');
      
      const catName = categoryId 
        ? allCategories.find(c => c.id === categoryId)?.name || "category"
        : "category";
      const success = await downloadAsZip(catName, imagesToDownload, (progress, total) => {
        setDownloadProgress({ progress, total });
      });
      if (success) {
         showToast("تم تحميل الملف المضغوط بنجاح", "success");
      } else {
         showToast("حدث خطأ أثناء التحميل", "error");
      }
      setDownloadProgress(null);
    }
  };

const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleToggleLock = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await api.updateProduct(product.id!, { isLocked: true });
      showToast("تم النقل للمواد المقفلة بنجاح", "success");
      
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err) {
      console.error("Error locking product:", err);
      showToast("حدث خطأ أثناء نقل المنتج للمواد المقفلة", "error");
    }
  };

  const handleShareSelected = async () => {
    if (selectedIds.size === 0) return;

    const productsToShare = products.filter((p) => selectedIds.has(p.id!));
    const imagesWithData = productsToShare.filter((p) => p.finalImageUrl || p.imageUrl);

    if (imagesWithData.length === 0) {
      showToast("لا توجد صور للمنتجات المحددة.", "error");
      return;
    }

    showToast("بدأ التنزيل...", "loading");
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
          setIsSelectionMode(false);
          showToast("تمت المشاركة بنجاح", "success");
        } catch (error) {
          console.error('Error sharing files', error);
          showToast("حدث خطأ أثناء محاولة المشاركة.", "error");
        }
      } else {
        showToast("متصفحك لا يدعم مشاركة هذه الصور مباشرة.", "error");
      }
    }
  };

  const handleShareSingle = async (e: React.MouseEvent, p: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    const imgUrl = p.finalImageUrl || p.imageUrl;
    if (!imgUrl) {
      showToast("لا توجد صورة لهذا المنتج.", "error");
      return;
    }

    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const ext = blob.type.split("/")[1] || "jpg";
      const safeName = (p.productCode || p.name || "product").replace(/[\/\?<>\\:\*\|":]/g, '-');
      const filename = `${safeName}.${ext}`;
      const file = new File([blob], filename, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: p.name,
        });
        showToast("تمت المشاركة بنجاح", "success");
      } else {
        showToast("متصفحك لا يدعم مشاركة هذه الصورة مباشرة.", "error");
      }
    } catch (error) {
      console.error('Error sharing file', error);
      showToast("حدث خطأ أثناء محاولة المشاركة.", "error");
    }
  };

  const handleDownloadSingle = async (e: React.MouseEvent, p: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    const imgUrl = p.finalImageUrl || p.imageUrl;
    if (!imgUrl) {
      showToast("لا توجد صورة لهذا المنتج.", "error");
      return;
    }

    setDownloadingId(p.id!);
    showToast("بدأ التنزيل...", "loading");
    try {
      const ext = imgUrl.split('.').pop()?.split('?')[0] || "jpg";
      const safeName = (p.productCode || p.name || "product").replace(/[\/\?<>\\:\*\|":]/g, '-');
      const filename = `${safeName}.${ext}`;
      
      const { downloadImages } = await import('../../utils/download');
      const success = await downloadImages([{ url: imgUrl, filename }]);
      
      if (success) {
        showToast("تم الحفظ بنجاح", "success");
      } else {
        showToast("حدث خطأ أثناء التنزيل.", "error");
      }
    } catch (error) {
      console.error('Error downloading file', error);
      showToast("حدث خطأ أثناء التنزيل.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex flex-col bg-brq-black min-h-[calc(100vh-60px)]">
      <div className="glass-panel sticky top-0 z-40 p-4 border-b border-brq-gold/20 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-white/5 rounded-lg border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <div>
              <h2 className="font-bold text-sm text-brq-gold">
                {categoryName}
              </h2>
              <p className="text-[10px] text-white/50">
                {filteredProducts.length} منتجات القائمة
              </p>
            </div>
          </div>
        </div>

        {subCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
            <button
              onClick={() => setActiveSub(null)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs transition-colors border ${!activeSub ? "bg-brq-gold text-black font-bold border-brq-gold" : "bg-black/40 text-white/70 border-white/10 hover:border-brq-gold/50"}`}
            >
              الكل
            </button>
            {subCategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveSub(sub.id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs transition-colors border ${activeSub === sub.id ? "bg-brq-gold text-black font-bold border-brq-gold" : "bg-black/40 text-white/70 border-white/10 hover:border-brq-gold/50"}`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 w-full">
          <button 
            disabled={downloadProgress !== null}
            onClick={async () => {
              if (filteredProducts.length === 0) {
                 showToast("لا توجد منتجات بصور لتحميلها", "error");
                 return;
              }
              const imagesWithData = filteredProducts.filter(p => p.finalImageUrl || p.imageUrl);
              if (imagesWithData.length === 0) {
                 showToast("لا توجد صور للمنتجات لتحميلها.", "error");
                 return;
              }
              
              setDownloadModeState({
                isOpen: true,
                imagesWithData
              });
            }}
             className="flex-[2] py-2 bg-brq-navy rounded-lg border border-brq-royal/50 flex gap-2 items-center justify-center text-xs text-brq-gold hover:bg-brq-navy/80 transition-colors disabled:opacity-50"
          >
            <Download size={14} /> {downloadProgress ? `جاري التحميل ${downloadProgress.progress}/${downloadProgress.total}` : 'حفظ القسم'}
          </button>
          
          <button 
            onClick={() => setIsDownloadDialogOpen(true)}
            className="flex-[2] py-2 bg-brq-gold/20 rounded-lg border border-brq-gold/50 flex gap-2 items-center justify-center text-xs text-brq-gold hover:bg-brq-gold/30 transition-colors"
          >
            <Layers size={14} /> تحميل كل الصور
          </button>

          <button 
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={`flex-1 py-2 rounded-lg border text-xs flex gap-2 items-center justify-center transition-colors ${
              isSelectionMode 
                ? "bg-blue-500/20 text-blue-400 border-blue-500/50" 
                : "bg-white/5 text-white border-white/10 hover:bg-white/10"
            }`}
          >
            <CheckSquare size={14} /> تحديد
          </button>
          
          <button className="flex-1 py-2 bg-white/5 rounded-lg border border-white/10 text-white flex gap-2 items-center justify-center text-xs hover:bg-white/10 transition-colors">
            <Filter size={14} /> تصفية
          </button>
        </div>
      </div>

      {downloadModeState && (
        <DownloadModeDialog
          isOpen={downloadModeState.isOpen}
          imageCount={downloadModeState.imagesWithData.length}
          onSelectOption={executeDownload}
          onCancel={() => setDownloadModeState(null)}
        />
      )}
      {isDownloadDialogOpen && (
        <CategoryDownloadDialog 
          categories={allCategories}
          products={products}
          onClose={() => setIsDownloadDialogOpen(false)}
        />
      )}
      <ShareDialog
        readyToShareFiles={readyToShareFiles}
        shareChunks={shareChunks}
        onClose={() => {
           setReadyToShareFiles(null);
           setShareChunks(null);
        }}
        showToast={showToast}
      />
      {initialLoading ? (
        <div className="flex-1 flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-white/50 p-8 text-center h-64">
          <Layers size={48} className="mb-4 opacity-20" />
          <p>لا توجد منتجات في هذا القسم</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-24">
          <div className="grid grid-cols-2 gap-2">
            {filteredProducts.map((product) => (
              <div
                key={product.id} 
                className={`bg-[#0B1120] rounded-xl border ${selectedIds.has(product.id!) ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-white/10'} overflow-hidden relative flex flex-col h-full`}
              >
                <Link to={`/products/${product.id}`} className="block relative">
                  {isSelectionMode && (
                    <div 
                      className="absolute top-2 right-2 z-20"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSelection(e, product.id!);
                      }}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${
                        selectedIds.has(product.id!) 
                          ? 'bg-blue-500 border-blue-500 text-white' 
                          : 'bg-black/50 border-white/30 text-transparent hover:border-white/60'
                      }`}>
                        <CheckSquare size={16} />
                      </div>
                    </div>
                  )}

                  <div className="aspect-[4/5] relative bg-white/5">
                    {product.finalImageUrl ? (
                      <OptimizedImage
                        src={product.finalImageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                         <ImageIcon size={32} />
                      </div>
                    )}
                    
                    <div className="absolute top-2 left-2 flex flex-col gap-2 z-10" onClick={(e) => e.preventDefault()}>
                      <button 
                         onClick={(e) => handleShareSingle(e, product)}
                         className="w-8 h-8 rounded-md bg-black/50 border border-white/20 hover:bg-white/20 text-white transition-colors flex items-center justify-center backdrop-blur-sm shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                         title="مشاركة"
                      >
                         <Share2 size={16} />
                      </button>
                      <button 
                         onClick={(e) => handleDownloadSingle(e, product)}
                         className="w-8 h-8 rounded-md bg-black/50 border border-white/20 hover:bg-white/20 text-white transition-colors flex items-center justify-center backdrop-blur-sm shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                         title="تحميل"
                      >
                         {downloadingId === product.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={(e) => handleToggleLock(e, product)}
                          className="w-8 h-8 rounded-md bg-black/50 border border-white/20 hover:border-purple-500 hover:text-purple-400 text-white/70 transition-colors flex items-center justify-center backdrop-blur-sm shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                          title="نقل للمواد المقفلة"
                        >
                          <Lock size={16} />
                        </button>
                      )}
                    </div>

                    <div className="absolute top-2 right-2 bg-white/90 text-black text-[10px] font-bold p-1 px-2 rounded text-center leading-tight shadow-md max-w-[60%]">
                      <div className="truncate">{product.productCode}</div>
                      <div className="truncate">{product.packaging || '18 PRS'}</div>
                      <div className="truncate">{product.modelNumber || '25-30'}</div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-[#D4AF37]/90 backdrop-blur text-black flex items-center justify-between px-1.5 py-1 text-[8px] font-bold">
                      <div className="flex flex-col flex-1">
                         <span className="truncate">التعبئة: {product.piecesCount || 12}</span>
                         <span className="truncate">سعر المفرد: {product.price?.toLocaleString() || '---'} د.ع</span>
                      </div>
                      <div className="text-center font-black text-[10px] text-black/80 px-1">BRQ</div>
                      <div className="flex flex-col flex-1 items-end text-left">
                         <span className="truncate">الكود: {product.productCode}</span>
                         <span className="truncate">الجملة: {(product.price && product.piecesCount) ? (product.price * product.piecesCount).toLocaleString() : '---'} د.ع</span>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="p-3 flex-1 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="bg-white/10 px-2 py-1 rounded text-white/70 text-xs font-mono shrink-0">{product.productCode}</div>
                    <h3 className="font-bold text-white text-sm text-right leading-tight line-clamp-2" style={{ wordBreak: 'break-word' }}>{product.name}</h3>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="flex flex-col shrink-0">
                      <span className="text-[10px] text-white/50 mb-0.5">الكمية/القطع</span>
                      <span className="text-white font-bold">{product.piecesCount || '---'}</span>
                    </div>
                    <div className="flex flex-col text-right truncate">
                      <span className="text-[10px] text-white/50 mb-0.5">د.ع / الجملة</span>
                      <span className="text-brq-gold font-bold text-lg truncate">{(product.price && product.piecesCount) ? (product.price * product.piecesCount).toLocaleString() : '---'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-white/10 pt-2 mt-auto">
                    <div className="flex flex-col shrink-0">
                      <span className="text-[9px] text-white/50 mb-0.5">آخر تحديث</span>
                      <span className="text-[10px] text-white/70">{formatDate(product.updatedAt || product.createdAt)}</span>
                    </div>
                    <div className="flex flex-col text-right shrink-0">
                      <span className="text-[9px] text-white/50 mb-0.5">تاريخ النزول</span>
                      <span className="text-[10px] text-white/70">{formatDate(product.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="px-3 pb-3 mt-auto">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addToCart(product, 1);
                      showToast("تم إضافة المنتج للسلة", "success");
                    }}
                    className="w-full py-2 bg-[#1E3A8A] hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-bold transition-colors shadow-[0_4px_10px_rgba(30,58,138,0.4)] text-sm"
                  >
                    <ShoppingCart size={16} />
                    <span>إضافة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
