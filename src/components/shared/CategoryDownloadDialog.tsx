import React, { useState, useMemo } from "react";
import { Download, X, Loader2, Search, ChevronRight, Folder } from "lucide-react";
import { Category, Product } from "../../types";
import { DownloadChoiceDialog } from "./DownloadChoiceDialog";
import { useStore } from "../../store";

interface CategoryDownloadDialogProps {
  categories: Category[];
  products: Product[];
  onClose: () => void;
}

export function CategoryDownloadDialog({ categories, products, onClose }: CategoryDownloadDialogProps) {
  const { showToast, user } = useStore();
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number; total: number; message?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedMainCategory, setSelectedMainCategory] = useState<Category | null>(null);
  
  const [downloadChoiceDialog, setDownloadChoiceDialog] = useState<{ 
    isOpen: boolean; 
    message: string; 
    onDownloadStudio: () => void; 
    onDownloadZip: () => void;
    onDownloadAllElastic?: () => void;
  } | null>(null);

  const mainCategories = categories.filter(c => !c.parentId);

  const subtypesInfo = useMemo(() => {
    if (!selectedMainCategory) return [];
    
    
    const subs = categories.filter(c => c.parentId === selectedMainCategory.id);
    const catIds = [selectedMainCategory.id, ...subs.map(c => c.id)];
    const catProducts = products.filter(p => catIds.includes(p.categoryId) || (p.subcategoryId && catIds.includes(p.subcategoryId)));

    const subtypeMap = new Map<string, Product[]>();
    
    catProducts.forEach(p => {
      if (!p.name) return;
      const nameParts = p.name.trim().split(/\s+/);
      const firstWord = nameParts[0];
      if (firstWord) {
         const list = subtypeMap.get(firstWord) || [];
         list.push(p);
         subtypeMap.set(firstWord, list);
      }
    });
    
    const sorted = Array.from(subtypeMap.entries())
      .map(([name, prods]) => ({ name, products: prods }))
      .sort((a, b) => b.products.length - a.products.length);
      
    return sorted;
  }, [selectedMainCategory, products]);

  const handleSubtypeSelect = (subtypeName: string, subtypeProducts: Product[]) => {
    const imagesWithData = subtypeProducts.filter((p) => p.finalImageUrl || p.imageUrl);
    if (imagesWithData.length === 0) {
      showToast("لا توجد صور للمنتجات في هذا القسم.", "error");
      return;
    }

    const downloadKey = `downloaded_${selectedMainCategory?.id}_${subtypeName}`;
    if (localStorage.getItem(downloadKey) === "true") {
      if (!window.confirm(`لقد قمت بتحميل صور "${subtypeName}" مسبقاً.\nهل تود تحميلها مرة أخرى؟`)) {
        return;
      }
      localStorage.setItem(downloadKey, "ignored");
    }

    setDownloadChoiceDialog({
      isOpen: true,
      message: `كيف تود تحميل جميع الصور المحددة؟ (العدد: ${imagesWithData.length} صورة).`,
      onDownloadStudio: async () => {
        setDownloadChoiceDialog(null);
        setDownloadProgress({ progress: 0, total: imagesWithData.length, message: 'جاري تحضير الملفات...' });
        
        const imagesToDownload = imagesWithData.map(p => {
          const imgUrl = p.finalImageUrl || p.imageUrl;
          const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
          const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\:\\*\\|":]/g, '-');
          const filename = `${safeName}.${ext}`;
          return { url: imgUrl!, filename };
        });
        
        const { downloadImages } = await import('../../utils/download');
        const success = await downloadImages(imagesToDownload, (progress, total) => {
          setDownloadProgress({ progress, total, message: 'جاري تحميل الصور للاستوديو...' });
        });
        
        if (success) {
           if (localStorage.getItem(downloadKey) !== "ignored") {
             localStorage.setItem(downloadKey, "true");
           }
           showToast("تم حفظ الصور في الاستوديو بنجاح", "success");
        } else {
           showToast("حدث خطأ أثناء حفظ الصور أو تم إلغاء العملية", "error");
        }
        setDownloadProgress(null);
      },
      onDownloadZip: async () => {
        setDownloadChoiceDialog(null);
        setDownloadProgress({ progress: 0, total: imagesWithData.length, message: 'جاري تحضير الملفات...' });
        
        const imagesToDownload = imagesWithData.map(p => {
          const imgUrl = p.finalImageUrl || p.imageUrl;
          const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
          const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\:\\*\\|":]/g, '-');
          const filename = `${safeName}.${ext}`;
          return { url: imgUrl!, filename, folderName: subtypeName };
        });
        
        const { downloadAsZip } = await import('../../utils/zipDownload');
        const success = await downloadAsZip(`${selectedMainCategory?.name}_${subtypeName}`, imagesToDownload, (progress, total, message) => {
          setDownloadProgress({ progress, total, message });
        });
        
        if (success) {
           if (localStorage.getItem(downloadKey) !== "ignored") {
             localStorage.setItem(downloadKey, "true");
           }
           showToast("تم تحميل الملف المضغوط بنجاح", "success");
        } else {
           showToast("حدث خطأ أثناء التحميل", "error");
        }
        setDownloadProgress(null);
      }
    });
  };

  const handleDownloadAll = async () => {
    const imagesWithData = products.filter((p) => p.finalImageUrl || p.imageUrl);
    if (imagesWithData.length === 0) {
      showToast("لا توجد صور للمنتجات في المتجر.", "error");
      return;
    }

    setDownloadChoiceDialog({
      isOpen: true,
      message: `كيف تود تحميل جميع صور المتجر؟ (العدد: ${imagesWithData.length} صورة).`,
      onDownloadStudio: async () => {
        setDownloadChoiceDialog(null);
        setDownloadProgress({ progress: 0, total: imagesWithData.length, message: 'جاري تحضير الملفات...' });
        
        const imagesToDownload = imagesWithData.map(p => {
          const imgUrl = p.finalImageUrl || p.imageUrl;
          const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
          const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\:\\*\\|":]/g, '-');
          const filename = `${safeName}.${ext}`;
          return { url: imgUrl!, filename };
        });
        
        const { downloadImages } = await import('../../utils/download');
        const success = await downloadImages(imagesToDownload, (progress, total) => {
          setDownloadProgress({ progress, total, message: 'جاري تحميل الصور للاستوديو...' });
        });
        
        if (success) {
           showToast("تم حفظ الصور في الاستوديو بنجاح", "success");
        } else {
           showToast("حدث خطأ أثناء حفظ الصور أو تم إلغاء العملية", "error");
        }
        setDownloadProgress(null);
      },
      onDownloadZip: async () => {
        setDownloadChoiceDialog(null);
        setDownloadProgress({ progress: 0, total: imagesWithData.length, message: 'جاري تحضير الملفات...' });
        
        const imagesToDownload = imagesWithData.map(p => {
          const imgUrl = p.finalImageUrl || p.imageUrl;
          const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
          const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\:\\*\\|":]/g, '-');
          const filename = `${safeName}.${ext}`;
          let mainCatName = 'أخرى';
          if (p.categoryId) {
            const mainCat = categories.find(c => c.id === p.categoryId);
            if (mainCat) {
              if (mainCat.parentId) {
                 const parent = categories.find(c => c.id === mainCat.parentId);
                 if (parent) mainCatName = parent.name;
              } else {
                 mainCatName = mainCat.name;
              }
            }
          }
          return { url: imgUrl!, filename, folderName: mainCatName };
        });
        
        const { downloadAsZip } = await import('../../utils/zipDownload');
        const success = await downloadAsZip('جميع الأقسام', imagesToDownload, (progress, total, message) => {
          setDownloadProgress({ progress, total, message });
        });
        
        if (success) {
           showToast("تم تحميل الملف المضغوط بنجاح", "success");
        } else {
           showToast("حدث خطأ أثناء التحميل", "error");
        }
        setDownloadProgress(null);
      },
      onDownloadAllElastic: (user?.fullName === "نصيف عبد الرزاق" || user?.fullName === "نصيف عبدالرزاق" || user?.username === "modemomr3b@gmail.com" || user?.fullName?.includes("نصيف")) ? async () => {
        setDownloadChoiceDialog(null);
        setDownloadProgress({ progress: 0, total: imagesWithData.length, message: 'جاري تحضير الملفات...' });
        const imagesToDownload = imagesWithData.map(p => {
          const imgUrl = p.finalImageUrl || p.imageUrl;
          const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
          const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\:\\*\\|":]/g, '-');
          const filename = `${safeName}.${ext}`;
          let mainCatName = 'أخرى';
          if (p.categoryId) {
            const mainCat = categories.find(c => c.id === p.categoryId);
            if (mainCat) {
              if (mainCat.parentId) {
                 const parent = categories.find(c => c.id === mainCat.parentId);
                 if (parent) mainCatName = parent.name;
              } else {
                 mainCatName = mainCat.name;
              }
            }
          }
          return { url: imgUrl!, filename, folderName: mainCatName };
        });
        const { downloadAsZip } = await import('../../utils/zipDownload');
        const success = await downloadAsZip('جميع اللاستيك', imagesToDownload, (progress, total, message) => {
          setDownloadProgress({ progress, total, message });
        });
        if (success) showToast("تم تحميل الملف المضغوط بنجاح", "success");
        else showToast("حدث خطأ أثناء التحميل", "error");
        setDownloadProgress(null);
      } : undefined
    });
  };

  const filteredMains = mainCategories.filter(c => c.name.includes(searchTerm));
  const filteredSubtypes = subtypesInfo.filter(s => s.name.includes(searchTerm));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Download size={20} className="text-brq-gold" /> تحميل صور الأقسام
          </h2>
          <button
            onClick={onClose}
            disabled={downloadProgress !== null}
            className="text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {downloadProgress ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 flex-1">
            <Loader2 size={48} className="animate-spin text-brq-gold" />
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">{downloadProgress.message || 'جاري تحميل الصور...'}</h3>
              <p className="text-brq-gold text-lg font-mono">
                {downloadProgress.progress} / {downloadProgress.total}
              </p>
            </div>
            <div className="w-full max-w-md h-2 bg-white/10 rounded-full overflow-hidden mt-4">
              <div 
                className="h-full bg-brq-gold transition-all duration-300"
                style={{ width: `${(downloadProgress.progress / downloadProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
              {selectedMainCategory && (
                 <button 
                   onClick={() => { setSelectedMainCategory(null); setSearchTerm(""); }}
                   className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all flex items-center gap-1 shrink-0"
                 >
                   <ChevronRight size={18} /> رجوع
                 </button>
              )}
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="text"
                  placeholder="ابحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-white focus:border-brq-gold/50 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              {!selectedMainCategory ? (
                 <>
                    {!searchTerm && (
                      <div>
                        <button
                          onClick={handleDownloadAll}
                          className="w-full p-4 bg-gradient-to-r from-brq-gold/10 to-brq-gold/5 border border-brq-gold/30 rounded-xl hover:bg-brq-gold/20 hover:border-brq-gold/60 transition-all text-right group flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-brq-gold text-lg block mb-1">تحميل جميع صور المتجر</span>
                            <span className="text-white/50 text-sm">سيتم تقسيم الصور في مجلدات</span>
                          </div>
                          <Download size={24} className="text-brq-gold/70 group-hover:text-brq-gold group-hover:scale-110 transition-all" />
                        </button>
                      </div>
                    )}
                    
                    {filteredMains.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          اختر القسم الرئيسي
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {filteredMains.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => { setSelectedMainCategory(cat); setSearchTerm(""); }}
                              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-500/10 hover:border-blue-500/50 transition-all text-right group flex flex-col gap-2 items-start"
                            >
                              <Folder size={24} className="text-blue-400/70 group-hover:text-blue-400 transition-all" />
                              <span className="font-bold text-white group-hover:text-blue-400 transition-colors text-lg">{cat.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {filteredMains.length === 0 && (
                      <div className="text-center py-10 text-white/40">لا توجد أقسام مطابقة للبحث</div>
                    )}
                 </>
              ) : (
                 <div>
                    <h3 className="text-sm font-bold text-brq-gold mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brq-gold"></div>
                      أصناف {selectedMainCategory.name} (حسب اسم المنتج)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {filteredSubtypes.map((sub) => (
                        <button
                          key={sub.name}
                          onClick={() => handleSubtypeSelect(sub.name, sub.products)}
                          className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-brq-gold/10 hover:border-brq-gold/50 transition-all text-right group flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-white group-hover:text-brq-gold transition-colors block">{sub.name}</span>
                            <span className="text-white/40 text-xs">{sub.products.length} منتج</span>
                          </div>
                          <Download size={18} className="text-white/40 group-hover:text-brq-gold opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                      ))}
                    </div>
                    {filteredSubtypes.length === 0 && (
                      <div className="text-center py-10 text-white/40">لا توجد أصناف مطابقة للبحث</div>
                    )}
                 </div>
              )}

            </div>
          </div>
        )}
      </div>

      {downloadChoiceDialog && (
        <DownloadChoiceDialog
          isOpen={downloadChoiceDialog.isOpen}
          title="تحميل الصور"
          message={downloadChoiceDialog.message}
          onDownloadStudio={downloadChoiceDialog.onDownloadStudio}
          onDownloadZip={downloadChoiceDialog.onDownloadZip}
          onDownloadAllElastic={downloadChoiceDialog.onDownloadAllElastic}
          onCancel={() => setDownloadChoiceDialog(null)}
        />
      )}
    </div>
  );
}
