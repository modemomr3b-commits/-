import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
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
  ChevronDown,
  ChevronUp,
  PanelRightClose,
  PanelRightOpen,
  ArrowRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import OptimizedImage from './OptimizedImage';
import { Product } from '../types';
import { formatDate } from '../utils/time';

interface ImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  product?: Product | null;
  currentIndex?: number;
  totalCount?: number;
}

export default function ImageViewer({ 
  src, 
  alt, 
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  product = null,
  currentIndex,
  totalCount
}: ImageViewerProps) {
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

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // In Arabic (RTL), Right Arrow goes Next, Left Arrow goes Prev
      if (e.key === 'ArrowRight' && onNext && hasNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev && hasPrev) onPrev();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleResetZoom();
      if (e.key === 'i' || e.key === 'I') setShowSidebar(prev => !prev);
      if (e.key === 'f' || e.key === 'F') handleToggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, hasNext, hasPrev]);

  // Mouse wheel zoom on desktop
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

  // Lock body scroll
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Reset zoom position when image src changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

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
       
       // Horizontal swipe for product navigation (Right = Next, Left = Prev in Arabic)
       if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 500) {
         if (dx > 40 && onNext && hasNext) {
           onNext();
         } else if (dx < -40 && onPrev && hasPrev) {
           onPrev();
         }
       } else if (dy > 140 && dt < 400) {
         onClose();
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
    const url = product?.id 
      ? `${window.location.origin}/product/${product.id}`
      : window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownload = async () => {
    if (!src || isDownloading) return;
    setIsDownloading(true);
    try {
      const ext = src.split('.').pop()?.split('?')[0] || 'jpg';
      const safeName = (product?.productCode || product?.name || 'product').replace(/[\/\?<>\\:\*\|":]/g, '-');
      const filename = `ALWAFAA-${safeName}.${ext}`;
      const { downloadSingleImage } = await import('../utils/download');
      await downloadSingleImage(src, filename);
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

  return (
    <div
      ref={viewerRef}
      className="fixed inset-0 z-[100] flex flex-col bg-[#07080c]/98 backdrop-blur-2xl select-none overflow-hidden text-right"
      dir="rtl"
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-30 h-16 px-4 md:px-6 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-xl shrink-0">
        {/* Left Side: Close & Info indicator */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 active:scale-95 flex items-center gap-1.5 shadow-lg group"
            title="إغلاق (Esc)"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-200" />
            <span className="text-xs font-bold hidden sm:inline">إغلاق</span>
          </button>

          {typeof currentIndex === 'number' && typeof totalCount === 'number' && (
            <div className="hidden sm:flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-white/80">
              <Layers size={14} className="text-amber-400" />
              <span>{currentIndex + 1}</span>
              <span className="text-white/40">/</span>
              <span>{totalCount}</span>
            </div>
          )}

          {product && (
            <div className="hidden lg:flex items-center gap-2 mr-2">
              <span className="text-sm font-bold text-white max-w-xs truncate">{product.name}</span>
              {product.productCode && (
                <span className="text-xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-md">
                  {product.productCode}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Tools Toolbar */}
        <div className="flex items-center gap-2">
          {/* Zoom Toolbar */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl shadow-lg">
            <button 
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 p-1.5 rounded-lg transition-all"
              title="تصغير (-)"
            >
              <ZoomOut size={17} />
            </button>
            <button
              onClick={handleResetZoom}
              className="text-white text-xs font-mono font-bold px-2 py-1 hover:bg-white/10 rounded-md transition-colors"
              title="إعادة ضبط (0)"
            >
              {Math.round(scale * 100)}%
            </button>
            <button 
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 p-1.5 rounded-lg transition-all"
              title="تكبير (+)"
            >
              <ZoomIn size={17} />
            </button>
            {scale > 1 && (
              <button
                onClick={handleResetZoom}
                className="text-amber-400 hover:bg-amber-400/20 p-1.5 rounded-lg transition-all"
                title="إعادة ضبط المقياس (0)"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>

          {/* Fullscreen button */}
          <button
            onClick={handleToggleFullscreen}
            className="hidden sm:flex p-2 text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
            title={isFullscreen ? "إنهاء ملء الشاشة (F)" : "ملء الشاشة (F)"}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>

          {/* Toggle Sidebar (Desktop) / Sheet (Mobile) button */}
          {product && (
            <button
              onClick={() => {
                setShowSidebar(!showSidebar);
                setShowMobileSheet(!showMobileSheet);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-lg ${
                showSidebar 
                  ? "bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.2)]" 
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
              title="إظهار / إخفاء تفاصيل المنتج (I)"
            >
              {showSidebar ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
              <span className="hidden md:inline">التفاصيل</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body: Image Stage + Details Sidebar */}
      <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Cinema Image Canvas */}
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
          {/* Floating Left Arrow (Previous Product in RTL) */}
          {onPrev && hasPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-30 p-3.5 md:p-4 bg-black/70 hover:bg-black/90 border border-white/20 hover:border-amber-400/50 text-white rounded-full transition-all active:scale-90 shadow-2xl backdrop-blur-xl hover:scale-105 group"
              title="المنتج السابق (سهم يسار)"
            >
              <ChevronLeft size={28} className="text-white group-hover:text-amber-400 transition-colors" />
            </button>
          )}

          {/* Floating Right Arrow (Next Product in RTL) */}
          {onNext && hasNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-30 p-3.5 md:p-4 bg-black/70 hover:bg-black/90 border border-white/20 hover:border-amber-400/50 text-white rounded-full transition-all active:scale-90 shadow-2xl backdrop-blur-xl hover:scale-105 group"
              title="المنتج التالي (سهم يمين)"
            >
              <ChevronRight size={28} className="text-white group-hover:text-amber-400 transition-colors" />
            </button>
          )}

          {/* High Res Center Image */}
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
               src={src} 
               alt={alt} 
               size="full"
               className="w-auto h-auto max-h-[82vh] max-w-[88vw] md:max-w-[70vw] drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)] !pointer-events-none"
               imgClassName="w-auto h-auto max-h-[82vh] max-w-[88vw] md:max-w-[70vw] object-contain rounded-2xl"
             />
          </div>

          {/* Desktop zoom hint pill */}
          <div className="absolute bottom-4 left-6 hidden md:flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-[11px] text-white/60 font-mono pointer-events-none shadow-lg">
            <span>عجلة الماوس: تكبير/تصغير</span>
            <span>•</span>
            <span>الأسهم ➔ ⬅: تنقل</span>
            <span>•</span>
            <span>Esc: خروج</span>
          </div>
        </div>

        {/* Dedicated Luxury Product Sidebar (Desktop) */}
        {product && showSidebar && (
          <aside 
            className="hidden md:flex flex-col w-96 lg:w-[420px] bg-zinc-950/95 backdrop-blur-2xl border-r border-white/10 shrink-0 z-20 overflow-y-auto animate-in slide-in-from-right-6 duration-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-6 flex-1">
              
              {/* Product Header */}
              <div className="space-y-2.5 pb-5 border-b border-white/10">
                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2">
                  {product.isShowcase && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-amber-500/30 to-amber-600/30 text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-sm">
                      <Sparkles size={13} className="text-amber-400" />
                      معرض شركة الوفاء ({product.showcaseCategory || 'عام'})
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 text-white/80 border border-white/10">
                    متاح للطلب 🟢
                  </span>
                </div>

                <h2 className="text-xl lg:text-2xl font-black text-white leading-snug">
                  {product.name}
                </h2>

                {/* Codes & Model Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {product.productCode && (
                    <button
                      onClick={() => handleCopyCode(product.productCode)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold transition-colors group"
                      title="انقر لنسخ كود المنتج"
                    >
                      <Tag size={13} className="text-amber-400" />
                      <span>الكود: {product.productCode}</span>
                      {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="opacity-50 group-hover:opacity-100" />}
                    </button>
                  )}

                  {product.modelNumber && (
                    <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/80">
                      الرمز: {product.modelNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-400/30 space-y-1 shadow-lg col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-amber-300/80 block">سعر الدرزن (الجملة)</span>
                  <div className="font-mono text-2xl font-black text-amber-300">
                    {product.price ? `${product.price.toLocaleString("en-US")}` : '---'}
                    <span className="text-xs font-bold mr-1">د.ع</span>
                  </div>
                  {product.dozenPriceUsd !== undefined && (
                    <span className="text-xs font-mono text-blue-400 block font-bold">
                      ${product.dozenPriceUsd} USD
                    </span>
                  )}
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1 shadow-lg col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-white/50 block">سعر القطعة (المفرد)</span>
                  <div className="font-mono text-2xl font-black text-white">
                    {product.piecePriceIqd ? `${product.piecePriceIqd.toLocaleString("en-US")}` : '---'}
                    <span className="text-xs font-bold mr-1 text-white/60">د.ع</span>
                  </div>
                  <span className="text-[10px] text-white/40 block">سعر التكسير المعتمد</span>
                </div>
              </div>

              {/* Specs & Packaging Details */}
              <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-4 space-y-3">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">تفاصيل التعبئة والمواصفات</h3>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-white/80">
                    <Package size={16} className="text-amber-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-white/40 block">التعبئة</span>
                      <span className="font-bold font-mono">
                        {product.piecesCount ? `${product.piecesCount} قطعة` : (product.packaging || '12 قطعة')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-white/80">
                    <Calendar size={16} className="text-blue-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-white/40 block">تاريخ الإضافة</span>
                      <span className="font-bold font-mono">{product.createdAt ? formatDate(product.createdAt) : '-'}</span>
                    </div>
                  </div>

                  {product.views !== undefined && (
                    <div className="flex items-center gap-2 text-white/80">
                      <Eye size={16} className="text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-white/40 block">المشاهدات</span>
                        <span className="font-bold font-mono">{product.views} مشاهدة</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleWhatsAppShare}
                    className="py-3 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <MessageCircle size={16} className="text-emerald-400" />
                    <span>مشاركة واتساب</span>
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="py-3 px-3 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
                    <span>{copiedLink ? "تم نسخ الرابط" : "نسخ الرابط"}</span>
                  </button>
                </div>
              </div>

              {/* Quick Navigation Footer inside Sidebar */}
              {(hasPrev || hasNext) && (
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <button
                    onClick={onPrev}
                    disabled={!hasPrev}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
                  >
                    <ArrowRight size={15} />
                    <span>السابق</span>
                  </button>

                  <button
                    onClick={onNext}
                    disabled={!hasNext}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
                  >
                    <span>التالي</span>
                    <ArrowLeft size={15} />
                  </button>
                </div>
              )}

            </div>
          </aside>
        )}

        {/* Mobile Bottom Collapsible Sheet */}
        {product && (
          <div 
            className={`md:hidden absolute bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl transition-transform duration-300 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] ${
              showMobileSheet ? "translate-y-0" : "translate-y-[calc(100%-48px)]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <button 
              onClick={() => setShowMobileSheet(!showMobileSheet)}
              className="w-full py-3 flex items-center justify-center text-white/50 hover:text-white"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mb-1" />
            </button>

            <div className="px-5 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
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

              {/* Mobile Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="py-2.5 px-3 bg-amber-400 text-black font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <Download size={15} />
                  <span>تحميل الصورة</span>
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="py-2.5 px-3 bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <MessageCircle size={15} />
                  <span>مشاركة واتساب</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

