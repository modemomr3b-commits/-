import React from 'react';
import { Download, FileArchive, Image as ImageIcon, X } from 'lucide-react';

interface DownloadChoiceDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onDownloadStudio: () => void;
  onDownloadZip: () => void;
  onDownloadAllElastic?: () => void;
  onCancel: () => void;
}

export function DownloadChoiceDialog({
  isOpen,
  title,
  message,
  onDownloadStudio,
  onDownloadZip,
  onDownloadAllElastic,
  onCancel
}: DownloadChoiceDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md">
        {/* Glow behind */}
        <div className="absolute -inset-1 bg-gradient-to-r from-brq-gold/20 via-yellow-500/10 to-brq-gold/20 rounded-3xl blur-xl opacity-50 animate-pulse"></div>
        
        <div className="relative bg-[#0a1128]/90 border border-brq-gold/30 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-brq-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-brq-blue/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative w-20 h-20 bg-gradient-to-br from-brq-gold/20 to-transparent rounded-2xl flex items-center justify-center mb-6 border border-brq-gold/20 shadow-[0_0_30px_rgba(212,175,55,0.15)] rotate-3">
            <div className="absolute inset-0 bg-brq-gold/10 rounded-2xl animate-ping opacity-20"></div>
            <Download size={36} className="text-brq-gold -rotate-3 drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
          </div>
          
          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-3">{title}</h3>
          
          <p className="text-brq-gold font-bold mb-8 leading-relaxed text-base">{message}</p>
          
          <div className="flex flex-col gap-3 w-full relative z-10">
            <button
              onClick={onDownloadStudio}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 text-white hover:from-blue-500 hover:to-blue-300 transition-all font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:-translate-y-0.5"
            >
              <ImageIcon size={20} /> حفظ في الاستوديو مباشرة
            </button>
            
            <button
              onClick={onDownloadZip}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brq-gold to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 transition-all font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:-translate-y-0.5"
            >
              <FileArchive size={20} /> تحميل كملف مضغوط (ZIP)
            </button>

            {onDownloadAllElastic && (
              <button
                onClick={onDownloadAllElastic}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-400 text-white hover:from-emerald-500 hover:to-emerald-300 transition-all font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-0.5"
              >
                <FileArchive size={20} /> تحميل جميع اللاستيك في الموقع (ZIP)
              </button>
            )}

            <button
              onClick={onCancel}
              className="w-full mt-2 py-3.5 px-4 rounded-xl border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-all font-medium flex items-center justify-center gap-2"
            >
              <X size={18} /> إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
