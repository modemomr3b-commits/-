import { useParams, useNavigate, useLocation } from 'react-router';
import { ChevronRight, Heart, ShoppingCart, Loader2, Download, Share2, History } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Product } from '../../types';
import { useStore } from '../../store';
import OptimizedImage from '../OptimizedImage';
import { PriceHistoryViewer } from './PriceHistoryViewer';
import ImageViewer from '../ImageViewer';

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<Product | null>(location.state?.product || null);
  const [loading, setLoading] = useState(!location.state?.product);
  const { addToCart, updateQuantity, removeFromCart, cart, user, showToast } = useStore();
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string, alt: string } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    let mounted = true;
    const fetchProduct = async () => {
      try {
        const found = await api.getProductById(productId as string);
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
     }
  };

  const handleUpdateQuantity = (quantity: number) => {
    if (product) {
      if (quantity <= 0) {
        removeFromCart(product.id!);
      } else {
        updateQuantity(product.id!, quantity);
      }
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
        <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="px-6 py-2 bg-white/10 rounded-lg">العودة</button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="relative w-full bg-black/40 flex items-center justify-center min-h-[300px] cursor-pointer"
          onClick={() => {
            if (product?.finalImageUrl || product?.imageUrl) {
              setFullscreenImage({ src: product.finalImageUrl || product.imageUrl || '', alt: product.name });
            }
          }}
     >
         {product.finalImageUrl || product.imageUrl ? (
            <OptimizedImage src={product.finalImageUrl || product.imageUrl} alt={product.name} size="full" className="w-full h-auto" />
         ) : null}
         
         <button onClick={() => navigate(-1)} className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white z-10 hover:bg-black transition-colors">
            <ChevronRight size={24} />
         </button>

         {(product.finalImageUrl || product.imageUrl) && (
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
               <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const imgUrl = product.finalImageUrl || product.imageUrl;
                    if (!imgUrl) return;
                    showToast("جاري التنزيل...", "loading");
                    try {
                      const res = await fetch(imgUrl);
                      const blob = await res.blob();
                      const ext = blob.type.split('/')[1] || 'jpg';
                      const safeName = (product.productCode || product.name || 'product').replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
                      const filename = `BRQ-${safeName}.${ext}`;
                      
                      const objectUrl = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = objectUrl;
                      a.download = filename;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      
                      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
                      showToast("تم التنزيل بنجاح", "success");
                    } catch (err) {
                      console.error(`Failed to download ${product.name}`, err);
                      showToast("حدث خطأ أثناء التنزيل", "error");
                    }
                  }}
                  className="p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-black transition-colors flex items-center justify-center"
                  title="تحميل الصورة النهائية"
               >
                  <Download size={24} />
               </button>
               <button
                 onClick={async () => {
                    try {
                      const imgUrl = product.finalImageUrl || product.imageUrl;
                      if (!imgUrl) return;
                      const res = await fetch(imgUrl);
                      const blob = await res.blob();
                      const ext = blob.type.split("/")[1] || "jpg";
                      const safeName = (product.productCode || product.name || "product").replace(/[\/\?<>\\:\*\|":]/g, '-');
                      const filename = `${safeName}.${ext}`;
                      const file = new File([blob], filename, { type: blob.type });

                      if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                          files: [file],
                          title: product.name,
                        });
                        showToast("تمت المشاركة بنجاح", "success");
                      } else {
                        showToast("متصفحك لا يدعم مشاركة هذه الصورة مباشرة.", "error");
                      }
                    } catch (error) {
                      console.error('Error sharing file', error);
                      showToast("حدث خطأ أثناء محاولة المشاركة.", "error");
                    }
                 }}
                 className="p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-black transition-colors flex items-center justify-center"
                 title="مشاركة الصورة"
               >
                  <Share2 size={24} />
               </button>
            </div>
         )}
      </div>
      
      <div className="p-5 space-y-6">
         <div>
            <div className="flex justify-between items-start mb-2">
               <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
               <div className="flex gap-2 items-center">
                 {product.oldPriceInfo && (
                   <button 
                     onClick={() => setHistoryProduct(product)}
                     className="p-1.5 rounded-lg bg-brq-gold/20 text-brq-gold hover:bg-brq-gold hover:text-black transition-colors"
                     title="تم تغيير السعر - عرض التاريخ"
                   >
                     <History size={24} />
                   </button>
                 )}
                 <button className="text-white/50 hover:text-brq-gold transition-colors p-1.5">
                   <Heart size={24} />
                 </button>
               </div>
            </div>
            
            <div className="flex flex-col gap-1 mb-4">
              <div className="flex gap-4 items-baseline">
                <p className="text-brq-gold text-2xl font-bold">{product.price?.toLocaleString()} <span className="text-sm">د.ع</span></p>
                {product.packaging && <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">{product.packaging}</span>}
              </div>
              {user?.role === 'admin' && product.dozenPriceUsd !== undefined && (
                <p className="text-brq-blue text-lg font-bold font-mono">
                  ${product.dozenPriceUsd} <span className="text-sm font-sans text-white/50">دولار</span>
                </p>
              )}
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
                <div className="glass-panel p-3 rounded-xl border border-white/5 bg-black/20">
                   <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">تاريخ النزول</p>
                   <p className="font-mono text-xs font-bold text-white tracking-tight">{product.createdAt ? (`${new Date(product.createdAt).getFullYear()}/${new Date(product.createdAt).getMonth() + 1}/${new Date(product.createdAt).getDate()}`) : '---'}</p>
                </div>
                <div className="glass-panel p-3 rounded-xl border border-white/5 bg-black/20">
                   <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">أخر تحديث</p>
                   <p className="font-mono text-xs font-bold text-white tracking-tight">{product.updatedAt ? (`${new Date(product.updatedAt).getFullYear()}/${new Date(product.updatedAt).getMonth() + 1}/${new Date(product.updatedAt).getDate()}`) : (product.createdAt ? (`${new Date(product.createdAt).getFullYear()}/${new Date(product.createdAt).getMonth() + 1}/${new Date(product.createdAt).getDate()}`) : '---')}</p>
                </div>
            </div>
         </div>

         {(() => {
           const cartItem = cart.find(item => item.product.id === product.id);
           if (cartItem) {
             return (
               <div className="flex items-center justify-between w-full h-14 bg-brq-royal/20 border border-brq-royal/50 rounded-xl px-4">
                 <button
                   onClick={() => handleUpdateQuantity(cartItem.quantity + 1)}
                   className="h-full px-6 text-white text-2xl hover:bg-brq-royal/50 rounded-r-xl transition-colors"
                 >
                   +
                 </button>
                 <span className="text-white font-bold text-xl">{cartItem.quantity}</span>
                 <button
                   onClick={() => handleUpdateQuantity(cartItem.quantity - 1)}
                   className="h-full px-6 text-white text-2xl hover:bg-brq-royal/50 rounded-l-xl transition-colors"
                 >
                   -
                 </button>
               </div>
             );
           }
           return (
             <button onClick={handleAddToCart} className="w-full flex items-center justify-center gap-2 py-4 bg-brq-royal hover:bg-blue-600 rounded-xl text-white font-bold tracking-wide shadow-[0_4px_20px_rgba(30,94,255,0.4)] transition-all hover:scale-[1.02]">
                <ShoppingCart size={20} />
                إضافة إلى الطلبية
             </button>
           );
         })()}
      </div>

      {historyProduct && (
        <PriceHistoryViewer product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
    </div>
  );
}
