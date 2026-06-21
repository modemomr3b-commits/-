import { useParams, useNavigate } from 'react-router';
import { ChevronRight, Heart, ShoppingCart, Loader2, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Product } from '../../types';
import { useStore } from '../../store';
import OptimizedImage from '../OptimizedImage';

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useStore();

  useEffect(() => {
    let mounted = true;
    const fetchProduct = async () => {
      try {
        const allProducts = await api.getProducts();
        const found = allProducts.find((p: any) => p.id === productId);
        if (mounted) {
          if (found && found.isHidden) {
            setProduct(null);
          } else {
            setProduct(found || null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setLoading(false);
      }
    };
    fetchProduct();
    return () => { mounted = false; };
  }, [productId]);

  const handleAddToCart = () => {
     if (product) {
       addToCart(product, 1);
       alert('تم إضافة المنتج للطلبية بنجاح!');
     }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <Loader2 className="animate-spin text-brq-gold" size={40} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center text-white/50 h-screen flex flex-col items-center justify-center">
        <p className="mb-4">المنتج غير موجود</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-white/10 rounded-lg">العودة</button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="relative w-full bg-black/40 flex items-center justify-center min-h-[300px]">
         {product.finalImageUrl || product.imageUrl ? (
            <OptimizedImage src={product.finalImageUrl || product.imageUrl} alt={product.name} size="full" className="w-full h-auto" />
         ) : null}
         
         <button onClick={() => navigate(-1)} className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white z-10 hover:bg-black transition-colors">
            <ChevronRight size={24} />
         </button>

         {(product.finalImageUrl || product.imageUrl) && (
            <a 
               href={product.finalImageUrl || product.imageUrl} 
               download={`BRQ-${product.name}-${product.productCode}.jpg`}
               className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white z-10 hover:bg-black transition-colors"
               title="تحميل الصورة النهائية"
            >
               <Download size={24} />
            </a>
         )}
      </div>
      
      <div className="p-5 space-y-6">
         <div>
            <div className="flex justify-between items-start mb-2">
               <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
               <button className="text-white/50 hover:text-brq-gold transition-colors">
                 <Heart size={24} />
               </button>
            </div>
            
            <div className="flex gap-4 items-baseline mb-4">
              <p className="text-brq-gold text-2xl font-bold">{product.price?.toLocaleString()} <span className="text-sm">د.ع</span></p>
              {product.packaging && <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">{product.packaging}</span>}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="glass-panel p-3 rounded-xl border border-white/5 bg-black/20">
                   <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">الرمز</p>
                   <p className="font-mono text-sm font-bold text-white tracking-widest">{product.modelNumber || '---'}</p>
                </div>
                <div className="glass-panel p-3 rounded-xl border border-white/5 bg-black/20">
                   <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">الكود</p>
                   <p className="font-mono text-sm font-bold text-brq-gold tracking-widest">{product.productCode || '---'}</p>
                </div>
                <div className="glass-panel p-3 rounded-xl border border-white/5 bg-black/20">
                   <p className="text-[10px] text-white/50 mb-1">الكمية/عدد القطع</p>
                   <p className="font-mono text-sm font-bold text-white">{product.piecesCount ? `${product.piecesCount} قطعة` : '---'}</p>
                </div>
                <div className="glass-panel p-3 rounded-xl border border-white/5 bg-black/20">
                   <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">سعر القطعة (د.ع)</p>
                   <p className="font-mono text-sm font-bold text-white">{product.piecePriceIqd ? product.piecePriceIqd.toLocaleString() : '---'}</p>
                </div>
            </div>
         </div>

         <button onClick={handleAddToCart} className="w-full flex items-center justify-center gap-2 py-4 bg-brq-royal hover:bg-blue-600 rounded-xl text-white font-bold tracking-wide shadow-[0_4px_20px_rgba(30,94,255,0.4)] transition-all hover:scale-[1.02]">
            <ShoppingCart size={20} />
            إضافة إلى الطلبية
         </button>
      </div>
    </div>
  );
}
