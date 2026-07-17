import { useState } from "react";
import { X, ArrowRightLeft } from "lucide-react";
import { Product } from "../../types";
import OptimizedImage from "../OptimizedImage";

export function PriceHistoryViewer({ product, onClose }: { product: Product, onClose: () => void }) {
  if (!product.oldPriceInfo) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-brq-navy w-full max-w-4xl rounded-2xl border border-brq-gold/30 shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="text-brq-gold" />
            تاريخ تغيير السعر
          </h3>
          <button onClick={onClose} className="p-2 bg-black/50 hover:bg-black rounded-full text-white/70 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-2">
            <div className="text-center py-2 bg-black/30 rounded-xl border border-white/10">
              <span className="text-white/50 text-sm block">السعر القديم</span>
              <span className="text-xl font-bold font-mono text-white/70 line-through">
                {(product.oldPriceInfo.piecePriceIqd || product.oldPriceInfo.price)?.toLocaleString("en-US")} د.ع
              </span>
            </div>
            <div className="flex-1 bg-black/40 rounded-xl overflow-hidden border border-white/5">
               <OptimizedImage src={product.oldPriceInfo.finalImageUrl} alt="Old Price" className="w-full h-full" imgClassName="object-contain w-full h-full max-h-[60vh]" />
            </div>
          </div>
          
          <div className="hidden md:flex items-center justify-center">
             <ArrowRightLeft size={32} className="text-brq-gold opacity-50" />
          </div>
          
          <div className="flex-1 flex flex-col gap-2">
            <div className="text-center py-2 bg-brq-gold/10 rounded-xl border border-brq-gold/30">
              <span className="text-brq-gold/80 text-sm block">السعر الجديد</span>
              <span className="text-xl font-bold font-mono text-brq-gold">
                {(product.piecePriceIqd || product.price)?.toLocaleString("en-US")} د.ع
              </span>
            </div>
            <div className="flex-1 bg-black/40 rounded-xl overflow-hidden border border-brq-gold/20">
               <OptimizedImage src={product.finalImageUrl || product.imageUrl || ''} alt="New Price" className="w-full h-full" imgClassName="object-contain w-full h-full max-h-[60vh]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
