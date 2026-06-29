import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OptimizedImage from './OptimizedImage.tsx';

interface ImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
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

  // Keyboard support for closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    // Disable body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const [hasDragged, setHasDragged] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setHasDragged(false);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || scale <= 1) return;
    setHasDragged(true);
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    // hasDragged will be reset on next pointer down
  };

  const handleWrapperClick = () => {
    if (!hasDragged) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl touch-none"
        onClick={handleWrapperClick}
      >
        {/* Controls Overlay */}
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

        {/* Image Container */}
        <div 
          className="w-full h-full flex items-center justify-center p-4 md:p-10 cursor-move"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <motion.div
            animate={{ scale, x: position.x, y: position.y }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative flex items-center justify-center w-full h-full max-h-[90vh] max-w-[90vw]"
            onClick={(e) => {
              if (hasDragged) {
                e.stopPropagation();
              }
            }}
          >
             <OptimizedImage 
               src={src} 
               alt={alt} 
               size="full"
               className="w-full h-full drop-shadow-2xl object-contain !pointer-events-none" 
             />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
