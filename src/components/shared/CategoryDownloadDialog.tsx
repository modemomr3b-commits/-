import React, { useState } from "react";
import { Download, X, Loader2, Search } from "lucide-react";
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
  const [downloadChoiceDialog, setDownloadChoiceDialog] = useState<{ isOpen: boolean; message: string; onDownloadStudio: () => void; onDownloadZip: () => void; onDownloadAllElastic?: () => void } | null>(null);
  
  // Get all unique subcategory names to allow downloading all subcategories with the same name across parent categories
  const mainCategories = categories.filter(c => !c.parentId);
  const allSubcategories = categories.filter(c => c.parentId);
  
  const uniqueSubNames = Array.from(new Set(allSubcategories.map(c => c.name.trim()))).sort();
  
  const handleDownloadMainCategory = async (categoryId: string, categoryName: string) => {
    // get this category and all its subcategories
    const subs = categories.filter(c => c.parentId === categoryId);
    const catIds = [categoryId, ...subs.map(c => c.id)];
    
    await downloadSelected(catIds, categoryName, true);
  };
  
  const handleDownloadSubcategoryGroup = async (subName: string) => {
    // Find all subcategories with this exact name
    const matches = allSubcategories.filter(c => c.name.trim() === subName);
    const catIds = matches.map(c => c.id);
    
    await downloadSelected(catIds, subName, false);
  };
  
  const handleDownloadAll = async () => {
    // Collect all category IDs
    const catIds = categories.map(c => c.id!);
    
    await downloadSelected(catIds, "جميع الأقسام", true);
  };
  
  const downloadSelected = async (categoryIds: string[], zipName: string, isMainCategory: boolean) => {
    const productsToDownload = products.filter((p) => {
      // If downloading all (categoryIds includes all categories), just include everything that has an image
      if (categoryIds.length === categories.length) return true;
      
      if (isMainCategory) {
        return categoryIds.includes(p.categoryId!) || (p.subcategoryId && categoryIds.includes(p.subcategoryId));
      } else {
        return p.subcategoryId && categoryIds.includes(p.subcategoryId);
      }
    });

    const imagesWithData = productsToDownload.filter((p) => p.finalImageUrl || p.imageUrl);

    if (imagesWithData.length === 0) {
      showToast("لا توجد صور للمنتجات في هذا القسم.", "error");
      return;
    }

    setDownloadChoiceDialog({
      isOpen: true,
      message: `كيف تود تحميل جميع الصور المحددة؟ (العدد: ${imagesWithData.length} صورة).`,
      onDownloadStudio: async () => {
        setDownloadChoiceDialog(null);
        setDownloadProgress({ progress: 0, total: imagesWithData.length, message: 'جاري تحضير الملفات...' });

        const imagesToDownload = imagesWithData
          .map(p => {
            const imgUrl = p.finalImageUrl || p.imageUrl;
            const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
            const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
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

        const imagesToDownload = imagesWithData
          .map(p => {
            const imgUrl = p.finalImageUrl || p.imageUrl;
            const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
            const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
            const filename = `${safeName}.${ext}`;
            
            // Determine folder name based on main category and product name keywords
            let mainCatName = 'عام';
            
            if (p.categoryId) {
              const mainCat = categories.find(c => c.id === p.categoryId);
              if (mainCat) mainCatName = mainCat.name;
            }

            const getProductType = (name: string) => {
              if (!name) return 'أخرى';
              const lowerName = name.toLowerCase();
              if (lowerName.includes('رياض')) return 'رياضة';
              if (lowerName.includes('شحاط')) return 'شحاطة';
              if (lowerName.includes('صندل') || lowerName.includes('صنادل')) return 'صندل';
              if (lowerName.includes('سليبر')) return 'سليبر';
              if (lowerName.includes('حذاء') || lowerName.includes('احذية') || lowerName.includes('أحذية')) return 'أحذية';
              if (lowerName.includes('لاستيك')) return 'لاستيك';
              if (lowerName.includes('ايفا') || lowerName.includes('إيفا')) return 'ايفا';
              if (lowerName.includes('قندر') || lowerName.includes('قنادر')) return 'قنادر';
              if (lowerName.includes('بوت') || lowerName.includes('جزم') || lowerName.includes('بسطال')) return 'بوت وجزم';
              if (lowerName.includes('نص')) return 'نصف';
              return 'أخرى';
            };

            const productType = getProductType(p.name);
            const folderName = `${mainCatName}/${productType}`;
            
            return { url: imgUrl!, filename, folderName };
          });
        
        const { downloadAsZip } = await import('../../utils/zipDownload');
        const success = await downloadAsZip(zipName, imagesToDownload, (progress, total, message) => {
          setDownloadProgress({ progress, total, message });
        });
        
        if (success) {
           showToast("تم تحميل الملف بنجاح", "success");
        } else {
           showToast("حدث خطأ أثناء تحميل الملف", "error");
        }
        setDownloadProgress(null);
      }
    });
  };

  const filteredMains = mainCategories.filter(c => c.name.includes(searchTerm));
  const filteredSubs = uniqueSubNames.filter(n => n.includes(searchTerm));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Download size={20} className="text-brq-gold" /> تحميل صور الأقسام (Zip)
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
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="text"
                  placeholder="ابحث عن قسم رئيسي أو فرعي..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-white focus:border-brq-gold/50 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {!searchTerm && (
                <div>
                  <button
                    onClick={handleDownloadAll}
                    className="w-full p-4 bg-gradient-to-r from-brq-gold/10 to-brq-gold/5 border border-brq-gold/30 rounded-xl hover:bg-brq-gold/20 hover:border-brq-gold/60 transition-all text-right group flex justify-between items-center"
                  >
                    <div>
                       <span className="font-bold text-brq-gold text-lg block mb-1">تحميل جميع صور المتجر</span>
                       <span className="text-white/50 text-sm">سيتم تقسيم الصور في مجلدات حسب القسم الرئيسي ثم نوع المنتج (مثال: رجالي/رياضة)</span>
                    </div>
                    <Download size={24} className="text-brq-gold/70 group-hover:text-brq-gold group-hover:scale-110 transition-all" />
                  </button>
                </div>
              )}
              {filteredSubs.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-brq-gold mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brq-gold"></div>
                    تحميل حسب القسم الفرعي (تجميع تلقائي)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredSubs.map((subName) => (
                      <button
                        key={subName}
                        onClick={() => handleDownloadSubcategoryGroup(subName)}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-brq-gold/10 hover:border-brq-gold/50 transition-all text-right group flex justify-between items-center"
                      >
                        <span className="font-bold text-white group-hover:text-brq-gold transition-colors">{subName}</span>
                        <Download size={14} className="text-white/40 group-hover:text-brq-gold opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredMains.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    تحميل حسب القسم الرئيسي
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredMains.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleDownloadMainCategory(cat.id!, cat.name)}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-500/10 hover:border-blue-500/50 transition-all text-right group flex justify-between items-center"
                      >
                        <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{cat.name}</span>
                        <Download size={14} className="text-white/40 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredSubs.length === 0 && filteredMains.length === 0 && (
                <div className="text-center py-10 text-white/40">
                  لا توجد أقسام مطابقة للبحث
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
