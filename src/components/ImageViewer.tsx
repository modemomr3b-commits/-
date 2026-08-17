import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import OptimizedImage from './OptimizedImage';

interface ImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export default function ImageViewer({ 
  src, 
  alt, 
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false
}: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 4));
  const handleZoomOut = () => {
    setScale(s => {
      const newScale = Math.max(s - 0.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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
       } else if (dy > 100 && dt < 400) {
         onClose();
       }
       setTouchStart(null);
    }
    setIsDragging(false);
  };

  const handleWrapperClick = () => {
    if (!hasDragged) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm touch-none transition-opacity duration-300 select-none"
      onClick={handleWrapperClick}
    >
      <div
        className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
        >
          <X size={24} />
        </button>
           
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <button 
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="text-white/70 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-white text-xs font-mono font-bold mx-2">
            {Math.round(scale * 100)}%
          </span>
          <button 
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="text-white/70 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ZoomIn size={20} />
          </button>
        </div>
      </div>

      {/* Floating Left Arrow (Previous) */}
      {onPrev && hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-black/90 border border-white/20 text-white rounded-full transition-transform active:scale-90 shadow-2xl backdrop-blur-md"
          title="المنتج السابق"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Floating Right Arrow (Next) */}
      {onNext && hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-black/90 border border-white/20 text-white rounded-full transition-transform active:scale-90 shadow-2xl backdrop-blur-md"
          title="المنتج التالي"
        >
          <ChevronRight size={28} />
        </button>
      )}

      <div 
        className="w-full h-full flex items-center justify-center p-4 md:p-10 cursor-move relative"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          style={{ 
             transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
             transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
          className="relative flex items-center justify-center w-full h-full max-h-[90vh] max-w-[90vw]"
          onClick={(e) => {
            if (hasDragged) {
              e.stopPropagation();
              return;
            }
            const now = Date.now();
            if (now - lastTap.current < 300) {
               if (scale > 1) {
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
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
             className="w-full h-full drop-shadow-2xl object-contain !pointer-events-none" 
           />
        </div>
      </div>
    </div>
  );
}
