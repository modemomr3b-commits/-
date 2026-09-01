import React from 'react';
import {
  X,
  Check,
  Package,
  Layers,
  Tag,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Split
} from 'lucide-react';
import { Product, Category } from '../../types';

export interface ProductChangeDiffItem {
  id: string;
  field: string;
  label: string;
  group: 'packaging' | 'pricing' | 'category' | 'details' | 'media';
  oldValue: any;
  newValue: any;
  oldDisplay: string;
  newDisplay: string;
  difference?: string;
  isPositiveChange?: boolean;
}

export function calculateProductDiff(
  original: Product | null,
  current: Product | null,
  categories: Category[] = []
): ProductChangeDiffItem[] {
  if (!original || !current) return [];
  const diffs: ProductChangeDiffItem[] = [];

  const getCatName = (id?: string) => {
    if (!id) return 'غير محدد';
    const found = categories.find(c => c.id === id);
    return found ? found.name : id;
  };

  // 1. اسم المنتج
  const oldName = (original.name || '').trim();
  const newName = (current.name || '').trim();
  if (oldName !== newName) {
    diffs.push({
      id: 'name',
      field: 'name',
      label: 'اسم المنتج',
      group: 'details',
      oldValue: oldName,
      newValue: newName,
      oldDisplay: oldName || 'بدون اسم',
      newDisplay: newName || 'بدون اسم',
    });
  }

  // 2. كود المنتج
  const oldCode = (original.productCode || '').trim();
  const newCode = (current.productCode || '').trim();
  if (oldCode !== newCode) {
    diffs.push({
      id: 'productCode',
      field: 'productCode',
      label: 'كود المنتج',
      group: 'details',
      oldValue: oldCode,
      newValue: newCode,
      oldDisplay: oldCode || 'بدون كود',
      newDisplay: newCode || 'بدون كود',
    });
  }

  // 3. التعبئة (Packaging)
  const oldPkg = (original.packaging ?? '').toString().trim();
  const newPkg = (current.packaging ?? '').toString().trim();
  if (oldPkg !== newPkg) {
    diffs.push({
      id: 'packaging',
      field: 'packaging',
      label: 'التعبئة',
      group: 'packaging',
      oldValue: oldPkg,
      newValue: newPkg,
      oldDisplay: oldPkg ? `${oldPkg}` : 'غير محددة',
      newDisplay: newPkg ? `${newPkg}` : 'غير محددة',
    });
  }

  // 4. نظام التكسير وعدد القطع
  const oldForce = original.forceStandardCrush ?? true;
  const newForce = current.forceStandardCrush ?? true;
  if (oldForce !== newForce) {
    diffs.push({
      id: 'forceStandardCrush',
      field: 'forceStandardCrush',
      label: 'نظام التكسير التلقائي',
      group: 'packaging',
      oldValue: oldForce,
      newValue: newForce,
      oldDisplay: oldForce ? 'تلقائي (تقسيم على 12 دائماً)' : 'تكسير مخصص',
      newDisplay: newForce ? 'تلقائي (تقسيم على 12 دائماً)' : 'تكسير مخصص',
    });
  }

  if (!newForce && original.piecesCount !== current.piecesCount) {
    const oldPieces = original.piecesCount || 12;
    const newPieces = current.piecesCount || 12;
    if (oldPieces !== newPieces) {
      diffs.push({
        id: 'piecesCount',
        field: 'piecesCount',
        label: 'عدد قطع التكسيرة',
        group: 'packaging',
        oldValue: oldPieces,
        newValue: newPieces,
        oldDisplay: `${oldPieces} قطع`,
        newDisplay: `${newPieces} قطع`,
      });
    }
  }

  // 5. سعر الدرزن بالدينار
  const oldPriceIqd = Number(original.price) || 0;
  const newPriceIqd = Number(current.price) || 0;
  if (oldPriceIqd !== newPriceIqd) {
    const diffVal = newPriceIqd - oldPriceIqd;
    const diffSign = diffVal > 0 ? `+${diffVal.toLocaleString('en-US')}` : diffVal.toLocaleString('en-US');
    diffs.push({
      id: 'price',
      field: 'price',
      label: 'سعر الدرزن (بالدينار)',
      group: 'pricing',
      oldValue: oldPriceIqd,
      newValue: newPriceIqd,
      oldDisplay: `${oldPriceIqd.toLocaleString('en-US')} د.ع`,
      newDisplay: `${newPriceIqd.toLocaleString('en-US')} د.ع`,
      difference: `${diffSign} د.ع`,
      isPositiveChange: diffVal > 0,
    });
  }

  // 6. سعر الدرزن بالدولار
  const oldPriceUsd = Number(original.dozenPriceUsd) || 0;
  const newPriceUsd = Number(current.dozenPriceUsd) || 0;
  if (oldPriceUsd !== newPriceUsd) {
    const diffVal = Number((newPriceUsd - oldPriceUsd).toFixed(2));
    const diffSign = diffVal > 0 ? `+$${diffVal}` : `-$${Math.abs(diffVal)}`;
    diffs.push({
      id: 'dozenPriceUsd',
      field: 'dozenPriceUsd',
      label: 'سعر الدرزن (بالدولار)',
      group: 'pricing',
      oldValue: oldPriceUsd,
      newValue: newPriceUsd,
      oldDisplay: oldPriceUsd > 0 ? `$${oldPriceUsd}` : 'غير محدد',
      newDisplay: newPriceUsd > 0 ? `$${newPriceUsd}` : 'غير محدد',
      difference: diffSign,
      isPositiveChange: diffVal > 0,
    });
  }

  // 7. سعر القطعة بالدينار (التكسيرة)
  const oldPieceIqd = Number(original.piecePriceIqd) || 0;
  const newPieceIqd = Number(current.piecePriceIqd) || 0;
  if (oldPieceIqd !== newPieceIqd) {
    const diffVal = newPieceIqd - oldPieceIqd;
    const diffSign = diffVal > 0 ? `+${diffVal.toLocaleString('en-US')}` : diffVal.toLocaleString('en-US');
    diffs.push({
      id: 'piecePriceIqd',
      field: 'piecePriceIqd',
      label: 'سعر القطعة المفردة (دينار)',
      group: 'pricing',
      oldValue: oldPieceIqd,
      newValue: newPieceIqd,
      oldDisplay: `${oldPieceIqd.toLocaleString('en-US')} د.ع`,
      newDisplay: `${newPieceIqd.toLocaleString('en-US')} د.ع`,
      difference: `${diffSign} د.ع`,
      isPositiveChange: diffVal > 0,
    });
  }

  // 8. سعر القطعة بالدولار
  const oldPieceUsd = Number(original.piecePriceUsd) || 0;
  const newPieceUsd = Number(current.piecePriceUsd) || 0;
  if (oldPieceUsd !== newPieceUsd && (oldPieceUsd > 0 || newPieceUsd > 0)) {
    const diffVal = Number((newPieceUsd - oldPieceUsd).toFixed(2));
    const diffSign = diffVal > 0 ? `+$${diffVal}` : `-$${Math.abs(diffVal)}`;
    diffs.push({
      id: 'piecePriceUsd',
      field: 'piecePriceUsd',
      label: 'سعر القطعة (بالدولار)',
      group: 'pricing',
      oldValue: oldPieceUsd,
      newValue: newPieceUsd,
      oldDisplay: oldPieceUsd > 0 ? `$${oldPieceUsd}` : 'غير محدد',
      newDisplay: newPieceUsd > 0 ? `$${newPieceUsd}` : 'غير محدد',
      difference: diffSign,
      isPositiveChange: diffVal > 0,
    });
  }

  // 9. القسم الرئيسي
  if (original.categoryId !== current.categoryId) {
    const oldCatName = getCatName(original.categoryId);
    const newCatName = getCatName(current.categoryId);
    diffs.push({
      id: 'categoryId',
      field: 'categoryId',
      label: 'القسم الرئيسي',
      group: 'category',
      oldValue: original.categoryId,
      newValue: current.categoryId,
      oldDisplay: oldCatName,
      newDisplay: newCatName,
    });
  }

  // 10. القسم الفرعي
  if ((original.subcategoryId || '') !== (current.subcategoryId || '')) {
    const oldSubName = getCatName(original.subcategoryId);
    const newSubName = getCatName(current.subcategoryId);
    diffs.push({
      id: 'subcategoryId',
      field: 'subcategoryId',
      label: 'القسم الفرعي',
      group: 'category',
      oldValue: original.subcategoryId,
      newValue: current.subcategoryId,
      oldDisplay: oldSubName,
      newDisplay: newSubName,
    });
  }

  // 11. صورة المنتج
  if (original.imageUrl !== current.imageUrl && current.imageUrl) {
    diffs.push({
      id: 'imageUrl',
      field: 'imageUrl',
      label: 'صورة المنتج',
      group: 'media',
      oldValue: original.imageUrl,
      newValue: current.imageUrl,
      oldDisplay: 'الصورة السابقة',
      newDisplay: 'تم اختيار / رفع صورة جديدة',
    });
  }

  // 12. النشر في المعرض العام
  if (Boolean(original.isShowcase) !== Boolean(current.isShowcase)) {
    diffs.push({
      id: 'isShowcase',
      field: 'isShowcase',
      label: 'النشر في المعرض المتميز',
      group: 'media',
      oldValue: original.isShowcase,
      newValue: current.isShowcase,
      oldDisplay: original.isShowcase ? 'منشور في المعرض' : 'غير منشور',
      newDisplay: current.isShowcase ? 'منشور في المعرض' : 'غير منشور',
    });
  }

  // 13. قسم المعرض العام
  if (current.isShowcase && original.showcaseCategory !== current.showcaseCategory) {
    diffs.push({
      id: 'showcaseCategory',
      field: 'showcaseCategory',
      label: 'تصنيف المعرض العام',
      group: 'media',
      oldValue: original.showcaseCategory,
      newValue: current.showcaseCategory,
      oldDisplay: original.showcaseCategory || 'عام',
      newDisplay: current.showcaseCategory || 'عام',
    });
  }

  return diffs;
}

