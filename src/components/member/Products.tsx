import { formatDateTime, formatDate } from '../../utils/time';
import { useParams, Link, useNavigate } from "react-router";
import { ChevronRight, Filter, Download, ShoppingCart, Layers, Share2, CheckSquare, Square, History, Loader2, Search, Lock, LayoutGrid, Columns, Check, ZoomIn, ZoomOut } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { compressImage } from '../../utils/compressImage';
import { api } from "../../api";
import { supabase } from "../../supabase";
import { filterProductsBySearch, isProductRestrictedFromSearch } from '../../utils/search';
import { Product, Category } from "../../types";
import { useStore } from "../../store";
import OptimizedImage from "../OptimizedImage";
import { CategoryDownloadDialog } from "../shared/CategoryDownloadDialog";
import { DownloadChoiceDialog } from "../shared/DownloadChoiceDialog";
import { PriceHistoryViewer } from "./PriceHistoryViewer";
import ImageViewer from "../ImageViewer";
import { shuffleProductsForUser } from '../../utils/shuffle';
import { localCache } from "../../utils/localCache";
import { isWafaaUser } from "../../utils/wafaaHelper";
import { useGridZoom } from '../../hooks/useGridZoom';
import ZoomHUD from '../ui/ZoomHUD';

const MOCK_PRODUCTS: Product[] = [];

