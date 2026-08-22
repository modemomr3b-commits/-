import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Maximize, 
  Minimize, 
  MessageCircle, 
  Tag, 
  Package, 
  Calendar, 
  Eye, 
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShoppingCart,
  Plus,
  Minus,
  History,
  Lock,
  Hash
} from 'lucide-react';
import { api } from '../../api';
import { Product } from '../../types';
import { useStore } from '../../store';
import OptimizedImage from '../OptimizedImage';
import { formatDate } from '../../utils/time';
import { PriceHistoryViewer } from './PriceHistoryViewer';

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [product, setProduct] = useState<Product | null>(location.state?.product || null);
  const [siblingProducts, setSiblingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!location.state?.product);
  
  const { addToCart, updateQuantity, removeFromCart, cart, user, showToast } = useStore();
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  // Viewer state
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMobileSheet, setShowMobileSheet] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  const [hasDragged, setHasDragged] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);

  // Fetch product and sibling products
  useEffect(() => {
    let mounted = true;
    const fetchProductAndSiblings = async () => {
      try {
        const found = await api.getProductById(productId as string);
        if (mounted) {
          setProduct(found || null);
          if (found && found.categoryId) {
            const catProducts = await api.getProductsByCategory(found.categoryId);
            const active = catProducts.filter((p: any) => !p.isArchived && !p.isHidden && !p.isLocked);
            if (mounted) setSiblingProducts(active);
          } else {
            const allProducts = await api.getProducts();
            const active = allProducts.filter((p: any) => !p.isArchived && !p.isHidden && !p.isLocked);
            if (mounted) setSiblingProducts(active);
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

  // Determine current index, prev and next products
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

  // Zoom helpers
  const handleZoomIn = () => setScale(s => Math.min(Number((s + 0.5).toFixed(1)), 4));
  const handleZoomOut = () => {
    setScale(s => {
      const newScale = Math.max(Number((s - 0.5).toFixed(1)), 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  };
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate(-1);
      }
      if (e.key === 'ArrowRight' && nextProduct) goToNext();
      if (e.key === 'ArrowLeft' && prevProduct) goToPrev();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleResetZoom();
      if (e.key === 'i' || e.key === 'I') setShowSidebar(prev => !prev);
      if (e.key === 'f' || e.key === 'F') handleToggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextProduct, prevProduct, navigate]);

  // Mouse wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setScale(s => Math.min(Number((s + 0.25).toFixed(2)), 4));
      } else {
        setScale(s => {
          const newScale = Math.max(Number((s - 0.25).toFixed(2)), 1);
          if (newScale === 1) setPosition({ x: 0, y: 0 });
          return newScale;
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Reset zoom on product change
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [productId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setHasDragged(false);
    if (scale <= 1) {
      setTouchStart({ x: e.clientX, y: e.clientY, time: Date.now() });
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (scale <= 1 && touchStart) {
       const dx = e.clientX - touchStart.x;
       const dy = e.clientY - touchStart.y;
       if (Math.abs(dx) > 10 || Math.abs(dy) > 10) setHasDragged(true);
       return;
    }
    if (!isDragging || scale <= 1) return;
    setHasDragged(true);
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (scale <= 1 && touchStart) {
       const dx = e.clientX - touchStart.x;
       const dy = e.clientY - touchStart.y;
       const dt = Date.now() - touchStart.time;
       
       if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 500) {
         if (dx > 40 && nextProduct) {
           goToNext();
         } else if (dx < -40 && prevProduct) {
           goToPrev();
         }
       } else if (dy > 140 && dt < 400) {
         navigate(-1);
       }
       setTouchStart(null);
    }
    setIsDragging(false);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownload = async () => {
    const imgUrl = product?.finalImageUrl || product?.imageUrl;
    if (!imgUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      const ext = imgUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const safeName = (product?.productCode || product?.name || 'product').replace(/[\/\?<>\\:\*\|":]/g, '-');
      const filename = `ALWAFAA-${safeName}.${ext}`;
      const { downloadSingleImage } = await import('../../utils/download');
      await downloadSingleImage(imgUrl, filename);
    } catch (e) {
      console.error("Download error:", e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!product) return;
    const priceText = product.price ? `${product.price.toLocaleString('en-US')} د.ع` : '';
    const pieceText = product.piecePriceIqd ? `سعر القطعة: ${product.piecePriceIqd.toLocaleString('en-US')} د.ع` : '';
    const codeText = product.productCode ? `الكود: ${product.productCode}` : '';
    const modelText = product.modelNumber ? `الرمز: ${product.modelNumber}` : '';
    const linkText = `${window.location.origin}/product/${product.id}`;
    
    const message = `✨ *شركة الوفاء المتميز*\n\n👟 *${product.name}*\n${codeText ? `🏷️ ${codeText}\n` : ''}${modelText ? `🔢 ${modelText}\n` : ''}${priceText ? `💰 سعر الدرزن: ${priceText}\n` : ''}${pieceText ? `💵 ${pieceText}\n` : ''}\n🔗 *رابط المنتج:* ${linkText}`;
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050608] text-white">
        <Loader2 className="animate-spin text-amber-400" size={40} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050608] text-white/60 p-6 text-center">
        <p className="text-lg mb-4">المنتج غير موجود أو تم حذفه</p>
        <button 
          onClick={() => navigate(-1)} 
          className="px-6 py-2.5 bg-amber-400 text-black font-bold rounded-xl shadow-lg hover:bg-amber-300 transition-colors"
        >
          العودة
        </button>
      </div>
    );
  }

  const imageUrl = product.finalImageUrl || product.imageUrl || '';
  const cartItem = cart.find(item => item.product.id === product.id);

  return (
    <div
      ref={viewerRef}
      className="fixed inset-0 z-40 md:z-50 flex flex-col bg-[#050608]/98 backdrop-blur-2xl select-none overflow-hidden text-white"
    >
      {/* Top Header Bar */}
      <header className="relative z-30 h-16 px-4 md:px-6 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-xl shrink-0">
        
        {/* Left Side: Details Button, Fullscreen, Zoom Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              setShowSidebar(!showSidebar);
              setShowMobileSheet(!showMobileSheet);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-lg cursor-pointer ${
              showSidebar 
                ? "bg-amber-400/15 text-amber-300 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.15)]" 
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
            title="إظهار / إخفاء التفاصيل"
          >
            <Layers size={16} className={showSidebar ? "text-amber-400" : "text-white/60"} />
            <span>التفاصيل</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer"
            title={isFullscreen ? "إنهاء ملء الشاشة (F)" : "ملء الشاشة (F)"}
          >
            {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl shadow-lg">
            <button 
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 p-1.5 rounded-lg transition-all cursor-pointer"
              title="تصغير (-)"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleResetZoom}
              className="text-white text-xs font-mono font-bold px-2 py-1 hover:bg-white/10 rounded-md transition-colors min-w-[50px] text-center cursor-pointer"
              title="إعادة ضبط (0)"
            >
              {Math.round(scale * 100)}%
            </button>
            <button 
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 p-1.5 rounded-lg transition-all cursor-pointer"
              title="تكبير (+)"
            >
              <ZoomIn size={16} />
            </button>
            {scale > 1 && (
              <button
                onClick={handleResetZoom}
                className="text-amber-400 hover:bg-amber-400/20 p-1.5 rounded-lg transition-all cursor-pointer"
                title="إعادة ضبط المقياس (0)"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Product Title + Code Badge, Sibling Counter, Close / Back Button */}
        <div className="flex items-center gap-2 sm:gap-3" dir="rtl">
          <div className="flex items-center gap-2">
            {product.productCode && (
              <span className="text-xs font-mono font-black bg-amber-400 text-black px-2 py-0.5 rounded shadow-sm">
                {product.productCode}
              </span>
            )}
            <span className="text-sm sm:text-base font-bold text-white max-w-[140px] sm:max-w-xs md:max-w-md truncate">
              {product.name}
            </span>
          </div>

          {siblingProducts.length > 0 && currentIndex >= 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-black/50 border border-white/15 px-3 py-1 rounded-xl text-xs font-mono text-white/80">
              <Layers size={13} className="text-amber-400" />
              <span>{currentIndex + 1}</span>
              <span className="text-white/40">/</span>
              <span>{siblingProducts.length}</span>
            </div>
          )}

          {/* Close / Return Button */}
          <button 
            onClick={() => navigate(-1)}
            className="px-3.5 py-1.5 text-white bg-white/10 hover:bg-red-500/80 rounded-xl transition-all border border-white/15 active:scale-95 flex items-center gap-1.5 shadow-lg group text-xs font-bold cursor-pointer"
            title="العودة (Esc)"
          >
            <X size={17} className="group-hover:rotate-90 transition-transform duration-200" />
            <span>إغلاق</span>
          </button>
        </div>
      </header>

      {/* Main Body: Details Sidebar on LEFT + Image Stage on CENTER */}
      <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Dedicated Product Details Sidebar on the LEFT (Desktop) */}
        {showSidebar && (
          <aside 
            className="hidden md:flex flex-col w-[360px] lg:w-[390px] bg-[#0c0d12]/95 backdrop-blur-2xl border-r border-white/10 shrink-0 z-20 overflow-y-auto animate-in slide-in-from-left duration-200 shadow-2xl"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-5 flex-1 text-right">
              
              {/* Product Header */}
              <div className="space-y-2.5 pb-4 border-b border-white/10">
                {/* Availability Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      متاح للطلب
                    </span>
                    {product.isShowcase && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                        <Sparkles size={12} className="text-amber-400" />
                        معرض
                      </span>
                    )}
                  </div>
                  
                  {product.oldPriceInfo && (
                    <button 
                      onClick={() => setHistoryProduct(product)}
                      className="p-1.5 rounded-lg bg-amber-400/15 text-amber-400 hover:bg-amber-400 hover:text-black transition-colors border border-amber-400/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="تم تغيير السعر - عرض التاريخ"
                    >
                      <History size={14} />
                      <span>تاريخ السعر</span>
                    </button>
                  )}
                </div>

                {/* Product Title */}
                <h2 className="text-xl lg:text-2xl font-black text-white leading-tight">
                  {product.name}
                </h2>

                {/* Product Code & Model Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {product.productCode && (
                    <button
                      onClick={() => handleCopyCode(product.productCode)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold transition-colors group cursor-pointer"
                      title="انقر لنسخ كود المنتج"
                    >
                      <Tag size={13} className="text-amber-400" />
                      <span>الكود: {product.productCode}</span>
                      {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="opacity-50 group-hover:opacity-100" />}
                    </button>
                  )}

                  {product.modelNumber && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs font-mono">
                      <Hash size={12} className="text-white/40" />
                      <span>الرمز: {product.modelNumber}</span>
                    </span>
                  )}

                  {product.isArchived && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold">
                      📦 مادة نافذة (أرشيف)
                    </span>
                  )}

                  {product.isLocked && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                      🔒 مقفل من الإدارة
                    </span>
                  )}

                  {product.isHidden && !product.isArchived && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-700/40 border border-zinc-600/40 text-zinc-300 text-xs font-bold">
                      🚫 غير مفعل
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing Cards (2 Columns: Right is Wholesale / Left is Piece) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Wholesale Price Box (Gold Gradient) */}
                <div className="bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-amber-600/5 p-4 rounded-2xl border border-amber-400/40 text-center space-y-1 shadow-lg">
                  <span className="text-[11px] font-bold text-amber-300/80 block">سعر الدرزن (الجملة)</span>
                  <div className="font-mono text-2xl font-black text-amber-400">
                    {product.price ? `${product.price.toLocaleString("en-US")}` : '---'}
                    <span className="text-xs font-bold mr-1 text-amber-300/70">د.ع</span>
                  </div>
                  {product.dozenPriceUsd !== undefined && (
                    <span className="text-xs font-mono text-blue-400 block font-bold">
                      ${product.dozenPriceUsd} USD
                    </span>
                  )}
                </div>

                {/* Piece Price Box (Dark Glass) */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center space-y-1 shadow-lg">
                  <span className="text-[11px] font-bold text-white/50 block">سعر القطعة (المفرد)</span>
                  <div className="font-mono text-2xl font-black text-white">
                    {product.piecePriceIqd ? `${product.piecePriceIqd.toLocaleString("en-US")}` : '---'}
                    <span className="text-xs font-bold mr-1 text-white/60">د.ع</span>
                  </div>
                  <span className="text-[10px] text-white/40 block">سعر التكسير المعتمد</span>
                </div>
              </div>

              {/* Specs & Packaging Box */}
              <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-4 space-y-3">
                <h3 className="text-xs font-bold text-white/50">تفاصيل التعبئة والمواصفات</h3>
                
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-white/80 py-1 border-b border-white/5">
                    <span className="text-white/40 flex items-center gap-1.5">
                      <Package size={15} className="text-amber-400" /> التعبئة
                    </span>
                    <span className="font-bold font-mono text-white">
                      {product.piecesCount ? `${product.piecesCount} قطعة` : (product.packaging || '12 قطعة')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-white/80 py-1 border-b border-white/5">
                    <span className="text-white/40 flex items-center gap-1.5">
                      <Calendar size={15} className="text-blue-400" /> تاريخ النزول
                    </span>
                    <span className="font-bold font-mono text-white">
                      {product.createdAt ? formatDate(product.createdAt) : '-'}
                    </span>
                  </div>

                  {product.views !== undefined && (
                    <div className="flex items-center justify-between text-white/80 py-1">
                      <span className="text-white/40 flex items-center gap-1.5">
                        <Eye size={15} className="text-emerald-400" /> المشاهدات
                      </span>
                      <span className="font-bold font-mono text-white">
                        {product.views} مشاهدة
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cart / Add to Order Section */}
              <div className="pt-1">
                {cartItem ? (
                  <div className="flex items-center justify-between w-full h-13 bg-blue-600/20 border border-blue-500/40 rounded-xl px-3 shadow-lg">
                    <button
                      onClick={() => handleUpdateQuantity(cartItem.quantity + 1)}
                      className="h-full px-4 text-white text-xl hover:bg-blue-600/30 rounded-lg transition-colors font-bold cursor-pointer"
                      title="زيادة الكمية"
                    >
                      <Plus size={18} />
                    </button>
                    <div className="flex items-center gap-2 text-white font-mono font-bold">
                      <span className="text-xs text-blue-300">في السلة:</span>
                      <span className="text-lg">{cartItem.quantity}</span>
                    </div>
                    <button
                      onClick={() => handleUpdateQuantity(cartItem.quantity - 1)}
                      className="h-full px-4 text-white text-xl hover:bg-blue-600/30 rounded-lg transition-colors font-bold cursor-pointer"
                      title="إنقاص الكمية"
                    >
                      <Minus size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-[0_4px_20px_rgba(37,99,235,0.4)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingCart size={18} />
                    <span>إضافة إلى الطلبية</span>
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                {/* High Res Download Button */}
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(251,191,36,0.25)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>جاري تحميل الصورة...</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>تحميل الصورة بدقة عالية</span>
                    </>
                  )}
                </button>

                {/* WhatsApp & Copy Link Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleWhatsAppShare}
                    className="py-3 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <MessageCircle size={16} className="text-emerald-400" />
                    <span>مشاركة واتساب</span>
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="py-3 px-3 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
                    <span>{copiedLink ? "تم نسخ الرابط" : "نسخ الرابط"}</span>
                  </button>
                </div>

                {/* Quick Navigation Footer */}
                {(prevProduct || nextProduct) && (
                  <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
                    <button
                      onClick={goToPrev}
                      disabled={!prevProduct}
                      className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ArrowRight size={14} />
                      <span>السابق</span>
                    </button>

                    <button
                      onClick={goToNext}
                      disabled={!nextProduct}
                      className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>التالي</span>
                      <ArrowLeft size={14} />
                    </button>
                  </div>
                )}
              </div>

            </div>
          </aside>
        )}

        {/* Center Cinema Image Stage */}
        <div 
          ref={containerRef}
          className={`flex-1 relative flex items-center justify-center p-4 md:p-8 overflow-hidden ${
            scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Floating Left Arrow Button (Previous Product) */}
          {prevProduct && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-black/70 hover:bg-black/95 border border-white/20 hover:border-amber-400/60 text-white rounded-full transition-all active:scale-90 shadow-2xl backdrop-blur-xl flex items-center justify-center hover:scale-105 group cursor-pointer"
              title="المنتج السابق (سهم يسار)"
            >
              <ChevronLeft size={28} className="text-white group-hover:text-amber-400 transition-colors" />
            </button>
          )}

          {/* Floating Right Arrow Button (Next Product) */}
          {nextProduct && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 bg-black/70 hover:bg-black/95 border border-white/20 hover:border-amber-400/60 text-white rounded-full transition-all active:scale-90 shadow-2xl backdrop-blur-xl flex items-center justify-center hover:scale-105 group cursor-pointer"
              title="المنتج التالي (سهم يمين)"
            >
              <ChevronRight size={28} className="text-white group-hover:text-amber-400 transition-colors" />
            </button>
          )}

          {/* High Res Centered Image */}
          <div
            style={{ 
               transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
               transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)'
            }}
            className="relative flex items-center justify-center max-h-[86vh] max-w-[92vw] pointer-events-auto"
            onClick={(e) => {
              if (hasDragged) {
                e.stopPropagation();
                return;
              }
              const now = Date.now();
              if (now - lastTap.current < 300) {
                 if (scale > 1) {
                    handleResetZoom();
                 } else {
                    setScale(2.5);
                 }
                 e.stopPropagation();
              } else {
                 lastTap.current = now;
              }
            }}
          >
             <OptimizedImage 
               src={imageUrl} 
               alt={product.name} 
               size="full"
               className="w-auto h-auto max-h-[82vh] max-w-[88vw] md:max-w-[70vw] drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)] !pointer-events-none"
               imgClassName="w-auto h-auto max-h-[82vh] max-w-[88vw] md:max-w-[70vw] object-contain rounded-2xl"
             />
          </div>

          {/* Desktop Zoom & Keyboard Hints Pill at the Bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-3 bg-black/75 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[11px] text-white/70 font-mono pointer-events-none shadow-xl">
            <span>عجلة الماوس: تكبير/تصغير</span>
            <span>•</span>
            <span>الأسهم ➔ ⬅: تنقل</span>
            <span>•</span>
            <span>Esc: خروج</span>
          </div>
        </div>

        {/* Mobile Bottom Collapsible Sheet */}
        <div 
          className={`md:hidden absolute bottom-0 left-0 right-0 z-30 bg-[#0c0d12]/98 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl transition-transform duration-300 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] ${
            showMobileSheet ? "translate-y-0" : "translate-y-[calc(100%-48px)]"
          }`}
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sheet Handle */}
          <button 
            onClick={() => setShowMobileSheet(!showMobileSheet)}
            className="w-full py-3 flex items-center justify-center text-white/50 hover:text-white cursor-pointer"
          >
            <div className="w-12 h-1.5 bg-white/20 rounded-full mb-1" />
          </button>

          <div className="px-5 pb-6 space-y-4 max-h-[60vh] overflow-y-auto text-right">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-white leading-tight">
                  {product.name}
                </h2>
                {product.productCode && (
                  <span className="inline-block mt-1 text-[11px] font-mono text-amber-300 font-bold bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded">
                    كود: {product.productCode}
                  </span>
                )}
              </div>
              <div className="text-left font-mono font-black text-amber-300 text-lg">
                {product.price ? `${product.price.toLocaleString("en-US")} د.ع` : ''}
              </div>
            </div>

            {/* Mobile Specs Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <span className="text-white/40 text-[10px] block">سعر القطعة</span>
                <span className="font-bold font-mono text-white">
                  {product.piecePriceIqd ? `${product.piecePriceIqd.toLocaleString("en-US")} د.ع` : '---'}
                </span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <span className="text-white/40 text-[10px] block">التعبئة</span>
                <span className="font-bold font-mono text-white">
                  {product.piecesCount ? `${product.piecesCount} قطعة` : (product.packaging || '12 قطعة')}
                </span>
              </div>
            </div>

            {/* Mobile Cart Button */}
            {cartItem ? (
              <div className="flex items-center justify-between w-full h-12 bg-blue-600/20 border border-blue-500/40 rounded-xl px-3">
                <button
                  onClick={() => handleUpdateQuantity(cartItem.quantity + 1)}
                  className="h-full px-4 text-white text-lg font-bold"
                >
                  <Plus size={16} />
                </button>
                <div className="flex items-center gap-2 text-white font-mono font-bold">
                  <span className="text-xs text-blue-300">في السلة:</span>
                  <span>{cartItem.quantity}</span>
                </div>
                <button
                  onClick={() => handleUpdateQuantity(cartItem.quantity - 1)}
                  className="h-full px-4 text-white text-lg font-bold"
                >
                  <Minus size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <ShoppingCart size={16} />
                <span>إضافة إلى الطلبية</span>
              </button>
            )}

            {/* Mobile Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="py-2.5 px-3 bg-amber-400 text-black font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Download size={15} />
                <span>تحميل الصورة</span>
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="py-2.5 px-3 bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle size={15} />
                <span>مشاركة واتساب</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Price History Modal */}
      {historyProduct && (
        <PriceHistoryViewer product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
    </div>
  );
}
