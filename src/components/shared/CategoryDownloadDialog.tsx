import React, { useState, useMemo } from "react";
import { Download, X, Loader2, Search, ChevronRight, Folder, Sparkles, FolderArchive } from "lucide-react";
import { Category, Product } from "../../types";
import { DownloadChoiceDialog } from "./DownloadChoiceDialog";
import { useStore } from "../../store";
import { ShowcaseCategorizedDownloadDialog } from "../admin/ShowcaseCategorizedDownloadDialog";
import { 
  detectStoreMainSection, 
  detectShoeSubtype, 
  STORE_MAIN_SECTIONS, 
  SHOE_SUBTYPES 
} from "../../utils/productFolderClassifier";
import { isProductRestrictedFromSearch } from "../../utils/search";

interface CategoryDownloadDialogProps {
  categories: Category[];
  products: Product[];
  onClose: () => void;
}

export function CategoryDownloadDialog({ categories, products, onClose }: CategoryDownloadDialogProps) {
  const { showToast, user } = useStore();
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number; total: number; message?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isShowcaseExportOpen, setIsShowcaseExportOpen] = useState(false);
  
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);
  
  const [downloadChoiceDialog, setDownloadChoiceDialog] = useState<{ 
    isOpen: boolean; 
    message: string; 
    onDownloadStudio: () => void; 
    onDownloadZip: () => void;
    onDownloadAllElastic?: () => void;
  } | null>(null);

  const getProductGroup = (p: Product) => {
    return detectStoreMainSection(p, categories);
  };

  const getProductType = (p: Product) => {
    const mainSection = detectStoreMainSection(p, categories);
    if (mainSection === 'الحقائب') return 'الحقائب';
    return detectShoeSubtype(p, categories);
  };

  // Filter products to ONLY include active ones (exclude out-of-stock / inactive / hidden / archived / deleted / restricted)
  const activeProducts = useMemo(() => {
    return products.filter(
      p => !p.isHidden && !p.isArchived && !p.isLocked && !p.isDeleted && !isProductRestrictedFromSearch(p, categories)
    );
  }, [products, categories]);

  const groupedProducts = useMemo(() => {
    const map = new Map<string, Product[]>();
    
    // Pre-populate main sections in canonical order
    STORE_MAIN_SECTIONS.forEach(sec => {
      map.set(sec, []);
    });

    activeProducts.forEach(p => {
      const groupName = getProductGroup(p);
      if (!map.has(groupName)) map.set(groupName, []);
      map.get(groupName)!.push(p);
    });
    
    return Array.from(map.entries())
      .filter(([_, prods]) => prods.length > 0)
      .map(([name, prods]) => ({ name, products: prods }));
  }, [activeProducts, categories]);

  const selectedGroupSubtypes = useMemo(() => {
    if (!selectedGroupName) return [];
    
    const groupProds = groupedProducts.find(g => g.name === selectedGroupName)?.products || [];
    
    // If it's bags, it doesn't need shoe subdivisions
    if (selectedGroupName === 'الحقائب') {
      return [{ name: 'جميع الحقائب', products: groupProds }];
    }

    const subtypeMap = new Map<string, Product[]>();
    
    // Pre-populate the 5 shoe subtypes
    SHOE_SUBTYPES.forEach(st => {
      subtypeMap.set(st, []);
    });

    groupProds.forEach(p => {
      const typeName = getProductType(p);
      if (!subtypeMap.has(typeName)) subtypeMap.set(typeName, []);
      subtypeMap.get(typeName)!.push(p);
    });
    
    return Array.from(subtypeMap.entries())
      .filter(([_, prods]) => prods.length > 0)
      .map(([name, prods]) => ({ name, products: prods }));
  }, [selectedGroupName, groupedProducts]);

  const filteredMains = groupedProducts.filter(g => g.name.includes(searchTerm));
  const filteredSubs = selectedGroupSubtypes.filter(s => s.name.includes(searchTerm));

  const handleDownloadGroup = (groupName: string, groupProducts: Product[]) => {
    const imagesWithData = groupProducts.filter((p) => (p.finalImageUrl || p.imageUrl) && !p.isHidden && !p.isArchived && !p.isLocked && !p.isDeleted);
    if (imagesWithData.length === 0) {
      showToast("لا توجد صور للمنتجات في هذا القسم.", "error");
      return;
    }

    const downloadKey = `downloaded_${selectedGroupName || 'all'}_${groupName}`;
    if (localStorage.getItem(downloadKey) === "true") {
      if (!window.confirm(`لقد قمت بتحميل صور "${groupName}" مسبقاً.\nهل تود تحميلها مرة أخرى؟`)) {
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

          let folderPath = groupName;
          if (!selectedGroupName) {
            const mainCat = getProductGroup(p);
            if (mainCat === 'الحقائب') {
              folderPath = 'الحقائب';
            } else {
              const subType = detectShoeSubtype(p, categories);
              folderPath = `${mainCat}/${subType}`;
            }
          } else {
            if (selectedGroupName === 'الحقائب') {
              folderPath = 'الحقائب';
            } else {
              folderPath = `${selectedGroupName}/${groupName}`;
            }
          }

          return { url: imgUrl!, filename, folderName: folderPath };
        });
        
        const { downloadAsZip } = await import('../../utils/zipDownload');
        const success = await downloadAsZip(`${selectedGroupName || 'All'}_${groupName}`, imagesToDownload, (progress, total, message) => {
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

  const handleDownloadAllStore = async () => {
    const imagesWithData = activeProducts.filter((p) => p.finalImageUrl || p.imageUrl);
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
          
          const mainCatName = getProductGroup(p);
          let folderPath = '';
          
          if (mainCatName === 'الحقائب') {
            // All bags in a single unified folder
            folderPath = 'الحقائب';
          } else {
            // Shoes divided into the exact 5 subtypes: احذية، رياضة، شحاطة، صندل، لاستيك
            const subType = detectShoeSubtype(p, categories);
            folderPath = `${mainCatName}/${subType}`;
          }
          
          return { url: imgUrl!, filename, folderName: folderPath };
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
      }
    });
  };

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
              {selectedGroupName && (
                 <button 
                   onClick={() => { setSelectedGroupName(null); setSearchTerm(""); }}
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
              
              {!selectedGroupName ? (
                 <>
                    {!searchTerm && (
                      <div className="space-y-2.5">
                        <button
                          onClick={() => setIsShowcaseExportOpen(true)}
                          className="w-full p-4 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/5 border border-amber-400/50 rounded-xl hover:bg-amber-500/30 hover:border-amber-400 transition-all text-right group flex justify-between items-center shadow-lg cursor-pointer"
                        >
                          <div>
                            <span className="font-extrabold text-amber-300 text-lg block mb-1 flex items-center gap-1.5">
                              <Sparkles size={18} className="text-amber-400" />
                              تحميل معرض شركة الوفاء المبوب (Zip) 🌟
                            </span>
                            <span className="text-white/70 text-xs">
                              يقسم المعرض تلقائياً إلى مجلدات (رجالي، نسائي، شبابي، ولادي، بناتي، طفل، طفلة، بيبي، مواليد، حقائب)
                            </span>
                          </div>
                          <FolderArchive size={26} className="text-amber-400/80 group-hover:text-amber-300 group-hover:scale-110 transition-all shrink-0 mr-2" />
                        </button>

                        <button
                          onClick={handleDownloadAllStore}
                          className="w-full p-3.5 bg-gradient-to-r from-brq-gold/10 to-brq-gold/5 border border-brq-gold/30 rounded-xl hover:bg-brq-gold/20 hover:border-brq-gold/60 transition-all text-right group flex justify-between items-center cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-brq-gold text-base block mb-0.5">تحميل جميع صور المتجر</span>
                            <span className="text-white/50 text-xs">سيتم تقسيم الصور في مجلدات</span>
                          </div>
                          <Download size={22} className="text-brq-gold/70 group-hover:text-brq-gold group-hover:scale-110 transition-all" />
                        </button>
                      </div>
                    )}
                    
                    {filteredMains.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          اختر الفئة
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {filteredMains.map((group, idx) => (
                            <button
                              key={idx}
                              onClick={() => { setSelectedGroupName(group.name); setSearchTerm(""); }}
                              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-500/10 hover:border-blue-500/50 transition-all text-right group flex flex-col gap-2 items-start"
                            >
                              <Folder size={24} className="text-blue-400/70 group-hover:text-blue-400 transition-all" />
                              <span className="font-bold text-white group-hover:text-blue-400 transition-colors text-lg">{group.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {filteredMains.length === 0 && (
                      <div className="text-center py-10 text-white/40">لا توجد أصناف مطابقة للبحث</div>
                    )}
                 </>
              ) : (
                 <div>
                    <h3 className="text-sm font-bold text-brq-gold mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brq-gold"></div>
                      أقسام {selectedGroupName}
                    </h3>
                    
                    <div className="mb-4">
                      <button
                        onClick={() => {
                          const catProducts = groupedProducts.find(g => g.name === selectedGroupName)?.products || [];
                          handleDownloadGroup(`جميع ${selectedGroupName}`, catProducts);
                        }}
                        className="w-full p-3 bg-gradient-to-r from-blue-600/20 to-blue-400/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 hover:border-blue-500/60 transition-all text-right flex justify-between items-center group"
                      >
                        <span className="font-bold text-blue-400 group-hover:text-blue-300">تحميل جميع صور ({selectedGroupName}) بالكامل</span>
                        <Download size={18} className="text-blue-400/70 group-hover:text-blue-300 transition-all" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {filteredSubs.map((sub, index) => (
                          <button
                            key={`${sub.name}-${index}`}
                            onClick={() => handleDownloadGroup(sub.name, sub.products)}
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
                    {filteredSubs.length === 0 && (
                      <div className="text-center py-10 text-white/40">لا توجد أصناف مطابقة</div>
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
          onCancel={() => setDownloadChoiceDialog(null)}
        />
      )}

      {isShowcaseExportOpen && (
        <ShowcaseCategorizedDownloadDialog
          products={products}
          categories={categories}
          onClose={() => setIsShowcaseExportOpen(false)}
        />
      )}
    </div>
  );
}
