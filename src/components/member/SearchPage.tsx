import { Search, SlidersHorizontal, Archive, ChevronLeft, History } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Product } from '../../types';
import { Link } from 'react-router';
import OptimizedImage from '../OptimizedImage';
import { PriceHistoryViewer } from './PriceHistoryViewer';
import { useStore } from '../../store';

export default function SearchPage() {
  const { user } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchArchived, setSearchArchived] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchProducts = async () => {
      try {
         const allProducts = await api.getProducts();
         if (mounted) {
            setProducts(allProducts);
            setLoading(false);
         }
      } catch (e) {
         console.error(e);
         if (mounted) setLoading(false);
      }
    };
    fetchProducts();
    return () => { mounted = false; };
  }, []);

  const filteredProducts = products.filter(p => {
    // Hidden products should not be visible
    if (p.isHidden) return false;
    
    // Filter by query
    if (!query) return false; 
    const q = query.toLowerCase().trim().replace(/[-_]/g, '');

    if (searchArchived) {
      // If we are in "Archived Search" mode, only show archived products
      if (!p.isArchived) return false;
      
      // And only show if there is an exact or startsWith match on code, model, or barcode
      return (
        (p.productCode && p.productCode.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.modelNumber && p.modelNumber.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.barcode && p.barcode.toLowerCase().replace(/[-_]/g, '').startsWith(q))
      );
    } else {
      // If we are in normal search mode, hide archived products
      if (p.isArchived) return false;

      // Show partial matches for active products
      return (
        (p.name && p.name.toLowerCase().replace(/[-_]/g, '').includes(q)) ||
        (p.productCode && p.productCode.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.modelNumber && p.modelNumber.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.barcode && p.barcode.toLowerCase().replace(/[-_]/g, '').startsWith(q))
      );
    }
  });

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-60px)]">
      <h1 className="text-xl font-bold mb-6 text-white">البحث الذكي</h1>
      
      <div className="relative mb-6 shrink-0">
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Search className="w-5 h-5 text-brq-gold" />
        </div>
        <input 
          type="text" 
          value={query}
          onChange={e => setQuery(e.target.value)}
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
                     onClick={() => setSearchArchived(!searchArchived)}
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
                 onClick={() => setSearchArchived(!searchArchived)}
                 className={`text-xs px-2 py-1 rounded border transition-colors ${searchArchived ? 'bg-brq-gold text-black border-brq-gold font-bold' : 'bg-transparent text-white/50 border-white/10 hover:text-white'}`}
               >
                 {searchArchived ? 'إخفاء المواد النافذة' : 'بحث في المواد النافذة'}
               </button>
             </div>
             
             {loading ? (
               <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div></div>
             ) : filteredProducts.length === 0 ? (
               <div className="text-center py-12 text-white/50">
                 لا توجد نتائج تطابق بحثك.
               </div>
             ) : (
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 {filteredProducts.map(p => (
                    <Link to={`/product/${p.id}`} key={p.id} className="glass-card rounded-2xl overflow-hidden flex flex-col border border-white/5 relative group hover:border-brq-gold transition-colors">
                      <div className="w-full aspect-[4/5] bg-black/40 relative flex items-center justify-center p-0 overflow-hidden">
                         {p.finalImageUrl || p.imageUrl ? (
                           <div className="absolute inset-0">
                             <OptimizedImage src={p.finalImageUrl || p.imageUrl} alt={p.name} size="medium" className="w-full h-full" imgClassName="object-contain w-full h-full" />
                           </div>
                         ) : (
                           <span className="text-4xl opacity-50">👟</span>
                         )}
                         {p.isArchived && (
                           <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                             <span className="bg-red-500/80 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20 backdrop-blur-md">غير متوفر</span>
                           </div>
                         )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                         <div className="flex justify-between items-start mb-1">
                           <h3 className="font-bold text-xs text-white line-clamp-1">{p.name}</h3>
                         </div>
                         <div className="flex justify-between items-end mt-auto pt-2 border-t border-white/5">
                           <span className="text-xs font-mono text-white/50">{p.productCode}</span>
                           <div className="flex flex-col items-end">
                             <span className="font-bold text-brq-gold text-sm">{Number(p.price).toLocaleString()} <span className="text-[10px]">د.ع</span></span>
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
           </div>
         )}
      </div>
    </div>
  );
}
