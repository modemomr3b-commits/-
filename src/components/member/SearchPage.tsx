import { useState, useEffect, useMemo } from 'react';
import { Search, Lock, SlidersHorizontal, Archive, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../api';
import { filterProductsBySearch } from '../../utils/search';
import { Product } from '../../types';
import OptimizedImage from '../OptimizedImage';
import { useStore } from '../../store';

export default function SearchPage() {
  const { user, showToast } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  
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
    
    const fetchProducts = async () => {
      try {
         const cats = await api.getCategories();
         const allProducts = await api.getProducts();
         if (mounted) {
            setAllCategories(cats);
            setProducts(allProducts);
         }
      } catch (e) {
         console.error(e);
      } finally {
         if (mounted) setLoading(false);
      }
    };
    fetchProducts();

    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 1500);

    return () => { 
      mounted = false; 
      clearTimeout(safetyTimer);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!loading) {
      if (sessionStorage.getItem('return_search') === 'true') {
        const savedPage = sessionStorage.getItem('return_search_page');
        if (savedPage) setCurrentPage(parseInt(savedPage));
        
        const savedScroll = sessionStorage.getItem('return_search_scroll');
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 500);
        }
        
        sessionStorage.removeItem('return_search');
        sessionStorage.removeItem('return_search_page');
        sessionStorage.removeItem('return_search_scroll');
        sessionStorage.removeItem('return_search_query');
        sessionStorage.removeItem('return_search_archived');
      }
    }
  }, [loading]);

  const filteredProductsAll = useMemo(() => {
    if (!query) return [];
    
    let result = products.filter(p => !p.isLocked);
    if (searchArchived) {
      result = result.filter(p => p.isArchived);
    } else {
      result = result.filter(p => !p.isArchived && !p.isHidden);
    }
    
    return filterProductsBySearch(result, query, allCategories);
  }, [products, query, searchArchived, allCategories]);

  const totalPages = Math.ceil(filteredProductsAll.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const filteredProducts = useMemo(() => filteredProductsAll.slice(startIndex, startIndex + itemsPerPage), [filteredProductsAll, startIndex, itemsPerPage]);



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
      
      <div className="relative mb-6 shrink-0">
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Search className="w-5 h-5 text-brq-gold" />
        </div>
        <input 
          type="text" 
          value={searchInput}
          onChange={e => { setSearchInput(e.target.value); setCurrentPage(1); }}
          className="w-full glass-card pl-12 pr-10 py-3.5 rounded-xl text-sm placeholder-white/40 focus:outline-none focus:border-brq-gold focus:ring-1 focus:ring-brq-gold transition-all text-white"
          placeholder="ابحث عن منتج، موديل، كود..."
          autoFocus
        />
        <button className="absolute inset-y-0 left-0 flex items-center pl-3">
           <SlidersHorizontal className="w-5 h-5 text-white/50 hover:text-white transition-colors" />
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
                    <Link to={`/product/${p.id}`} state={{ product: p }} key={p.id} className="glass-card rounded-2xl overflow-hidden flex flex-col border border-white/5 relative group hover:border-brq-gold transition-colors"
                          onClick={() => {
                            sessionStorage.setItem('return_search', 'true');
                            sessionStorage.setItem('return_search_page', currentPage.toString());
                            sessionStorage.setItem('return_search_scroll', window.scrollY.toString());
                            sessionStorage.setItem('return_search_query', searchInput);
                            sessionStorage.setItem('return_search_archived', searchArchived.toString());
                          }}>
                      <div className="w-full aspect-[4/5] bg-black/40 relative flex items-center justify-center p-0 overflow-hidden">
                         {p.finalImageUrl || p.imageUrl ? (
                           <div className="absolute inset-0">
                             <OptimizedImage src={p.finalImageUrl || p.imageUrl} alt={p.name || ''} size="medium" className="w-full h-full" imgClassName="object-contain w-full h-full" />
                           </div>
                         ) : (
                           <span className="text-4xl opacity-50">👟</span>
                         )}
                         {p.isArchived && (
                           <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                             <span className="bg-red-500/80 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20 backdrop-blur-md">غير متوفر</span>
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
                      <div className="p-3 flex flex-col flex-1">
                         <div className="flex justify-between items-start mb-1">
                           <h3 className="font-bold text-xs text-white line-clamp-1">{p.name}</h3>
                         </div>
                         <div className="flex justify-between items-end mt-auto pt-2 border-t border-white/5">
                           <span className="text-xs font-mono text-white/50">{p.productCode}</span>
                           <div className="flex flex-col items-end">
                             <span className="font-bold text-brq-gold text-sm">{Number(p.price).toLocaleString("en-US")} <span className="text-[10px]">د.ع</span></span>
                             {user?.role === 'admin' && p.dozenPriceUsd !== undefined && (
                               <span className="font-bold text-brq-blue text-xs font-mono">${p.dozenPriceUsd}</span>
                             )}
                           </div>
                         </div>
                      </div>
                    </Link>
                 ))}
               </div>
             )}
             
             {/* Pagination Controls */}
             {totalPages > 1 && (
               <div className="flex flex-wrap justify-center items-center gap-2 mt-8 pb-12" dir="ltr">
                 {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                   <button
                     key={pageNumber}
                     onClick={() => {
                       setCurrentPage(pageNumber);
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
           </div>
         )}
      </div>
    </div>
  );
}
