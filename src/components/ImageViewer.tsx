import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Info, RotateCcw, Download, Share2 } from 'lucide-react';
import OptimizedImage from './OptimizedImage';
import { Product } from '../types';

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
  const [showDetails, setShowDetails] = useState(true);
  
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

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleResetZoom();
      if (e.key === 'i' || e.key === 'I') setShowDetails(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  // Mouse wheel zoom on desktop
  const containerRef = useRef<HTMLDivElement>(null);
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
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Reset zoom position when image src changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

  const [hasDragged, setHasDragged] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number, y: number, time: number } | null>(null);
  const lastTap = useRef(0);

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
         if (dx > 40 && onNext) {
           onNext();
         } else if (dx < -40 && onPrev) {
           onPrev();
         }
       } else if (dy > 120 && dt < 400) {
         onClose();
       }
       setTouchStart(null);
    }
    setIsDragging(false);
  };

  const handleWrapperClick = () => {
    if (!hasDragged && scale <= 1) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md select-none overflow-hidden"
      onClick={handleWrapperClick}
    >
      {/* Top Header Bar */}
      <div
        className="absolute top-0 left-0 right-0 p-3 md:p-4 flex items-center justify-between z-30 bg-gradient-to-b from-black/90 via-black/50 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-md active:scale-95"
            title="إغلاق (Esc)"
          >
            <X size={22} />
          </button>

          {typeof currentIndex === 'number' && typeof totalCount === 'number' && (
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-mono text-white/80">
              <span>{currentIndex + 1}</span> / <span>{totalCount}</span>
            </div>
          )}
        </div>
           
        {/* Controls Toolbar */}
        <div className="flex items-center gap-2">
          {product && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md transition-all border ${
                showDetails 
                  ? "bg-brq-gold text-black border-brq-gold shadow-[0_0_12px_rgba(251,191,36,0.4)]" 
                  : "bg-white/10 text-white/80 border-white/15 hover:bg-white/20"
              }`}
              title="إظهار / إخفاء تفاصيل المنتج (I)"
            >
              <Info size={16} />
              <span className="hidden sm:inline">تفاصيل المنتج</span>
            </button>
          )}

          <div className="flex items-center gap-1 sm:gap-2 bg-white/10 backdrop-blur-md px-2.5 sm:px-4 py-1.5 rounded-full border border-white/15 shadow-lg">
            <button 
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="text-white/80 hover:text-white disabled:opacity-30 p-1 rounded transition-colors"
              title="تصغير (-)"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-white text-xs font-mono font-bold min-w-[45px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button 
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="text-white/80 hover:text-white disabled:opacity-30 p-1 rounded transition-colors"
              title="تكبير (+)"
            >
              <ZoomIn size={18} />
            </button>
            {scale > 1 && (
              <button
                onClick={handleResetZoom}
                className="text-brq-gold hover:text-yellow-300 p-1 rounded transition-colors border-r border-white/20 pr-1.5 mr-1"
                title="إعادة ضبط (0)"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Left Arrow (Previous) */}
      {onPrev && hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-30 p-3 md:p-3.5 bg-black/70 hover:bg-black/90 border border-white/20 text-white rounded-full transition-all active:scale-90 shadow-2xl backdrop-blur-md hover:scale-105 group"
          title="المنتج السابق (سهم يسار)"
        >
          <ChevronLeft size={28} className="text-white group-hover:text-brq-gold transition-colors" />
        </button>
      )}

      {/* Floating Right Arrow (Next) */}
      {onNext && hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-30 p-3 md:p-3.5 bg-black/70 hover:bg-black/90 border border-white/20 text-white rounded-full transition-all active:scale-90 shadow-2xl backdrop-blur-md hover:scale-105 group"
          title="المنتج التالي (سهم يمين)"
        >
          <ChevronRight size={28} className="text-white group-hover:text-brq-gold transition-colors" />
        </button>
      )}

      {/* Main Image Display Area */}
      <div 
        ref={containerRef}
        className={`w-full h-full flex items-center justify-center p-2 md:p-8 relative ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          style={{ 
             transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
             transition: isDragging ? 'none' : 'transform 0.15s ease-out'
          }}
          className="relative flex items-center justify-center max-h-[85vh] max-w-[92vw] md:max-w-[85vw] pointer-events-auto"
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
                  setScale(2.2);
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
             className="w-auto h-auto max-h-[82vh] max-w-[90vw] md:max-w-[85vw] drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] !pointer-events-none"
             imgClassName="w-auto h-auto max-h-[82vh] max-w-[90vw] md:max-w-[85vw] object-contain rounded-lg"
           />
        </div>
      </div>

      {/* Product Details Floating Card (Full specifications on PC & Mobile) */}
      {product && showDetails && (
        <div 
          className="absolute bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:max-w-md z-30 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-bottom-4 duration-200"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-2.5 mb-3">
            <div>
              <h2 className="text-white font-bold text-sm md:text-base leading-tight">
                {product.name}
              </h2>
              {product.productCode && (
                <span className="inline-block mt-1 text-[11px] font-mono text-brq-gold font-bold bg-brq-gold/10 border border-brq-gold/30 px-2 py-0.5 rounded">
                  الكود: {product.productCode}
                </span>
              )}
            </div>
            <button 
              onClick={() => setShowDetails(false)}
              className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              title="إخفاء التفاصيل"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-white/50 text-[10px] block mb-0.5">سعر الجملة</span>
              <span className="text-brq-gold font-bold font-mono text-sm">
                {product.price ? `${product.price.toLocaleString("en-US")} د.ع` : '---'}
              </span>
            </div>

            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-white/50 text-[10px] block mb-0.5">سعر القطعة</span>
              <span className="text-white font-bold font-mono text-sm">
                {product.piecePriceIqd ? `${product.piecePriceIqd.toLocaleString("en-US")} د.ع` : '---'}
              </span>
            </div>

            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-white/50 text-[10px] block mb-0.5">الرمز / الموديل</span>
              <span className="text-white font-mono font-medium">
                {product.modelNumber || '---'}
              </span>
            </div>

            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-white/50 text-[10px] block mb-0.5">عدد القطع / التعبئة</span>
              <span className="text-white font-mono font-medium">
                {product.piecesCount ? `${product.piecesCount} قطعة` : (product.packaging || '---')}
              </span>
            </div>
          </div>

          {/* Desktop Keyboard hint */}
          <div className="hidden md:flex items-center justify-between mt-3 pt-2 border-t border-white/10 text-[10px] text-white/50 font-mono">
            <span>عجلة الماوس: تكبير / تصغير</span>
            <span>الأسهم ➔ ⬅: التنقل</span>
          </div>
        </div>
      )}
    </div>
  );
}
