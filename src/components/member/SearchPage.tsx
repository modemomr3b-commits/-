import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Lock, SlidersHorizontal, Archive, Download, Loader2, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../api';
import { supabase } from '../../supabase';
import { shuffleProductsForUser } from '../../utils/shuffle';
import { filterProductsBySearch, isProductRestrictedFromSearch, isArchivedCategoryName } from '../../utils/search';
import { localCache } from '../../utils/localCache';
import { Product } from '../../types';
import OptimizedImage from '../OptimizedImage';
import { useStore } from '../../store';
import { isWafaaUser } from '../../utils/wafaaHelper';

export default function SearchPage() {
  const { user, showToast, cart, addToCart, updateQuantity, removeFromCart } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  
  const [searchArchived, setSearchArchived] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Restore search state if returning
    if (sessionStorage.getItem('return_search') === 'true') {
      const savedQuery = sessionStorage.getItem('return_search_query');
      if (savedQuery) {
        setSearchInput(savedQuery);
        setQuery(savedQuery);
      }
      setSearchArchived(sessionStorage.getItem('return_search_archived') === 'true');
    }
    
    api.getCategories().then(cats => {
      if (mounted) setAllCategories(cats);
    });

    return () => { mounted = false; };
  }, []);

  const fetchSearchResults = async (page: number, isNewSearch = false) => {
    if (!query && !isNewSearch) return;
    
    if (isNewSearch) {
      setLoading(true);
      setProducts([]);
    } else {
      setIsFetchingNextPage(true);
    }

    try {
      const result = await api.getProductsPaginated({
        page,
        pageSize,
        searchTerm: query,
        searchArchived: searchArchived,
        isAdmin: false
      });

      setProducts(prev => isNewSearch ? result.products : [...prev, ...result.products]);
      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
      showToast("خطأ في البحث", "error");
    } finally {
      setLoading(false);
      setIsFetchingNextPage(false);
    }
  };

  useEffect(() => {
    if (query) {
      fetchSearchResults(1, true);
    } else {
      setProducts([]);
      setHasMore(false);
      setLoading(false);
    }
  }, [query, searchArchived]);

  const loadMore = () => {
    if (!loading && !isFetchingNextPage && hasMore) {
      fetchSearchResults(currentPage + 1);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !isFetchingNextPage) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, isFetchingNextPage, currentPage]);

  useEffect(() => {
    if (!loading && products.length > 0) {
      if (sessionStorage.getItem('return_search') === 'true') {
        const savedScroll = sessionStorage.getItem('return_search_scroll');
        if (savedScroll) {
          const targetY = parseInt(savedScroll, 10);
          window.scrollTo(0, targetY);
          
          sessionStorage.removeItem('return_search');
          sessionStorage.removeItem('return_search_page');
          sessionStorage.removeItem('return_search_scroll');
          sessionStorage.removeItem('return_search_query');
          sessionStorage.removeItem('return_search_archived');
        }
      }
    }
  }, [loading, products.length]);

  const filteredProducts = products;



  const handleDownloadSingle = async (e: React.MouseEvent, p: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    const imgUrl = p.finalImageUrl || p.imageUrl;
    if (!imgUrl) {
      showToast("الصورة غير متوفرة", "error");
      return;
    }

    try {
      const ext = imgUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
      const filename = `${safeName}.${ext}`;
      
      setDownloadingId(p.id!);
      showToast("بدأ التنزيل للاستوديو...", "loading");
      
      const { downloadImages } = await import('../../utils/download');
      const success = await downloadImages([{ url: imgUrl, filename }]);
      if (success) {
        showToast("تم الحفظ بنجاح", "success");
      } else {
        showToast("حدث خطأ أثناء التنزيل", "error");
      }
    } catch (err) {
      console.error(`Failed to download ${p.name}`, err);
      showToast("حدث خطأ أثناء التنزيل", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-60px)]">
      <h1 className="text-xl font-bold mb-6 text-white">البحث الذكي</h1>
      
      <div className="relative mb-6 shrink-0 flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="w-5 h-5 text-brq-gold" />
          </div>
          <input 
            type="text" 
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setQuery(e.target.value); setCurrentPage(1); }}
            className="w-full glass-card pl-12 pr-10 py-3.5 rounded-xl text-sm placeholder-white/40 focus:outline-none focus:border-brq-gold focus:ring-1 focus:ring-brq-gold transition-all text-white"
            placeholder="ابحث عن منتج، موديل، كود..."
            autoFocus
          />
          <button className="absolute inset-y-0 left-0 flex items-center pl-3">
             <SlidersHorizontal className="w-5 h-5 text-white/50 hover:text-white transition-colors" />
          </button>
        </div>
        <button
          onClick={() => {
            setQuery(searchInput);
            setCurrentPage(1);
          }}
          className="bg-brq-gold text-black px-4 py-3.5 rounded-xl font-bold shadow-md hover:bg-yellow-400 active:scale-95 transition-all whitespace-nowrap text-sm flex items-center gap-1.5"
        >
          <Search size={16} />
          بحث عن المنتج
        </button>
      </div>

      <div className="space-y-6 flex-1">
         {!query ? (
           <>
             <div>
                <h2 className="text-sm font-bold text-white/70 mb-3">البحث المتقدم</h2>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => { setSearchArchived(!searchArchived); setCurrentPage(1); }}
                     className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 border transition-colors ${searchArchived ? 'bg-brq-gold/10 border-brq-gold' : 'glass-panel border-white/5 hover:border-brq-gold/50'}`}
                   >
                      <Archive className={searchArchived ? 'text-brq-gold mb-1' : 'text-white/50 mb-1'} />
                      <span className="text-sm font-bold text-white">المواد النافذة</span>
                      <span className="text-[10px] text-white/50">أرشيف المنتجات القديمة</span>
                   </button>
                   <button className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-2 border border-white/5 hover:border-brq-gold/50 transition-colors">
                      <span className="text-xl mb-1">🔥</span>
                      <span className="text-sm font-bold text-white">تحطيم الأسعار</span>
                      <span className="text-[10px] text-white/50">تخفيضات وعروض</span>
                   </button>
                </div>
             </div>
           </>
         ) : (
           <div className="space-y-4">
             <div className="flex justify-between items-center mb-2">
               <h2 className="text-sm font-bold text-white/70">
                 نتائج البحث {searchArchived ? '(المواد النافذة)' : '(المنتجات الفعالة)'}
               </h2>
               <button 
                 onClick={() => { setSearchArchived(!searchArchived); setCurrentPage(1); }}
                 className={`text-xs px-2 py-1 rounded border transition-colors ${searchArchived ? 'bg-brq-gold text-black border-brq-gold font-bold' : 'bg-transparent text-white/50 border-white/10 hover:text-white'}`}
               >
                 {searchArchived ? 'الرجوع للمنتجات الفعالة' : 'البحث في المواد النافذة 📦'}
               </button>
             </div>
             
             {loading ? (
               <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div></div>
             ) : filteredProducts.length === 0 ? (
               <div className="text-center py-12 space-y-4">
                 <p className="text-white/50">لا توجد نتائج تطابق بحثك {searchArchived ? 'في المواد النافذة' : 'في المنتجات الفعالة'}.</p>
                 {!searchArchived && (
                   <button
                     onClick={() => { setSearchArchived(true); setCurrentPage(1); }}
                     className="px-5 py-2.5 bg-brq-gold/20 text-brq-gold border border-brq-gold/40 rounded-xl text-sm font-bold hover:bg-brq-gold hover:text-black transition-all"
                   >
                     🔍 البحث عن "{query}" في المواد النافذة
                   </button>
                 )}
               </div>
             ) : (
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 {filteredProducts.map(p => (
                    <Link to={`/product/${p.id}`} state={{ product: p }} key={`${p.id}-srch`} className="rounded-2xl overflow-hidden flex flex-col border-2 border-yellow-500/50 relative group hover:border-yellow-400 transition-all shadow-lg hover:shadow-[0_8px_30px_rgba(234,179,8,0.28)] bg-gradient-to-b from-[#2B2304] to-[#141002]"
                          onClick={() => {
                            sessionStorage.setItem('return_search', 'true');
                            sessionStorage.setItem('return_search_page', currentPage.toString());
                            sessionStorage.setItem('return_search_scroll', window.scrollY.toString());
                            sessionStorage.setItem('return_search_query', searchInput);
                            sessionStorage.setItem('return_search_archived', searchArchived.toString());
                          }}>
                      <div className="w-full aspect-[3/4] bg-black/50 relative flex items-center justify-center p-0 overflow-hidden border-b border-yellow-500/20">
                         {p.finalImageUrl || p.imageUrl ? (
                           <div className="absolute inset-0 w-full h-full">
                             <OptimizedImage src={p.finalImageUrl || p.imageUrl} alt={p.name || ''} size="medium" className="w-full h-full" imgClassName="object-fill w-full h-full" />
                           </div>
                         ) : (
                           <span className="text-4xl opacity-50">👟</span>
                         )}
                         {(p.isArchived || p.isHidden || p.isLocked || p.categoryId === 'be0a70a8-f9c6-430d-8416-11745f26576f') && (
                           <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 z-10 pointer-events-none gap-1">
                             {(p.isArchived || p.categoryId === 'be0a70a8-f9c6-430d-8416-11745f26576f') && (
                               <span className="text-red-500 font-bold text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide bg-black/40 px-3 py-1 rounded-lg border border-red-500/30">
                                منتج نافذ
                              </span>
                             )}
                             {p.isLocked && (
                               <span className="bg-amber-600/90 text-white px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-400 backdrop-blur-md shadow-md">
                                 🔒 مقفل
                               </span>
                             )}
                             {p.isHidden && !p.isArchived && (
                               <span className="bg-zinc-800/90 text-white px-2.5 py-1 rounded-full text-[11px] font-bold border border-zinc-500 backdrop-blur-md shadow-md">
                                 🚫 غير مفعل
                               </span>
                             )}
                           </div>
                         )}
                         {(p.finalImageUrl || p.imageUrl) && (
                           <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                              {user?.role === 'admin' && (
                                <button
                                  onClick={async (e) => {
                                     e.preventDefault(); e.stopPropagation();
                                     showToast("جاري القفل...", "loading");
                                     try {
                                       await api.updateProduct(p.id!, { isHidden: true });
                                       setProducts(prev => prev.filter(x => x.id !== p.id));
                                       showToast("تم قفل المنتج بنجاح", "success");
                                     } catch (err) {
                                       console.error(err);
                                       showToast("حدث خطأ", "error");
                                     }
                                  }}
                                  className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-red-500 hover:text-white transition-colors shadow-lg"
                                  title="قفل المنتج"
                                >
                                  <Lock size={16} />
                                </button>
                              )}
                           </div>
                         )}
                         {(p.finalImageUrl || p.imageUrl) && (
                           <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                              {user?.role === 'admin' && (
                                <button
                                  onClick={async (e) => {
                                     e.preventDefault(); e.stopPropagation();
                                     showToast("جاري القفل...", "loading");
                                     try {
                                       await api.updateProduct(p.id!, { isHidden: true });
                                       setProducts(prev => prev.filter(x => x.id !== p.id));
                                       showToast("تم قفل المنتج بنجاح", "success");
                                     } catch (err) {
                                       console.error(err);
                                       showToast("حدث خطأ", "error");
                                     }
                                  }}
                                  className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-red-500 hover:text-white transition-colors shadow-lg"
                                  title="قفل المنتج"
                                >
                                  <Lock size={16} />
                                </button>
                              )}
                           </div>
                         )}
                         {(p.finalImageUrl || p.imageUrl) && (
                           <button
                             onClick={(e) => handleDownloadSingle(e, p)}
                             disabled={downloadingId === p.id}
                             className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-brq-gold hover:text-black hover:border-brq-gold transition-colors shadow-lg z-10"
                             title="تحميل الصورة"
                           >
                             {downloadingId === p.id ? (
                               <Loader2 size={16} className="animate-spin" />
                             ) : (
                               <Download size={16} />
                             )}
                           </button>
                         )}
                      </div>
                      <div className="p-3 flex flex-col flex-1 bg-gradient-to-b from-[#332A06] to-[#1A1503]">
                         <div className="flex justify-between items-start mb-1">
                           <h3 className="font-bold text-xs text-white line-clamp-1">{p.name}</h3>
                         </div>
                         <div className="flex justify-between items-end mt-auto pt-2 border-t border-yellow-500/15">
                           <span className="text-xs sm:text-sm font-mono font-bold text-yellow-300 bg-yellow-400/20 px-2 py-0.5 rounded border border-yellow-400/30">{p.productCode}</span>
                           <div className="flex flex-col items-end">
                             <span className="font-bold text-yellow-300 text-sm font-mono">{Number(p.price).toLocaleString("en-US")} <span className="text-[10px] font-sans text-white/70">د.ع</span></span>
                             {user?.role === 'admin' && p.dozenPriceUsd !== undefined && (
                               <span className="font-bold text-brq-blue text-xs font-mono">${p.dozenPriceUsd}</span>
                             )}
                           </div>
                         </div>
                         <div className="mt-2" onClick={(e) => e.preventDefault()}>
                           {p.isArchived || p.isLocked || p.categoryId === 'be0a70a8-f9c6-430d-8416-11745f26576f' ? (
                             <div className="w-full py-1.5 bg-red-950/50 border border-red-500/30 rounded-lg text-red-300 font-medium text-xs text-center cursor-not-allowed">
                               منتج غير قابل للطلب
                             </div>
                           ) : (() => {
                             const cartItem = cart.find(item => item.product.id === p.id);
                             if (cartItem) {
                               return (
                                 <div className="flex items-center justify-between w-full h-8 bg-blue-600/30 border border-blue-500/60 rounded-lg">
                                   <button
                                     onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQuantity(p.id!, cartItem.quantity + 1); }}
                                     className="h-full px-3 text-white hover:bg-blue-600/50 rounded-r-lg transition-colors font-bold cursor-pointer"
                                   >
                                     +
                                   </button>
                                   <span className="text-white font-bold text-xs">{cartItem.quantity}</span>
                                   <button
                                     onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(cartItem.quantity <= 1) { removeFromCart(p.id!); } else { updateQuantity(p.id!, cartItem.quantity - 1); } }}
                                     className="h-full px-3 text-white hover:bg-blue-600/50 rounded-l-lg transition-colors font-bold cursor-pointer"
                                   >
                                     -
                                   </button>
                                 </div>
                               );
                             }
                             return (
                               <button
                                 onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(p, 1); }}
                                 className="w-full py-1.5 bg-blue-600/30 hover:bg-blue-600 border border-blue-500/60 rounded-lg text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                               >
                                 <ShoppingCart size={14} /> إضافة للسلة
                               </button>
                             );
                           })()}
                         </div>
                      </div>
                    </Link>
                 ))}
               </div>
             )}
             
              {/* Infinite Scroll Trigger */}
              <div ref={loadMoreRef} className="col-span-full h-24 flex flex-col items-center justify-center mt-4">
                {isFetchingNextPage && (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-brq-gold animate-spin" />
                    <p className="text-xs text-white/50">جاري البحث...</p>
                  </div>
                )}
                {!hasMore && products.length > 0 && (
                  <p className="text-sm text-white/30 italic">نهاية النتائج</p>
                )}
              </div>
           </div>
         )}
      </div>
    </div>
  );
}
