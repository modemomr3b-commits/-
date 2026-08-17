import { formatDateTime, formatDate } from '../../utils/time';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ChevronRight, ChevronLeft, Heart, ShoppingCart, Loader2, Download, Share2, History, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
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
  const [siblingProducts, setSiblingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!location.state?.product);
  const { addToCart, updateQuantity, removeFromCart, cart, user, showToast } = useStore();
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string, alt: string } | null>(null);

  // Swipe gesture tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    let mounted = true;
    const fetchProductAndSiblings = async () => {
      try {
        const found = await api.getProductById(productId as string);
        if (mounted) {
          if (found && (found.isHidden || found.isLocked)) {
            setProduct(null);
          } else {
            setProduct(found || null);
            // Fetch siblings from same category or general list
            if (found && found.categoryId) {
              const catProducts = await api.getProductsByCategory(found.categoryId);
              const active = catProducts.filter((p: any) => !p.isArchived && !p.isHidden && !p.isLocked);
              if (mounted) setSiblingProducts(active);
            } else {
              const allProducts = await api.getProducts();
              const active = allProducts.filter((p: any) => !p.isArchived && !p.isHidden && !p.isLocked);
              if (mounted) setSiblingProducts(active);
            }
          }
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setLoading(false);
      }
    };
    fetchProductAndSiblings();
    return () => { mounted = false; };
  }, [productId]);

  // Determine prev and next products
  const currentIndex = useMemo(() => {
    if (!product || siblingProducts.length === 0) return -1;
    return siblingProducts.findIndex(p => p.id === product.id);
  }, [product, siblingProducts]);

  const prevProduct = useMemo(() => {
    if (currentIndex <= 0 || siblingProducts.length === 0) return null;
    return siblingProducts[currentIndex - 1];
  }, [currentIndex, siblingProducts]);

  const nextProduct = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= siblingProducts.length - 1 || siblingProducts.length === 0) return null;
    return siblingProducts[currentIndex + 1];
  }, [currentIndex, siblingProducts]);

  const goToNext = () => {
    if (nextProduct) {
      navigate(`/product/${nextProduct.id}`, { state: { product: nextProduct }, replace: true });
    }
  };

  const goToPrev = () => {
    if (prevProduct) {
      navigate(`/product/${prevProduct.id}`, { state: { product: prevProduct }, replace: true });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fullscreenImage) return; // handled by ImageViewer
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextProduct, prevProduct, fullscreenImage]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Horizontal swipe threshold (Right swipe in Arabic = Next product, Left swipe = Previous product)
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 600) {
      if (dx > 45) {
        goToNext();
      } else if (dx < -45) {
        goToPrev();
      }
    }
    touchStartRef.current = null;
  };

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
      <div 
        className="relative w-full bg-black/40 flex items-center justify-center min-h-[340px] cursor-pointer select-none group"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (product?.finalImageUrl || product?.imageUrl) {
            setFullscreenImage({ src: product.finalImageUrl || product.imageUrl || '', alt: product.name });
          }
        }}
     >
         {product.finalImageUrl || product.imageUrl ? (
            <OptimizedImage src={product.finalImageUrl || product.imageUrl} alt={product.name} size="full" className="w-full h-auto max-h-[70vh] object-contain transition-transform duration-300" />
         ) : null}
         
         {/* Back Button */}
         <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white z-10 hover:bg-black transition-colors">
            <ChevronRight size={24} />
         </button>

         {/* Floating Left Button (Previous Product) */}
         {prevProduct && (
           <button
             onClick={(e) => {
               e.stopPropagation();
               goToPrev();
             }}
             className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/60 hover:bg-black/90 border border-white/20 text-white rounded-full transition-all active:scale-95 shadow-xl backdrop-blur-md flex items-center justify-center group-hover:scale-105"
             title={`المنتج السابق: ${prevProduct.name || prevProduct.productCode}`}
           >
             <ChevronLeft size={22} className="text-brq-gold" />
           </button>
         )}

         {/* Floating Right Button (Next Product) */}
         {nextProduct && (
           <button
             onClick={(e) => {
               e.stopPropagation();
               goToNext();
             }}
             className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/60 hover:bg-black/90 border border-white/20 text-white rounded-full transition-all active:scale-95 shadow-xl backdrop-blur-md flex items-center justify-center group-hover:scale-105"
             title={`المنتج التالي: ${nextProduct.name || nextProduct.productCode}`}
           >
             <ChevronRight size={22} className="text-brq-gold" />
           </button>
         )}

         {/* Swipe Hint Indicator */}
         {siblingProducts.length > 1 && currentIndex >= 0 && (
           <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[11px] text-white/80 font-mono flex items-center gap-1.5 pointer-events-none">
             <span>{currentIndex + 1} من {siblingProducts.length}</span>
             <span className="text-brq-gold">↔ سحب للتنقل</span>
           </div>
         )}

         {(product.finalImageUrl || product.imageUrl) && (
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
               <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const imgUrl = product.finalImageUrl || product.imageUrl;
                    if (!imgUrl) return;
                    showToast("جاري التنزيل...", "loading");
                    try {
                      const ext = imgUrl.split('.').pop()?.split('?')[0] || 'jpg';
                      const safeName = (product.productCode || product.name || 'product').replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
                      const filename = `BRQ-${safeName}.${ext}`;
                      
                      const { downloadImages } = await import('../../utils/download');
                      const success = await downloadImages([{ url: imgUrl, filename }]);
                      
                      if (success) {
                        showToast("تم الحفظ بنجاح", "success");
                      } else {
                        showToast("حدث خطأ أثناء التنزيل", "error");
                      }
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
               {user?.role === 'admin' && (
                 <button
                   onClick={async (e) => {
                     e.stopPropagation();
                     try {
                       showToast("جاري القفل...", "loading");
                       await api.updateProduct(product.id!, { isHidden: true });
                       showToast("تم قفل المنتج بنجاح", "success");
                       navigate(-1);
                     } catch (error) {
                       console.error(error);
                       showToast("حدث خطأ أثناء قفل المنتج", "error");
                     }
                   }}
                   className="p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-red-500/50 hover:text-white transition-colors flex items-center justify-center"
                   title="قفل المنتج (للمسؤولين فقط)"
                 >
                    <Lock size={24} />
                 </button>
               )}
               <button
                 onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const imgUrl = product.finalImageUrl || product.imageUrl;
                      if (!imgUrl) return;
                      const res = await fetch(imgUrl);
                      const blob = await res.blob();
                      const ext = blob.type.split("/")[1] || "jpg";
                      const safeName = (product.productCode || product.name || "product").replace(/[\/\?<>\\:\*\|":]/g, '-');
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
                <p className="text-brq-gold text-2xl font-bold">{product.price?.toLocaleString("en-US")} <span className="text-sm">د.ع</span></p>
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
                   <p className="font-mono text-sm font-bold text-white">{product.piecePriceIqd ? product.piecePriceIqd.toLocaleString("en-US") : '---'}</p>
                </div>
                {user?.role === 'admin' && (
                  <>
                    <div className="glass-panel p-3 rounded-xl border border-white/5 bg-black/20">
                       <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">تاريخ النزول</p>
                       <p className="font-mono text-xs font-bold text-white tracking-tight">{product.createdAt ? formatDate(product.createdAt) : '---'}</p>
                    </div>
                    <div className="glass-panel p-3 rounded-xl border border-white/5 bg-black/20">
                       <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">أخر تحديث</p>
                       <p className="font-mono text-xs font-bold text-white tracking-tight">{product.updatedAt ? formatDate(product.updatedAt) : (product.createdAt ? formatDate(product.createdAt) : '---')}</p>
                    </div>
                  </>
                )}
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
      
      {fullscreenImage && (
        <ImageViewer 
          src={fullscreenImage.src} 
          alt={fullscreenImage.alt} 
          onClose={() => setFullscreenImage(null)} 
          onNext={nextProduct ? () => {
            goToNext();
            const nextImg = nextProduct.finalImageUrl || nextProduct.imageUrl;
            if (nextImg) {
              setFullscreenImage({ src: nextImg, alt: nextProduct.name });
            } else {
              setFullscreenImage(null);
            }
          } : undefined}
          onPrev={prevProduct ? () => {
            goToPrev();
            const prevImg = prevProduct.finalImageUrl || prevProduct.imageUrl;
            if (prevImg) {
              setFullscreenImage({ src: prevImg, alt: prevProduct.name });
            } else {
              setFullscreenImage(null);
            }
          } : undefined}
          hasNext={!!nextProduct}
          hasPrev={!!prevProduct}
        />
      )}
    </div>
  );
}
