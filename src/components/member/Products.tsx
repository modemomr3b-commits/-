import { useParams, Link, useNavigate } from "react-router";
import { ChevronRight, Filter, Download, ShoppingCart, Layers, Share2, CheckSquare, Square, History } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../../api";
import { supabase } from "../../supabase";
import { Product, Category } from "../../types";
import { useStore } from "../../store";
import OptimizedImage from "../OptimizedImage";
import { CategoryDownloadDialog } from "../shared/CategoryDownloadDialog";
import { PriceHistoryViewer } from "./PriceHistoryViewer";

const MOCK_PRODUCTS: Product[] = [];

export default function Products() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart, updateQuantity, removeFromCart, cart, user } = useStore();
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const [categoryName, setCategoryName] = useState("جميع المنتجات");
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number, total: number } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchProducts = async () => {
    try {
      const [cats, allProducts] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
      ]);

      setAllCategories(cats);

      let fetchedProducts = allProducts.filter((p: any) => !p.isArchived && !p.isHidden);
      if (categoryId) {
        fetchedProducts = fetchedProducts.filter(
          (p: any) => p.categoryId === categoryId,
        );
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
          window.scrollTo(0, parseInt(savedScroll));
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

  const filteredProducts = activeSub
    ? products.filter((p) => p.subcategoryId === activeSub)
    : products;

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleShareSelected = async () => {
    if (selectedIds.size === 0) return;

    const productsToShare = products.filter((p) => selectedIds.has(p.id!));
    const imagesWithData = productsToShare.filter((p) => p.finalImageUrl || p.imageUrl);

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
          setIsSelectionMode(false);
        } catch (error) {
          console.error('Error sharing files', error);
        }
      } else {
        alert("متصفحك لا يدعم مشاركة هذه الصور مباشرة.");
      }
    }
  };

  const handleShareSingle = async (e: React.MouseEvent, p: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    const imgUrl = p.finalImageUrl || p.imageUrl;
    if (!imgUrl) {
      alert("لا توجد صورة لهذا المنتج.");
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
      } else {
        alert("متصفحك لا يدعم مشاركة هذه الصورة مباشرة.");
      }
    } catch (error) {
      console.error('Error sharing file', error);
      alert("حدث خطأ أثناء محاولة المشاركة.");
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
                 alert("لا توجد منتجات بصور لتحميلها");
                 return;
              }
              const imagesWithData = filteredProducts.filter(p => p.finalImageUrl || p.imageUrl);
              if (imagesWithData.length === 0) {
                 alert("لا توجد صور للمنتجات لتحميلها.");
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
                    const ext = blob.type.split('/')[1] || 'jpg';
                    const safeName = (p.productCode || p.name || 'product').replace(/[\/\?<>\\:\*\|":]/g, '-');
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
                  } catch (e) {
                    console.error(`Failed to download ${p.name}`);
                  }
                }
                completed++;
                setDownloadProgress({ progress: completed, total: imagesWithData.length });
              }
              setDownloadProgress(null);
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

      {isDownloadDialogOpen && (
        <CategoryDownloadDialog 
          categories={allCategories}
          products={products}
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
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-24">
          {filteredProducts.map((p) => (
            <Link
              to={`/product/${p.id}`}
              key={p.id}
              className={`glass-card rounded-2xl overflow-hidden flex flex-col border relative group transition-colors shadow-lg ${
                selectedIds.has(p.id!) ? "border-blue-500 bg-blue-500/10" : "border-white/5 hover:border-brq-gold"
              }`}
              onClick={(e) => {
                if (isSelectionMode) {
                  toggleSelection(e, p.id!);
                }
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
                  <button
                    onClick={(e) => handleShareSingle(e, p)}
                    className="p-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-blue-500/50 hover:text-white transition-colors"
                    title="مشاركة الصورة"
                  >
                    <Share2 size={16} />
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
              
              <div className="w-full aspect-[4/5] bg-black/40 relative flex items-center justify-center border-b border-white/5 p-0 overflow-hidden">
                {p.finalImageUrl || p.imageUrl ? (
                  <div className="absolute inset-0">
                    <OptimizedImage
                      src={p.finalImageUrl || p.imageUrl}
                      alt={p.name}
                      size="medium"
                      className="w-full h-full"
                      imgClassName="object-contain w-full h-full hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="text-white/30 text-3xl">👟</div>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2 bg-gradient-to-b from-transparent to-black/40">
                <div className="flex justify-between items-start gap-2">
                  <h3
                    className="font-bold text-white text-xs leading-tight line-clamp-2"
                    dir="rtl"
                  >
                    {p.name}
                  </h3>
                  <span className="text-[10px] text-white/60 bg-white/10 px-1 py-0.5 rounded font-mono shrink-0">
                    {p.productCode || "---"}
                  </span>
                </div>

                <div className="flex items-end justify-between mt-1">
                  <div>
                    <p className="text-brq-gold font-bold text-sm">
                      {p.price?.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-white/40">د.ع / الجملة</p>
                    {user?.role === 'admin' && p.dozenPriceUsd !== undefined && (
                      <div className="mt-1">
                        <p className="text-brq-blue text-xs font-bold font-mono">
                          ${p.dozenPriceUsd}
                        </p>
                        <p className="text-[9px] text-white/40">دولار / الجملة</p>
                      </div>
                    )}
                  </div>
                  {p.piecesCount && (
                    <div className="flex flex-col items-end">
                      <p className="text-white font-mono text-xs">
                        {p.piecesCount}
                      </p>
                      <p className="text-[9px] text-white/40">
                        الكمية/عدد القطع
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  {(() => {
                    const cartItem = cart.find(item => item.product.id === p.id);
                    if (cartItem) {
                      return (
                        <div className="flex items-center justify-between w-full h-8 bg-brq-royal/20 border border-brq-royal/50 rounded-lg">
                          <button
                            onClick={(e) => handleUpdateQuantity(e, p, cartItem.quantity + 1)}
                            className="h-full px-3 text-white hover:bg-brq-royal/50 rounded-r-lg transition-colors"
                          >
                            +
                          </button>
                          <span className="text-white font-bold text-xs">{cartItem.quantity}</span>
                          <button
                            onClick={(e) => handleUpdateQuantity(e, p, cartItem.quantity - 1)}
                            className="h-full px-3 text-white hover:bg-brq-royal/50 rounded-l-lg transition-colors"
                          >
                            -
                          </button>
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={(e) => handleAddToCart(e, p)}
                        className="w-full py-1.5 bg-brq-royal/20 hover:bg-brq-royal border border-brq-royal/50 rounded-lg text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ShoppingCart size={14} /> إضافة
                      </button>
                    );
                  })()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="max-w-md mx-auto bg-blue-900/90 backdrop-blur-md border border-blue-500/50 rounded-2xl shadow-2xl p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">
                تم تحديد {selectedIds.size} منتج
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareSelected}
                disabled={downloadProgress !== null}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
              >
                <Share2 size={16} /> مشاركة
              </button>
            </div>
          </div>
        </div>
      )}

      {historyProduct && (
        <PriceHistoryViewer product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
    </div>
  );
}
