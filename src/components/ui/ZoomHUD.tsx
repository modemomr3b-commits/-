import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, MousePointer } from 'lucide-react';

interface ZoomHUDProps {
  show: boolean;
  columns: number;
  label: string;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
}

export default function ZoomHUD({
  show,
  columns,
  label,
  onZoomIn,
  onZoomOut,
  onReset
}: ZoomHUDProps) {
  if (!show) return null;

  return (
    <div 
      className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-90 slide-in-from-bottom-3"
      dir="rtl"
    >
      <div className="bg-black/90 text-white backdrop-blur-xl border border-brq-gold/60 px-4 py-2.5 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(251,191,36,0.35)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brq-gold/20 border border-brq-gold/40 flex items-center justify-center text-brq-gold shrink-0 shadow-inner">
          {columns <= 2 ? <ZoomIn size={18} /> : <ZoomOut size={18} />}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">{label}</span>
            <span className="text-[10px] font-mono font-bold bg-brq-gold text-black px-1.5 py-0.2 rounded-md">
              {columns} {columns === 1 ? 'عمود' : 'أعمدة'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/50 mt-0.5">
            <MousePointer size={11} className="text-brq-gold animate-bounce" />
            <span>Ctrl + بكرة الماوس للتحكم الفوري بالحجم</span>
          </div>
        </div>

        {/* Visual Level Dots */}
        <div className="flex items-center gap-1 pr-2 border-r border-white/15">
          {[1, 2, 3, 4, 5, 6].map(val => (
            <div
              key={val}
              className={`h-2 rounded-full transition-all ${
                val === columns 
                  ? 'w-4 bg-brq-gold shadow-[0_0_8px_rgba(251,191,36,0.8)]' 
                  : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