export default function Products() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [allStoreProducts, setAllStoreProducts] = useState<Product[]>([]);
  
  // Initialize state from return storage if matching category
  const [searchTerm, setSearchTerm] = useState(() => {
    const returnCat = sessionStorage.getItem('return_category');
    if (returnCat === (categoryId || 'all')) {
      return sessionStorage.getItem('return_searchTerm') || "";
    }
    return "";
  });
  
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Grid Column & Zoom management with Ctrl + Mouse Wheel support
  const {
    columns: gridColumns,
    setColumns: setGridColumns,
    zoomIn,
    zoomOut,
    resetZoom,
    showHUD,
    zoomLabel,
    gridClass,
    canZoomIn,
    canZoomOut
  } = useGridZoom({
    storageKey: 'brq_catalog_cols',
    minCols: 1,
    maxCols: 6
  });

  const [isViewModeOpen, setIsViewModeOpen] = useState(false);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  
  const [activeSub, setActiveSub] = useState<string | null>(() => {
    const returnCat = sessionStorage.getItem('return_category');
    if (returnCat === (categoryId || 'all')) {
      return sessionStorage.getItem('return_sub');
    }
    return null;
  });
  
  const [loading, setLoading] = useState(true);
  const { addToCart, updateQuantity, removeFromCart, cart, user, showToast } = useStore();
  const isAdminOrSales = user && (user.role === 'admin' || user.role === 'sales');
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string, alt: string } | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  const [categoryName, setCategoryName] = useState("جميع المنتجات");
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number, total: number } | null>(null);
  const [downloadChoiceDialog, setDownloadChoiceDialog] = useState<{ isOpen: boolean; message: string; onDownloadStudio: () => void; onDownloadZip: () => void; onDownloadAllElastic?: () => void } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(() => {
    const returnCat = sessionStorage.getItem('return_category');
    if (returnCat === (categoryId || 'all')) {
      const savedPage = sessionStorage.getItem('return_page');
      return savedPage ? parseInt(savedPage, 10) : 1;
    }
    return 1;
  });

  const [displayCountPerPage, setDisplayCountPerPage] = useState(() => {
    const returnCat = sessionStorage.getItem('return_category');
    if (returnCat === (categoryId || 'all')) {
      const savedCount = sessionStorage.getItem('return_display_count');
      return savedCount ? parseInt(savedCount, 10) : 50;
    }
    return 50;
  });
  const batchSize = 50; // 50 items per batch within the page
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  const maxShareLimit = isAndroid ? 10 : 100;
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);

  // Reset displayCountPerPage when search term, subcategory or currentPage changes
  useEffect(() => {
    setDisplayCountPerPage(50);
  }, [activeSub, searchTerm, currentPage]);

  // Infinite scroll listener to automatically load next 50 products on current page when scrolling down (up to 100 per page)
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 600) {
        setDisplayCountPerPage(prev => {
          if (prev < 100) {
            return Math.min(prev + batchSize, 100);
          }
          return prev;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [readyFilesToShare, setReadyFilesToShare] = useState<File[] | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    setReadyFilesToShare(null);
  }, [selectedIds]);

  const fetchProducts = async (forceDirect = false) => {
    try {
      const cats = await api.getCategories();
      setAllCategories(cats);
      
      const allStore = forceDirect ? await api.getProductsDirect() : await api.getProducts();
      const activeStore: Product[] = allStore.filter((p: any) => !p.isArchived && !p.isHidden && !p.isLocked && !p.isDeleted && !isProductRestrictedFromSearch(p, cats));
      const shuffledStore = shuffleProductsForUser<Product>(activeStore);
      setAllStoreProducts(shuffledStore);
      
      let allProducts = [];
      if (categoryId) {
        allProducts = forceDirect ? await api.getProductsByCategoryDirect(categoryId) : await api.getProductsByCategory(categoryId);
      } else {
        allProducts = activeStore;
      }
      
      let fetchedProducts: Product[] = allProducts.filter((p: any) => !p.isArchived && !p.isHidden && !p.isLocked && !p.isDeleted && !isProductRestrictedFromSearch(p, cats));
      fetchedProducts = shuffleProductsForUser<Product>(fetchedProducts);
      
      if (categoryId) {
        const cat = cats.find((c: any) => c.id === categoryId);
        setCategoryName(cat ? cat.name : `القسم ${categoryId}`);
        const subs = cats
          .filter((c: any) => c.parentId === categoryId && !c.isHidden)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setSubCategories(subs);
      }

      setProducts(fetchedProducts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Instant local cache restoration so the user experiences NO wait time
    const cacheKey = categoryId ? `products_cat_${categoryId}` : 'all_products';
    Promise.all([
      localCache.get<any[]>('all_categories'),
      localCache.get<any[]>(cacheKey)
    ]).then(([cachedCats, cachedProds]) => {
      if (!mounted) return;
      if (cachedCats && cachedCats.length > 0) {
        setAllCategories(cachedCats);
        if (categoryId) {
          const cat = cachedCats.find((c: any) => c.id === categoryId);
          if (cat) setCategoryName(cat.name);
          const subs = cachedCats
            .filter((c: any) => c.parentId === categoryId && !c.isHidden)
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          setSubCategories(subs);
        }
      }
      if (cachedProds && cachedProds.length > 0) {
        let fetchedProducts = cachedProds.filter((p: any) => !p.isArchived && !p.isHidden && !p.isLocked && !p.isDeleted);
        setProducts(shuffleProductsForUser(fetchedProducts));
        setLoading(false);
        setInitialLoading(false);
      }
    });

    const init = async () => {
      try {
        await fetchProducts();
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    };

    init();

    // Instant local BroadcastChannel synchronization across tabs
    let fetchTimeout: any = null;
    const scheduleFetch = (delay = 400) => {
      clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => {
        if (mounted) fetchProducts(true);
      }, delay);
    };

    let bc: any = null;
    try {
      if (typeof window !== 'undefined' && (window as any).BroadcastChannel) {
        bc = new (window as any).BroadcastChannel('brq_products_sync');
        bc.onmessage = () => {
          scheduleFetch(400);
        };
      }
    } catch {}

    const channel = supabase
      .channel('member_products_view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        scheduleFetch(1200);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        scheduleFetch(1200);
      })
      .on('broadcast', { event: 'bulk_updated' }, () => {
        scheduleFetch(600);
      })
      .on('broadcast', { event: 'product_changed' }, () => {
        scheduleFetch(600);
      })
      .on('broadcast', { event: 'product_created' }, () => {
        scheduleFetch(600);
      })
      .on('broadcast', { event: 'bulk_deleted' }, () => {
        scheduleFetch(600);
      })
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(fetchTimeout);
      supabase.removeChannel(channel);
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, [categoryId]);

  
  // Handle scroll and state restoration
  useEffect(() => {
    // Scroll to top immediately when category changes, unless returning from detail
    const returnCat = sessionStorage.getItem('return_category');
    if (returnCat !== (categoryId || 'all')) {
      window.scrollTo(0, 0);
      setCurrentPage(1);
      setDisplayCountPerPage(50);
      setActiveSub(null);
      setSearchTerm('');
    }
  }, [categoryId]);

  useEffect(() => {
    if (!loading && products.length > 0) {
      const returnCat = sessionStorage.getItem('return_category');
      if (returnCat === (categoryId || 'all')) {
        const savedPage = sessionStorage.getItem('return_page');
        if (savedPage) setCurrentPage(parseInt(savedPage, 10));

        const savedCount = sessionStorage.getItem('return_display_count');
        if (savedCount) setDisplayCountPerPage(parseInt(savedCount, 10));
        
        const savedSub = sessionStorage.getItem('return_sub');
        if (savedSub) setActiveSub(savedSub);
        
        const savedSearch = sessionStorage.getItem('return_searchTerm');
        if (savedSearch) setSearchTerm(savedSearch);

        const savedScroll = sessionStorage.getItem('return_scroll');
        if (savedScroll) {
          const targetY = parseInt(savedScroll, 10);
          // Restore immediately
          window.scrollTo(0, targetY);
          
          // Re-verify after layout settling
          requestAnimationFrame(() => {
            window.scrollTo(0, targetY);
          });
          const timer = setTimeout(() => {
            window.scrollTo(0, targetY);
          }, 150);
          
          // Clear return session keys after restoring
          sessionStorage.removeItem('return_category');
          sessionStorage.removeItem('return_searchTerm');
          sessionStorage.removeItem('return_page');
          sessionStorage.removeItem('return_display_count');
          sessionStorage.removeItem('return_scroll');
          sessionStorage.removeItem('return_sub');
          
          return () => clearTimeout(timer);
        }
      }
    }
  }, [loading, categoryId, products.length]);

  // Hardware back button support for overlays
  const isAnyOverlayOpen = fullscreenIndex !== null || fullscreenImage !== null || historyProduct !== null || isFilterModalOpen || downloadChoiceDialog !== null;
  const prevOverlayState = useRef(false);

  useEffect(() => {
    if (isAnyOverlayOpen && !prevOverlayState.current) {
      // Overlay just opened -> Push a dummy state
      window.history.pushState({ overlay: true }, '');
      prevOverlayState.current = true;
    } else if (!isAnyOverlayOpen && prevOverlayState.current) {
      // Overlay just closed programmatically (e.g. by Close button)
      // Pop the dummy state if it's there
      if (window.history.state && window.history.state.overlay) {
        window.history.back();
      }
      prevOverlayState.current = false;
    }
  }, [isAnyOverlayOpen]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (prevOverlayState.current) {
        // Hardware back button pressed. The dummy state is already popped by the browser.
        // Close all overlays.
        setFullscreenIndex(null);
        setFullscreenImage(null);
        setHistoryProduct(null);
        setIsFilterModalOpen(false);
        setDownloadChoiceDialog(null);
        prevOverlayState.current = false;
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const filteredProductsAll = useMemo(() => {
    const isActive = (p: any) =>
      !p.isArchived &&
      !p.isHidden &&
      !p.isLocked &&
      !p.isDeleted &&
      !isProductRestrictedFromSearch(p, allCategories);

    // Only active products (never archived, hidden, locked, or in restricted categories)
    if (searchTerm && searchTerm.trim()) {
      const source = (allStoreProducts.length > 0 ? allStoreProducts : products).filter(isActive);
      let result = filterProductsBySearch(source, searchTerm, allCategories);
      if (activeSub) {
        result = result.filter((p) => p.subcategoryId === activeSub || (p.categoryId === activeSub && !p.subcategoryId));
      }
      return result.filter(isActive);
    }

    // Normal browsing without search term: show category-filtered and regular active products ONLY
    let result = products.filter(isActive);
    if (activeSub) {
      result = result.filter((p) => p.subcategoryId === activeSub || (p.categoryId === activeSub && !p.subcategoryId));
    }
    const cleanList = result.filter(isActive);
    
    // Distribute products across pages with pageSize = 100
    // so newly added or activated products are spread evenly across Page 1, Page 2, Page 3, etc.
    return shuffleProductsForUser(cleanList, 100, `member_${categoryId || 'all'}_${activeSub || 'none'}`);
  }, [activeSub, products, allStoreProducts, searchTerm, allCategories, categoryId]);
  
  // Pagination & infinite loading per page sliced products
  const totalPages = Math.ceil(filteredProductsAll.length / 100);
  const startIndex = (currentPage - 1) * 100;
  const pageProductsAll = useMemo(() => {
    return filteredProductsAll.slice(startIndex, startIndex + 100);
  }, [filteredProductsAll, startIndex]);

  const filteredProducts = useMemo(() => {
    return pageProductsAll.slice(0, displayCountPerPage);
  }, [pageProductsAll, displayCountPerPage]);


  
  // Pagination handled above
  
  

  

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= 100) {
        showToast("الحد الأقصى هو 100 منتج", "error");
        return;
      }
      next.add(id);
    }
    setSelectedIds(next);
  };

  const executeShare = async (filesToShare: File[], isPartial: boolean = false) => {
    try {
      if (navigator.canShare && !navigator.canShare({ files: filesToShare })) {
         console.warn("navigator.canShare returned false");
      }
      await navigator.share({ files: filesToShare });
      
      if (!isPartial) {
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        setReadyFilesToShare(null);
      }
    } catch (error: any) {
      console.error('Error sharing files:', error);
      if (error.name !== 'AbortError') {
         showToast("فشلت المشاركة. قد يكون السبب رفض التطبيق المختار أو تجاوز الحد المسموح.", "error");
      }
    }
  };

  const handleShareSelected = async () => {
    if (selectedIds.size === 0) return;
    
    if (readyFilesToShare && readyFilesToShare.length > 0) {
      if (readyFilesToShare.length <= maxShareLimit) {
        executeShare(readyFilesToShare, false);
      }
      return;
    }

    const productsToShare = products.filter((p) => selectedIds.has(p.id!));
    const imagesWithData = productsToShare.filter((p) => p.finalImageUrl || p.imageUrl);

    if (imagesWithData.length === 0) {
      showToast("لا توجد صور للمنتجات المحددة.", "error");
      return;
    }

    showToast("جاري التجهيز...", "loading");
    setDownloadProgress({ progress: 0, total: imagesWithData.length });
    let completed = 0;
    const files: File[] = [];

    const fetchAndCompress = async (p: Product) => {
      const imgUrl = p.finalImageUrl || p.imageUrl;
      if (!imgUrl) return;
      try {
        const res = await fetch(imgUrl);
        let blob = await res.blob();
        
        try {
          const count = imagesWithData.length;
          const size = count > 50 ? 500 : (count > 20 ? 700 : 1000);
          const qual = count > 50 ? 0.4 : (count > 20 ? 0.6 : 0.8);
          blob = await compressImage(blob, size, qual);
        } catch (e) {
          console.error('Compression failed', e);
        }
        
        let type = blob.type;
        if (!type || !type.startsWith('image/')) type = 'image/jpeg';
        const ext = type.split("/")[1] || "jpg";
        const safeName = (p.productCode || p.name || "product").replace(/[\/\?<>\:\*\|":]/g, '-');
        const filename = `${safeName}.${ext}`;
        files.push(new File([blob], filename, { type }));
      } catch (err) {
        console.error(`Failed to fetch image for ${p.name}`, err);
      } finally {
        completed++;
        setDownloadProgress(prev => prev ? { ...prev, progress: completed } : null);
      }
    };

    const batchSize = 10;
    for (let i = 0; i < imagesWithData.length; i += batchSize) {
      const batch = imagesWithData.slice(i, i + batchSize);
      await Promise.all(batch.map(fetchAndCompress));
    }

    setDownloadProgress(null);

    if (files.length > 0) {
      setReadyFilesToShare(files);
      showToast("تم التجهيز. اضغط على مشاركة مرة أخرى للإرسال.", "success");
    }
  };

    const handleLockProduct = async (e: React.MouseEvent, p: Product) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      showToast("جاري القفل...", "loading");
      await api.updateProduct(p.id!, { isHidden: true });
      showToast("تم قفل المنتج بنجاح", "success");
      setProducts(prev => prev.filter(item => item.id !== p.id));
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء قفل المنتج", "error");
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
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (isIOS && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
           await navigator.share({
             files: [file]
           });
           showToast("تم حفظ الصورة بنجاح", "success");
        } catch (err: any) {
           if (err.name !== 'AbortError') {
              showToast("حدث خطأ أثناء حفظ الصورة.", "error");
           }
        }
      } else {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        showToast("تم حفظ الصورة بنجاح", "success");
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

    try {
      const ext = imgUrl.split('.').pop()?.split('?')[0] || "jpg";
      const safeName = (p.productCode || p.name || "product").replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
      const filename = `${safeName}.${ext}`;
      
      setDownloadingId(p.id!);
      showToast("بدأ التنزيل للاستوديو...", "loading");
      
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
              onClick={() => navigate('/')}
              className="p-2 bg-white/5 rounded-lg border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <div>
              <h2 className="font-bold text-sm text-brq-gold">
                {searchTerm ? 'نتائج البحث الشامل' : categoryName}
              </h2>
              <p className="text-[10px] text-white/50">
                {filteredProductsAll.length} منتجات {searchTerm ? '(بحث في جميع المواد والموديلات)' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className="p-2 bg-white/5 rounded-lg border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              <Filter size={18} />
            </button>
          </div>
        </div>
        
        <div className="relative mb-3 shrink-0">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-4 h-4 text-brq-gold" />
          </div>
          <input
            type="text"
            className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg focus:ring-brq-gold focus:border-brq-gold block pl-8 pr-10 py-2.5 transition-colors placeholder:text-white/40"
            placeholder="ابحث عن أي موديل، كود، أو اسم منتج..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setDisplayCountPerPage(50); }}
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setCurrentPage(1); setDisplayCountPerPage(50); }}
              className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/50 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {subCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto py-2 mb-2 scrollbar-hide">
            <button
              onClick={() => { setActiveSub(null); setCurrentPage(1); setDisplayCountPerPage(50); }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeSub === null 
                  ? "bg-brq-gold text-black" 
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              <span>الكل</span>
              {isAdminOrSales && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeSub === null ? 'bg-black/20 text-black' : 'bg-white/10 text-brq-gold'}`}>
                  {products.length}
                </span>
              )}
            </button>
            {subCategories.map((sub) => {
              const subCount = products.filter(p => p.subcategoryId === sub.id || (p as any).subcategory === sub.name).length;
              return (
                <button
                  key={sub.id}
                  onClick={() => { setActiveSub(sub.id); setCurrentPage(1); setDisplayCountPerPage(50); }}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activeSub === sub.id 
                      ? "bg-brq-gold text-black" 
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  <span>{sub.name}</span>
                  {isAdminOrSales && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeSub === sub.id ? 'bg-black/20 text-black' : 'bg-white/10 text-brq-gold'}`}>
                      {subCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 w-full">
          <button 
            disabled={filteredProducts.length === 0}
            onClick={() => {
              const imagesWithData = isSelectionMode 
                ? products.filter(p => selectedIds.has(p.id!))
                : filteredProducts;
                
              if (imagesWithData.length === 0) {
                 showToast("الرجاء تحديد منتج واحد على الأقل", "error");
                 return;
              }

              setDownloadChoiceDialog({
                isOpen: true,
                message: `كيف تود تحميل الصور ${isSelectionMode ? 'المحددة' : 'في القسم'}؟ (العدد: ${imagesWithData.length} صورة).`,
                onDownloadStudio: async () => {
                  setDownloadChoiceDialog(null);
                  setDownloadProgress({ progress: 0, total: imagesWithData.length });
                  
                  const imagesToDownload = imagesWithData
                    .filter(p => p.finalImageUrl || p.imageUrl)
                    .map(p => {
                      const imgUrl = p.finalImageUrl || p.imageUrl;
                      const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
                      const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\:\\*\\|":]/g, '-');
                      const filename = `${safeName}.${ext}`;
                      return { url: imgUrl!, filename };
                    });
                  
                  const { downloadImages } = await import('../../utils/download');
                  const success = await downloadImages(imagesToDownload, (progress, total) => {
                    setDownloadProgress({ progress, total });
                  });
                  if (success) {
                     showToast("تم الحفظ في الاستوديو بنجاح", "success");
                  } else {
                     showToast("حدث خطأ أثناء الحفظ", "error");
                  }
                  setDownloadProgress(null);
                },
                onDownloadZip: async () => {
                  setDownloadChoiceDialog(null);
                  setDownloadProgress({ progress: 0, total: imagesWithData.length });
                  
                  const imagesToDownload = imagesWithData
                    .filter(p => p.finalImageUrl || p.imageUrl)
                    .map(p => {
                      const imgUrl = p.finalImageUrl || p.imageUrl;
                      const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
                      const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\:\\*\\|":]/g, '-');
                      const filename = `${safeName}.${ext}`;
                      return { url: imgUrl!, filename };
                    });

                  const catName = categoryId 
                    ? allCategories.find(c => c.id === categoryId)?.name || "category"
                    : "category";

                  let success = false;
                  if ('showDirectoryPicker' in window) {
                    const { downloadToFolder } = await import('../../utils/folderDownload');
                    success = await downloadToFolder(imagesToDownload, (progress, total) => {
                      setDownloadProgress({ progress, total });
                    });
                  } else {
                    // Fallback to ZIP for iOS/unsupported browsers
                    const { downloadAsZip } = await import('../../utils/zipDownload');
                    success = await downloadAsZip(catName, imagesToDownload, (progress, total) => {
                      setDownloadProgress({ progress, total });
                    });
                  }

                  if (success) {
                     showToast("تم الحفظ بنجاح", "success");
                  } else {
                     showToast("حدث خطأ أثناء التحميل", "error");
                  }
                  setDownloadProgress(null);
                }
              });
            }}
            className="flex-[2] py-2 bg-brq-navy rounded-lg border border-brq-royal/50 flex gap-2 items-center justify-center text-xs text-brq-gold hover:bg-brq-navy/80 transition-colors disabled:opacity-50"
          >
            <Download size={14} /> {downloadProgress ? `جاري التحميل ${downloadProgress.progress}/${downloadProgress.total}` : (isSelectionMode ? 'حفظ المحدد' : 'حفظ القسم')}
          </button>
          
          {!isSelectionMode ? (
            <button 
              onClick={() => setIsDownloadDialogOpen(true)}
              className="flex-[2] py-2 bg-brq-gold/20 rounded-lg border border-brq-gold/50 flex gap-2 items-center justify-center text-xs text-brq-gold hover:bg-brq-gold/30 transition-colors"
            >
              <Layers size={14} /> تحميل كل الصور
            </button>
          ) : (
            <button 
              onClick={() => {
                const allSelected = filteredProducts.every(p => selectedIds.has(p.id!));
                const newSet = new Set(selectedIds);
                if (allSelected) {
                  filteredProducts.forEach(p => newSet.delete(p.id!));
                } else {
                  let added = 0;
                  for (const p of filteredProducts) {
                    if (!newSet.has(p.id!)) {
                      if (newSet.size >= 100) {
                        showToast("تم الوصول للحد الأقصى (100 منتج)", "error");
                        break;
                      }
                      newSet.add(p.id!);
                    }
                  }
                }
                setSelectedIds(newSet);
              }}
              className="flex-[2] py-2 bg-blue-500/20 rounded-lg border border-blue-500/50 flex gap-2 items-center justify-center text-xs text-blue-400 hover:bg-blue-500/30 transition-colors"
            >
              <CheckSquare size={14} /> {filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id!)) ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
          )}

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
          
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5 shrink-0">
            <button
              type="button"
              onClick={zoomIn}
              disabled={!canZoomIn}
              className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              title="تكبير حجم الصور (Ctrl + بكرة الماوس لأعلى)"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              disabled={!canZoomOut}
              className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              title="تصغير حجم الصور (Ctrl + بكرة الماوس لأسفل)"
            >
              <ZoomOut size={14} />
            </button>

            <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

            <div className="relative">
              <button 
                onClick={() => setIsViewModeOpen(!isViewModeOpen)}
                className={`py-1 px-2 rounded-md text-xs flex gap-1 items-center justify-center transition-all ${
                  isViewModeOpen 
                    ? "bg-brq-gold/20 text-brq-gold border border-brq-gold/50" 
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
                title="طريقة العرض والأعمدة"
              >
                <LayoutGrid size={13} className="text-brq-gold" />
                <span className="font-mono text-[11px] font-bold text-brq-gold">{gridColumns}ع</span>
              </button>

              {isViewModeOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsViewModeOpen(false)} 
                  />
                  <div className="absolute left-0 top-full mt-2 w-52 bg-gray-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <p className="text-[11px] text-white/60 px-2.5 py-1.5 font-medium border-b border-white/10 mb-1 text-right">
                      طريقة عرض المنتجات:
                    </p>
                    
                    {[4, 3, 2, 1].map((cols) => (
                      <button
                        key={cols}
                        onClick={() => {
                          setGridColumns(cols);
                          localStorage.setItem('brq_catalog_cols', cols.toString());
                          setIsViewModeOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors mb-1 ${
                          gridColumns === cols 
                            ? "bg-brq-gold/20 text-brq-gold font-bold border border-brq-gold/30" 
                            : "text-white/80 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {cols >= 4 ? <LayoutGrid size={15} /> : cols === 2 ? <Columns size={15} /> : <Square size={15} />}
                          <span>{cols} {cols === 1 ? 'منتج كبير' : 'منتجات'}</span>
                        </div>
                        {gridColumns === cols && <Check size={14} className="text-brq-gold" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {isDownloadDialogOpen && (
        <CategoryDownloadDialog 
          categories={allCategories}
          products={allStoreProducts.length > 0 ? allStoreProducts : products}
          onClose={() => setIsDownloadDialogOpen(false)}
        />
      )}

      {initialLoading ? (
        <div className="flex-1 flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-white/50 p-8 text-center h-64">
          <div className="text-4xl text-brq-gold mb-4 opacity-50">📦</div>
          <p className="text-lg font-bold text-white mb-2">لا توجد منتجات</p>
          <p className="text-sm">
            هذا القسم لا يحتوي على منتجات حالياً. سيتم إضافة منتجات قريباً.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-6 py-2 bg-brq-gold text-black rounded-lg font-bold"
          >
            العودة للرئيسية
          </button>
        </div>
      ) : (
        <div className={`pb-24 transition-all duration-300 ${gridClass}`}>
          {filteredProducts.map((p) => {
            const isWafaa = isWafaaUser(user);
            const isExpanded = isWafaa ? !!expandedProducts[p.id!] : true;
            return (
            <Link to={`/product/${p.id}`} state={{ product: p }}
              key={p.id}
              className={`rounded-2xl overflow-hidden flex flex-col justify-between h-full relative group transition-all shadow-xl bg-gradient-to-b from-[#2B2304] to-[#141002] border-2 border-yellow-500/50 hover:border-yellow-400 hover:shadow-[0_8px_30px_rgba(234,179,8,0.28)] ${
                selectedIds.has(p.id!) ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={(e) => {
                if (isSelectionMode) {
                  toggleSelection(e, p.id!);
                  return;
                }
                sessionStorage.setItem('return_category', categoryId || 'all');
                sessionStorage.setItem('return_page', currentPage.toString());
                sessionStorage.setItem('return_display_count', displayCountPerPage.toString());
                sessionStorage.setItem('return_searchTerm', searchTerm);
                if (activeSub) sessionStorage.setItem('return_sub', activeSub);
                sessionStorage.setItem('return_scroll', window.scrollY.toString());
              }}
            >
              {isSelectionMode && (
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={(e) => toggleSelection(e, p.id!)}
                    className="p-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20 text-white transition-colors"
                  >
                    {selectedIds.has(p.id!) ? (
                      <CheckSquare size={18} className="text-blue-400" />
                    ) : (
                      <Square size={18} className="text-white/60" />
                    )}
                  </button>
                </div>
              )}
              
              {!isSelectionMode && (
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                  {user?.role === 'admin' && (
                    <button
                      onClick={(e) => handleLockProduct(e, p)}
                      className="p-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-red-500/50 hover:text-white transition-colors"
                      title="قفل المنتج (للمسؤولين فقط)"
                    >
                      <Lock size={16} />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleShareSingle(e, p)}
                    className="p-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-blue-500/50 hover:text-white transition-colors"
                    title="مشاركة الصورة"
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDownloadSingle(e, p)}
                    disabled={downloadingId === p.id}
                    className="p-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-emerald-500/50 hover:text-white transition-colors disabled:opacity-50"
                    title="تنزيل الصورة"
                  >
                    {downloadingId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  </button>
                  {p.oldPriceInfo && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHistoryProduct(p);
                      }}
                      className="p-1.5 rounded-lg bg-brq-gold/20 backdrop-blur-sm border border-brq-gold/40 text-brq-gold hover:bg-brq-gold hover:text-black transition-colors shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                      title="تم تغيير السعر - عرض التاريخ"
                    >
                      <History size={16} />
                    </button>
                  )}
                </div>
              )}
              
              <div 
                className="w-full aspect-[3/4] bg-black/60 relative flex items-center justify-center border-b border-white/5 p-0 overflow-hidden cursor-pointer group/img"
                onClick={(e) => {
                  if (isSelectionMode) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const targetIdx = filteredProducts.findIndex(item => item.id === p.id);
                  if (targetIdx !== -1) {
                    setFullscreenIndex(targetIdx);
                  }
                }}
              >
                {p.finalImageUrl || p.imageUrl ? (
                  <div className="absolute inset-0 w-full h-full">
                    <OptimizedImage
                      src={p.finalImageUrl || p.imageUrl}
                      alt={p.name}
                      size="medium"
                      className="w-full h-full"
                      imgClassName="object-fill w-full h-full group-hover/img:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="text-white/30 text-3xl">👟</div>
                )}
                {(p.isArchived || p.isHidden || p.isLocked) && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 z-10 pointer-events-none gap-1">
                    {p.isArchived && (
                      <span className="bg-red-600/90 text-white px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-400 backdrop-blur-md shadow-lg">
                        📦 مادة نافذة
                      </span>
                    )}
                    {p.isLocked && (
                      <span className="bg-amber-600/90 text-white px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-400 backdrop-blur-md shadow-lg">
                        🔒 مقفل من الإدارة
                      </span>
                    )}
                    {p.isHidden && !p.isArchived && (
                      <span className="bg-zinc-800/90 text-white px-2.5 py-1 rounded-full text-[11px] font-bold border border-zinc-500 backdrop-blur-md shadow-lg">
                        🚫 غير مفعل
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Collapsible toggle for Wafaa account */}
              {isWafaa && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setExpandedProducts(prev => ({ ...prev, [p.id!]: !prev[p.id!] }));
                  }}
                  className="w-full py-2 bg-[#241D03] hover:bg-[#3B3006] text-yellow-400 text-xs font-bold flex items-center justify-center gap-1.5 border-b border-yellow-500/30 transition-colors"
                >
                  <span>{isExpanded ? 'إخفاء تفاصيل الموديل ▴' : 'عرض تفاصيل الموديل ▾'}</span>
                </button>
              )}

              {isExpanded && (
              <div className="p-3 flex flex-col gap-2 bg-gradient-to-b from-[#332A06] to-[#1A1503] border-t border-yellow-500/20">
                <div className="flex justify-between items-start gap-2">
                  <h3
                    className="font-bold text-white text-xs leading-tight line-clamp-2"
                    dir="rtl"
                  >
                    {p.name}
                  </h3>
                  <span className="text-xs sm:text-sm text-white bg-white/20 px-2 py-0.5 rounded-md font-mono font-bold shrink-0 tracking-wide border border-white/20">
                    {p.productCode || "---"}
                  </span>
                </div>

                <div className="flex items-end justify-between mt-1">
                  <div>
                    <p className="text-brq-gold font-bold text-sm">
                      {p.price?.toLocaleString("en-US")}
                    </p>
                    <p className="text-[9px] text-white/80">د.ع / الجملة</p>
                    {user?.role === 'admin' && p.dozenPriceUsd !== undefined && (
                      <div className="mt-1">
                        <p className="text-brq-blue text-xs font-bold font-mono">
                          ${p.dozenPriceUsd}
                        </p>
                        <p className="text-[9px] text-white/80">دولار / الجملة</p>
                      </div>
                    )}
                  </div>
                  {p.piecesCount && (
                    <div className="flex flex-col items-end">
                      <p className="text-white font-mono text-xs font-bold">
                        {p.piecesCount}
                      </p>
                      <p className="text-[9px] text-white/80">
                        الكمية/عدد القطع
                      </p>
                    </div>
                  )}
                </div>
                {user?.role === 'admin' && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                    <div className="flex flex-col">
                      <p className="text-[9px] text-white/70 mb-0.5">تاريخ النزول</p>
                      <p className="text-[10px] text-white font-mono tracking-tight">{p.createdAt ? formatDate(p.createdAt) : '---'}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-[9px] text-white/70 mb-0.5">أخر تحديث</p>
                      <p className="text-[10px] text-white font-mono tracking-tight">{p.updatedAt ? formatDate(p.updatedAt) : (p.createdAt ? formatDate(p.createdAt) : '---')}</p>
                    </div>
                  </div>
                )}
                <div className="mt-2">
                  {p.isArchived ? (
                    <div className="w-full py-1.5 bg-red-950/50 border border-red-500/30 rounded-lg text-red-300 font-medium text-xs text-center">
                      مادة نافذة (غير قابلة للطلب)
                    </div>
                  ) : (() => {
                    const cartItem = cart.find(item => item.product.id === p.id);
                    if (cartItem) {
                      return (
                        <div className="flex items-center justify-between w-full h-8 bg-brq-royal/30 border border-brq-royal/60 rounded-lg">
                          <button
                            onClick={(e) => handleUpdateQuantity(e, p, cartItem.quantity + 1)}
                            className="h-full px-3 text-white hover:bg-brq-royal/50 rounded-r-lg transition-colors font-bold"
                          >
                            +
                          </button>
                          <span className="text-white font-bold text-xs">{cartItem.quantity}</span>
                          <button
                            onClick={(e) => handleUpdateQuantity(e, p, cartItem.quantity - 1)}
                            className="h-full px-3 text-white hover:bg-brq-royal/50 rounded-l-lg transition-colors font-bold"
                          >
                            -
                          </button>
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={(e) => handleAddToCart(e, p)}
                        className="w-full py-1.5 bg-brq-royal/30 hover:bg-brq-royal border border-brq-royal/60 rounded-lg text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ShoppingCart size={14} /> إضافة
                      </button>
                    );
                  })()}
                </div>
              </div>
              )}
            </Link>
            );
          })}
        </div>
      )}

      {/* Auto Load Indicator for second 50 products on this page */}
      {displayCountPerPage < 100 && pageProductsAll.length > 50 && !loading && filteredProducts.length > 0 && (
        <div className="flex justify-center items-center py-6">
          <div className="flex items-center gap-2.5 text-brq-gold text-sm bg-brq-card/80 backdrop-blur-md px-6 py-3 rounded-full border border-brq-border shadow-[0_0_20px_rgba(212,175,55,0.2)] animate-pulse">
            <Loader2 size={18} className="animate-spin text-brq-gold" />
            <span>جاري تحميل المزيد تلقائياً ({displayCountPerPage} من {pageProductsAll.length} في هذه الصفحة)...</span>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && !loading && filteredProductsAll.length > 0 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-6 mb-16 pb-24" dir="ltr">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => {
                setCurrentPage(pageNumber);
                setDisplayCountPerPage(50);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-12 h-12 flex items-center justify-center rounded-xl font-bold text-lg transition-all ${
                currentPage === pageNumber 
                  ? 'bg-brq-gold text-black scale-110 shadow-[0_0_15px_rgba(255,215,0,0.4)] border-2 border-yellow-300' 
                  : 'bg-brq-card border border-brq-border text-white hover:bg-white/10'
              }`}
            >
              {pageNumber}
            </button>
          ))}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className={`max-w-md mx-auto bg-blue-900/90 backdrop-blur-md border border-blue-500/50 rounded-2xl shadow-2xl p-4 flex ${readyFilesToShare && readyFilesToShare.length > maxShareLimit ? 'flex-col gap-3 items-start' : 'items-center justify-between'}`}>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">
                تم تحديد {selectedIds.size} منتج
              </span>
              {readyFilesToShare && readyFilesToShare.length > maxShareLimit && (
                <span className="text-[11px] text-blue-200 mt-1 leading-relaxed">
                  يمكنك مشاركة جميع الصور دفعة واحدة، أو تقسيمها لتجنب مشاكل بعض التطبيقات (كل دفعة {maxShareLimit} صور):
                </span>
              )}
            </div>
            <div className={`flex items-center gap-2 ${readyFilesToShare && readyFilesToShare.length > maxShareLimit ? 'flex-wrap w-full justify-start' : ''}`}>
              {!readyFilesToShare ? (
                <button
                  onClick={handleShareSelected}
                  disabled={downloadProgress !== null}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <Share2 size={16} /> {downloadProgress ? `جاري التجهيز ${downloadProgress.progress}/${downloadProgress.total}` : 'مشاركة'}
                </button>
              ) : readyFilesToShare.length <= maxShareLimit ? (
                <button
                  onClick={() => executeShare(readyFilesToShare, false)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <Share2 size={16} /> مشاركة الآن
                </button>
              ) : (
                <div className="flex flex-col w-full gap-3 mt-1">
                  <button
                    onClick={() => executeShare(readyFilesToShare, false)}
                    className="w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 size={16} /> مشاركة الكل مرة واحدة ({readyFilesToShare.length} صورة)
                  </button>
                  <div className="flex flex-wrap gap-2 w-full">
                    {Array.from({ length: Math.ceil(readyFilesToShare.length / maxShareLimit) }).map((_, idx) => {
                      const chunk = readyFilesToShare.slice(idx * maxShareLimit, (idx + 1) * maxShareLimit);
                      return (
                        <button
                          key={idx}
                          onClick={() => executeShare(chunk, true)}
                          className="flex-1 min-w-[70px] py-2 px-1 bg-blue-500/80 hover:bg-blue-500 border border-blue-400/50 text-white rounded-lg font-bold text-[11px] transition-colors flex flex-col items-center justify-center gap-1"
                        >
                          <Share2 size={12} /> 
                          <span>الدفعة {idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {historyProduct && (
        <PriceHistoryViewer product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
      {fullscreenIndex !== null && filteredProducts[fullscreenIndex] && (
        <ImageViewer 
          src={filteredProducts[fullscreenIndex].finalImageUrl || filteredProducts[fullscreenIndex].imageUrl!}
          alt={filteredProducts[fullscreenIndex].name}
          product={filteredProducts[fullscreenIndex]}
          currentIndex={fullscreenIndex}
          totalCount={filteredProducts.length}
          onClose={() => setFullscreenIndex(null)}
          onNext={fullscreenIndex < filteredProducts.length - 1 ? () => setFullscreenIndex(fullscreenIndex + 1) : undefined}
          onPrev={fullscreenIndex > 0 ? () => setFullscreenIndex(fullscreenIndex - 1) : undefined}
          hasNext={fullscreenIndex < filteredProducts.length - 1}
          hasPrev={fullscreenIndex > 0}
        />
      )}
      {fullscreenImage && (
        <ImageViewer src={fullscreenImage.src} alt={fullscreenImage.alt} onClose={() => setFullscreenImage(null)} />
      )}
      {downloadChoiceDialog && (
        <DownloadChoiceDialog
          isOpen={downloadChoiceDialog.isOpen}
          title="تحميل الصور"
          message={downloadChoiceDialog.message}
          onDownloadStudio={downloadChoiceDialog.onDownloadStudio}
          onDownloadZip={downloadChoiceDialog.onDownloadZip}
          onCancel={() => setDownloadChoiceDialog(null)}
        />
      )}

      {/* Floating Zoom HUD Indicator for Mouse Wheel & Buttons */}
      <ZoomHUD 
        show={showHUD} 
        columns={gridColumns} 
        label={zoomLabel} 
        onZoomIn={zoomIn} 
        onZoomOut={zoomOut} 
        onReset={resetZoom} 
      />
    </div>
  );
}
