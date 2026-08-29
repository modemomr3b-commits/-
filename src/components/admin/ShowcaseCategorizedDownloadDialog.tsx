import React, { useState, useMemo } from 'react';
import {
  Download,
  X,
  Sparkles,
  CheckSquare,
  Square,
  Loader2,
  FolderArchive,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  FolderOpen
} from 'lucide-react';
import { Product, Category } from '../../types';
import {
  groupProductsForShowcaseExport,
  exportShowcaseToCategorizedZip,
  ShowcaseZipProgress
} from '../../utils/showcaseZipDownload';
import { SHOWCASE_CATEGORIES_METADATA } from '../../utils/showcaseClassifier';
import { useStore } from '../../store';

interface ShowcaseCategorizedDownloadDialogProps {
  products: Product[];
  categories: Category[];
  onClose: () => void;
}

export function ShowcaseCategorizedDownloadDialog({
  products,
  categories,
  onClose
}: ShowcaseCategorizedDownloadDialogProps) {
  const { showToast } = useStore();

  const [scope, setScope] = useState<'showcase_only' | 'all_active'>('showcase_only');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'رجالي',
    'نسائي',
    'شبابي',
    'ولادي',
    'بناتي',
    'طفل',
    'طفلة',
    'بيبي',
    'مواليد',
    'الحقائب'
  ]);

  const [includePriceInFilename, setIncludePriceInFilename] = useState<boolean>(true);
  const [includeCatalogs, setIncludeCatalogs] = useState<boolean>(true);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ShowcaseZipProgress | null>(null);
  const [exportComplete, setExportComplete] = useState<{ totalFiles: number } | null>(null);

  // Compute category statistics based on current scope
  const stats = useMemo(() => {
    return groupProductsForShowcaseExport(products, categories, scope);
  }, [products, categories, scope]);

  // Total summary for selected categories
  const selectedSummary = useMemo(() => {
    const active = stats.filter(s => selectedCategories.includes(s.category));
    const totalProducts = active.reduce((sum, s) => sum + s.count, 0);
    const totalImages = active.reduce((sum, s) => sum + s.imageCount, 0);
    return {
      categoryCount: active.length,
      totalProducts,
      totalImages
    };
  }, [stats, selectedCategories]);

  const handleToggleCategory = (catName: string) => {
    setSelectedCategories(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleSelectAll = () => {
    if (selectedCategories.length === stats.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(stats.map(s => s.category));
    }
  };

  const handleStartExport = async () => {
    if (selectedCategories.length === 0) {
      showToast('يرجى اختيار قسم واحد على الأقل للتحميل.', 'error');
      return;
    }

    if (selectedSummary.totalImages === 0) {
      showToast('لا توجد صور للمنتجات في الأقسام المحددة.', 'error');
      return;
    }

    setIsExporting(true);
    setProgress({
      current: 0,
      total: selectedSummary.totalImages,
      percent: 0,
      currentCategory: 'بدء المعالجة',
      currentFilename: '',
      statusMessage: 'جاري الاتصال وتحضير الصور...'
    });

    const result = await exportShowcaseToCategorizedZip(
      stats,
      {
        scope,
        selectedCategories,
        includePriceInFilename,
        includeTextCatalog: includeCatalogs,
        includeHtmlCatalog: includeCatalogs
      },
      (p) => {
        setProgress(p);
      }
    );

    setIsExporting(false);

    if (result.success) {
      setExportComplete({ totalFiles: result.totalFiles });
      showToast(`تم تحميل وتجهيز ملف المعرض المبوب بنجاح (${result.totalFiles} صورة)`, 'success');
    } else {
      showToast(result.error || 'حدث خطأ أثناء تحميل المعرض', 'error');
      setProgress(null);
    }
  };

  // Helper to get category visual icon
  const getCatIcon = (catName: string) => {
    const found = SHOWCASE_CATEGORIES_METADATA.find(m => m.id === catName || m.name === catName);
    return found ? found.icon : '📦';
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        className="bg-brq-card border border-brq-gold/50 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative flex flex-col my-auto max-h-[92vh] text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-brq-gold/20 via-black/40 to-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brq-gold/20 border border-brq-gold/40 flex items-center justify-center text-brq-gold shrink-0">
              <FolderArchive size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                تحميل معرض شركة الوفاء المبوب (Zip) 📥
              </h2>
              <p className="text-xs text-brq-gold font-medium">
                تنزيل جميع صور المعرض مقسمة تلقائياً في مجلدات (رجالي، نسائي، ولادي، بناتي...)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        {isExporting ? (
          /* Live Exporting Progress Screen */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 flex-1">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-brq-gold/20 border-t-brq-gold animate-spin flex items-center justify-center"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-brq-gold animate-pulse" />
              </div>
            </div>

            <div className="space-y-2 max-w-md w-full">
              <h3 className="text-xl font-black text-white">
                {progress?.statusMessage || 'جاري تحميل وضغط صور المعرض...'}
              </h3>
              {progress?.currentCategory && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brq-gold/10 border border-brq-gold/30 rounded-full text-xs font-bold text-brq-gold">
                  <FolderOpen size={13} />
                  <span>المجلد الحالي: {progress.currentCategory}</span>
                </div>
              )}
              {progress?.currentFilename && (
                <p className="text-xs text-white/50 truncate font-mono mt-1">
                  {progress.currentFilename}
                </p>
              )}
            </div>

            {/* Progress Bar & Counter */}
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between text-xs font-bold font-mono text-white/80">
                <span className="text-brq-gold">{progress?.percent || 0}% مكتمل</span>
                <span>
                  {progress?.current || 0} / {progress?.total || 0} صورة
                </span>
              </div>
              <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-brq-gold via-yellow-400 to-amber-300 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(212,175,55,0.6)]"
                  style={{ width: `${Math.min(progress?.percent || 0, 100)}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-white/40 text-center pt-2">
                ⚡ يتم تجميع الملفات وتصنيفها في مجلدات وضغطها بأعلى جودة... يرجى الانتظار
              </p>
            </div>
          </div>
        ) : exportComplete ? (
          /* Completion Screen */
          <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-5 flex-1">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 size={44} />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">تم تجهيز وتحميل الملف بنجاح! 🎉</h3>
              <p className="text-sm text-white/70 max-w-md">
                تم تنزيل ملف الـ Zip على جهازك ويحتوي على كافة الأقسام المختارة مقسمة داخل مجلدات مرتبة مع
                كتالوجات التصفح.
              </p>
            </div>

            <div className="bg-black/40 border border-white/10 p-4 rounded-xl max-w-sm w-full text-xs text-white/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-white/50">عدد الأقسام المكتملة:</span>
                <span className="font-bold text-brq-gold">{selectedCategories.length} قسم</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">إجمالي الصور المضمنة:</span>
                <span className="font-bold text-emerald-400">{exportComplete.totalFiles} صورة</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setExportComplete(null);
                  setProgress(null);
                }}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                تنزيل خيارات أخرى 🔄
              </button>
              <button
                onClick={onClose}
                className="px-8 py-2.5 bg-brq-gold hover:bg-yellow-400 text-black font-extrabold rounded-xl text-sm transition-all shadow-lg cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        ) : (
          /* Main Configuration & Category Selection View */
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Scope Selection */}
            <div className="bg-black/30 p-1.5 rounded-xl border border-white/10 flex gap-1">
              <button
                type="button"
                onClick={() => setScope('showcase_only')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  scope === 'showcase_only'
                    ? 'bg-brq-gold text-black shadow-md font-black'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Sparkles size={16} />
                <span>منتجات المعرض العام فقط ({stats.reduce((acc, s) => acc + s.count, 0)} موديل)</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('all_active')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  scope === 'all_active'
                    ? 'bg-brq-gold text-black shadow-md font-black'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Layers size={16} />
                <span>كافة منتجات المتجر المتاحة</span>
              </button>
            </div>

            {/* Category Cards Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>اختر الأقسام المطلوب تحميلها:</span>
                  </h3>
                  <span className="text-xs text-brq-gold font-mono bg-brq-gold/10 px-2 py-0.5 rounded-md border border-brq-gold/20">
                    {selectedCategories.length} من {stats.length} محدد
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-brq-gold hover:text-yellow-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  {selectedCategories.length === stats.length ? (
                    <>
                      <Square size={13} /> إلغاء تحديد الكل
                    </>
                  ) : (
                    <>
                      <CheckSquare size={13} /> تحديد كافة الأقسام
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {stats.map((catStat) => {
                  const isSelected = selectedCategories.includes(catStat.category);
                  const icon = getCatIcon(catStat.category);

                  return (
                    <button
                      key={catStat.category}
                      type="button"
                      onClick={() => handleToggleCategory(catStat.category)}
                      className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden group ${
                        isSelected
                          ? 'bg-gradient-to-b from-brq-gold/20 to-black/40 border-brq-gold text-white ring-1 ring-brq-gold shadow-md'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xl">{icon}</span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                            isSelected
                              ? 'bg-brq-gold border-brq-gold text-black font-bold'
                              : 'border-white/30 bg-black/40'
                          }`}
                        >
                          {isSelected && '✓'}
                        </div>
                      </div>

                      <div>
                        <span className={`text-xs font-bold block ${isSelected ? 'text-white' : 'text-white/70'}`}>
                          {catStat.category}
                        </span>
                        <div className="flex items-center justify-between text-[10px] mt-1 text-white/50 font-mono">
                          <span>{catStat.count} موديل</span>
                          <span className={catStat.imageCount > 0 ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                            {catStat.imageCount} صورة
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Export Customization Options */}
            <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                <FileSpreadsheet size={15} className="text-brq-gold" />
                <span>خيارات التسمية والفهارس:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={includePriceInFilename}
                    onChange={(e) => setIncludePriceInFilename(e.target.checked)}
                    className="w-4 h-4 accent-brq-gold cursor-pointer rounded"
                  />
                  <span>تضمين السعر في اسم الصورة (مثال: كود - اسم - 15,000 دينار.jpg)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={includeCatalogs}
                    onChange={(e) => setIncludeCatalogs(e.target.checked)}
                    className="w-4 h-4 accent-brq-gold cursor-pointer rounded"
                  />
                  <span>إنشاء كتالوج HTML وفهرس نصي داخل كل مجلد</span>
                </label>
              </div>
            </div>

            {/* Live Summary Bar */}
            <div className="p-3.5 bg-gradient-to-r from-brq-gold/10 via-amber-500/10 to-transparent border border-brq-gold/30 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-white">
                <FolderArchive size={18} className="text-brq-gold" />
                <span>
                  سيتم إنشاء ملف Zip يحتوي على{' '}
                  <strong className="text-brq-gold font-bold">{selectedSummary.categoryCount} مجلدات</strong> تضم{' '}
                  <strong className="text-emerald-400 font-bold">{selectedSummary.totalImages} صورة</strong>
                </span>
              </div>
              <div className="text-white/60 font-mono text-[11px]">
                {selectedSummary.totalProducts} موديل جاهز للتحميل
              </div>
            </div>
          </div>
        )}

        {/* Modal Actions Footer */}
        {!isExporting && !exportComplete && (
          <div className="p-4 border-t border-white/10 flex justify-between items-center bg-black/40 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleStartExport}
              disabled={selectedCategories.length === 0 || selectedSummary.totalImages === 0}
              className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-brq-gold via-yellow-400 to-amber-400 hover:from-yellow-400 hover:to-brq-gold text-black font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 disabled:opacity-50 cursor-pointer transition-all active:scale-95"
            >
              <Download size={18} />
              <span>تحميل المعرض المبوب الآن ({selectedSummary.totalImages} صورة)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
