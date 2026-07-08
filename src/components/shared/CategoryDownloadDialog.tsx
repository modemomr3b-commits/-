import React, { useState } from "react";
import { Download, X, Loader2, Search } from "lucide-react";
import { Category, Product } from "../../types";
import { ConfirmDialog } from "./ConfirmDialog";

interface CategoryDownloadDialogProps {
  categories: Category[];
  products: Product[];
  onClose: () => void;
}

export function CategoryDownloadDialog({ categories, products, onClose }: CategoryDownloadDialogProps) {
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number; total: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  
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
  
  const downloadSelected = async (categoryIds: string[], zipName: string, isMainCategory: boolean) => {
    // Find products in these categories
    // If it's a main category, we check if product.categoryId == categoryId OR product.subcategoryId in subs
    // If it's a subcategory group, we check if product.subcategoryId in catIds
    
    const productsToDownload = products.filter((p) => {
      if (isMainCategory) {
        return categoryIds.includes(p.categoryId!) || (p.subcategoryId && categoryIds.includes(p.subcategoryId));
      } else {
        return p.subcategoryId && categoryIds.includes(p.subcategoryId);
      }
    });

    const imagesWithData = productsToDownload.filter((p) => p.finalImageUrl || p.imageUrl);

    if (imagesWithData.length === 0) {
      alert("لا توجد صور للمنتجات في هذا القسم.");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      message: `هل تود البدء بتحميل جميع صور هذا القسم؟ (العدد: ${imagesWithData.length} صورة)`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setDownloadProgress({ progress: 0, total: imagesWithData.length });
        let completed = 0;

        for (const p of imagesWithData) {
          const imgUrl = p.finalImageUrl || p.imageUrl;
          if (imgUrl) {
            try {
              const res = await fetch(imgUrl);
              const blob = await res.blob();
              const ext = blob.type.split("/")[1] || "jpg";
              
              // Clean filename
              const safeName = (p.productCode || p.name || "product").replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
              const filename = `${safeName}.${ext}`;
              
              const objectUrl = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = objectUrl;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              
              // Small delay to prevent browser from blocking multiple downloads
              await new Promise(resolve => setTimeout(resolve, 300));
              
              URL.revokeObjectURL(objectUrl);
            } catch (err) {
              console.error(`Failed to download image for ${p.name}`, err);
            }
          }
          completed++;
          setDownloadProgress({
            progress: completed,
            total: imagesWithData.length,
          });
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
              <h3 className="text-xl font-bold text-white mb-2">جاري تحميل الصور...</h3>
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
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="تحميل الصور"
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