const GROUP_CONFIG: Record<
  string,
  { title: string; icon: any; color: string; badgeBg: string }
> = {
  pricing: {
    title: 'تغييرات الأسعار والتكسيرات',
    icon: DollarSign,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  },
  packaging: {
    title: 'تغييرات التعبئة ونظام التكسير',
    icon: Package,
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
  },
  category: {
    title: 'تغييرات الأقسام والتصنيف',
    icon: Layers,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
  },
  details: {
    title: 'تغييرات الاسم والكود',
    icon: FileText,
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
  },
  media: {
    title: 'تغييرات الصورة والمعرض',
    icon: Sparkles,
    color: 'text-pink-400',
    badgeBg: 'bg-pink-500/10 border-pink-500/20 text-pink-300',
  },
};

/**
 * Live Diff Bar shown inside the edit form while editing
 */
export function ProductEditLiveDiff({
  diffs,
}: {
  diffs: ProductChangeDiffItem[];
}) {
  if (!diffs || diffs.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/50 flex items-center gap-2 select-none">
        <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
        <span>لا توجد تعديلات غير محفوظة حتى الآن على بيانات هذا المنتج.</span>
      </div>
    );
  }

  return (
    <div className="bg-black/40 border border-amber-400/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Split size={16} className="text-amber-400" />
          <span className="text-xs font-bold text-amber-300">
            ملخص التغييرات التي قمت بها:
          </span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
          {diffs.length} {diffs.length === 1 ? 'تعديل' : 'تعديلات'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {diffs.map((diff) => {
          const cfg = GROUP_CONFIG[diff.group] || GROUP_CONFIG.details;
          const Icon = cfg.icon;
          return (
            <div
              key={diff.id}
              className="bg-white/5 border border-white/10 rounded-lg p-2.5 flex flex-col gap-1 text-xs"
            >
              <div className="flex items-center gap-1.5 text-white/60 text-[11px]">
                <Icon size={13} className={cfg.color} />
                <span className="font-semibold text-white/80">{diff.label}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-red-400/80 line-through bg-red-500/10 px-2 py-0.5 rounded text-[11px] font-mono">
                  {diff.oldDisplay}
                </span>
                <ArrowLeft size={12} className="text-amber-400 flex-shrink-0" />
                <span className="text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] font-mono border border-emerald-500/20">
                  {diff.newDisplay}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ProductEditDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  originalProduct: Product | null;
  editedProduct: Product | null;
  categories: Category[];
  isSubmitting: boolean;
}

export function ProductEditDiffModal({
  isOpen,
  onClose,
  onConfirm,
  originalProduct,
  editedProduct,
  categories,
  isSubmitting,
}: ProductEditDiffModalProps) {
  if (!isOpen || !editedProduct || !originalProduct) return null;

  const diffs = calculateProductDiff(originalProduct, editedProduct, categories);

  // Group diffs
  const grouped = diffs.reduce((acc, diff) => {
    if (!acc[diff.group]) acc[diff.group] = [];
    acc[diff.group].push(diff);
    return acc;
  }, {} as Record<string, ProductChangeDiffItem[]>);

  const groupsOrder = ['pricing', 'packaging', 'category', 'details', 'media'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="glass-panel p-6 rounded-2xl border border-amber-400/40 relative w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl bg-[#0f172a]/95 text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Split size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                مراجعة وتأكيد تفاصيل التعديل
              </h3>
              <p className="text-xs text-white/50">
                يرجى مراجعة كافة الفروقات والتغييرات التي طرأت على المنتج قبل الحفظ النهائي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product Meta Header Card */}
        <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
          {(editedProduct.imageUrl || originalProduct.imageUrl) && (
            <img
              src={editedProduct.imageUrl || originalProduct.imageUrl}
              alt="preview"
              className="w-12 h-12 rounded-lg object-contain bg-black/50 border border-white/20 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-white truncate">
              {editedProduct.name || originalProduct.name}
            </h4>
            <div className="flex items-center gap-3 text-xs text-white/60 mt-0.5">
              {editedProduct.productCode && (
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-[11px]">
                  كود: {editedProduct.productCode}
                </span>
              )}
              <span className="text-amber-400 font-bold">
                إجمالي التغييرات: {diffs.length} حقل
              </span>
            </div>
          </div>
        </div>

        {/* Diff Content Body */}
        <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-4">
          {diffs.length === 0 ? (
            <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <AlertCircle size={32} className="text-amber-400 mx-auto" />
              <p className="font-bold text-sm text-white">لم يتم رصد أي تغييرات!</p>
              <p className="text-xs text-white/50">
                لم تقم بتعديل أي من بيانات المنتج الحالية. يمكنك العودة لتعديل البيانات أو إلغاء العملية.
              </p>
            </div>
          ) : (
            groupsOrder.map((groupKey) => {
              const items = grouped[groupKey];
              if (!items || items.length === 0) return null;
              const cfg = GROUP_CONFIG[groupKey] || GROUP_CONFIG.details;
              const GroupIcon = cfg.icon;

              return (
                <div
                  key={groupKey}
                  className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-white/80 border-b border-white/5 pb-2">
                    <GroupIcon size={16} className={cfg.color} />
                    <span>{cfg.title}</span>
                    <span className="mr-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                      {items.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white/90">
                            {item.label}:
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 font-sans">
                          {/* Old Value */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-white/40">قبل:</span>
                            <span className="text-xs text-red-300/90 line-through bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md font-mono">
                              {item.oldDisplay}
                            </span>
                          </div>

                          {/* Arrow */}
                          <div className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                            <ArrowLeft size={12} />
                          </div>

                          {/* New Value */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-white/40">بعد:</span>
                            <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-md font-mono shadow-sm">
                              {item.newDisplay}
                            </span>
                          </div>

                          {/* Difference tag if price */}
                          {item.difference && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                                item.isPositiveChange
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              ({item.difference})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
          >
            الرجوع للتعديل
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || diffs.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>جاري اعتماد وحفظ التعديلات...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>تأكيد وحفظ كافة التعديلات الآن</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
