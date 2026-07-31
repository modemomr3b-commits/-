import React from 'react';
import { Download, X, Image as ImageIcon, FolderArchive } from 'lucide-react';

interface DownloadModeDialogProps {
  isOpen: boolean;
  imageCount: number;
  onSelectOption: (option: 'gallery' | 'zip') => void;
  onCancel: () => void;
}

export function DownloadModeDialog({
  isOpen,
  imageCount,
  onSelectOption,
  onCancel
}: DownloadModeDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-[#0a1128]/90 border border-brq-gold/30 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-white/50 hover:text-white"
        >
          <X size={24} />
        </button>
        
        <div className="w-16 h-16 bg-gradient-to-br from-brq-gold/20 to-transparent rounded-2xl flex items-center justify-center mb-6 border border-brq-gold/20">
          <Download size={32} className="text-brq-gold" />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-2">خيارات التحميل</h3>
        <p className="text-white/70 mb-8 text-sm">
          لديك ({imageCount}) صورة جاهزة للتحميل. كيف تود حفظها؟
        </p>
        
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => onSelectOption('gallery')}
            className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 transition-all font-bold flex items-center justify-center gap-3"
          >
            <ImageIcon size={20} /> حفظ الصور في الاستوديو
          </button>
          
          <button
            onClick={() => onSelectOption('zip')}
            className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-brq-gold to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 transition-all font-bold flex items-center justify-center gap-3"
          >
            <FolderArchive size={20} /> تنزيل كملف مضغوط (Zip)
          </button>
        </div>
      </div>
    </div>
  );
}
