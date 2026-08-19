import React, { useState, useEffect, useRef } from 'react';
import { 
  Loader2, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Images, 
  Sparkles, 
  Copy, 
  Plus, 
  Trash2, 
  Layers, 
  Zap, 
  ArrowDownToLine,
  RefreshCw,
  FileCheck,
  Check
} from 'lucide-react';
import { api } from '../../api';
import { burnProductOverlay } from '../../utils/burnImage';
import { Product, Category } from '../../types';

export const autoSelectSubcategory = (
  name: string, 
  categoryId: string, 
  currentSubcategoryId?: string, 
  categories: Category[] = []
) => {
  if (!categoryId || !name) return currentSubcategoryId || '';
  
  const lowerName = name.toLowerCase();
  const subs = categories.filter(c => c.parentId === categoryId);
  
  const matches = [
    { key: 'رجالي', term: 'رجالي' },
    { key: 'نسائي', term: 'نسائي' },
    { key: 'شبابي', term: 'شبابي' },
    { key: 'ولادي', term: 'ولادي' },
    { key: 'طفلة', term: 'طفلة' },
    { key: 'طفل', term: 'طفل' },
    { key: 'بناتي', term: 'بناتي' },
    { key: 'بيبي', term: 'بيبي' },
    { key: 'مواليد', term: 'مواليد' },
    { key: 'اعدادي', term: 'اعدادي' },
    { key: 'مدرسي', term: 'مدرسي' },
    { key: 'سفر', term: 'سفر' },
  ];
  
  for (const match of matches) {
    if (lowerName.includes(match.key)) {
      const foundSub = subs.find(s => s.name.includes(match.term) || s.name.includes(match.key));
      if (foundSub) {
        return foundSub.id;
      }
    }
  }
  return currentSubcategoryId || '';
};

export const extractAtCodeFromText = (text: string): string | null => {
  if (!text) return null;
  // Match AT codes like AT-1050, AT1050, at-204, or trailing numbers like #4050
  const match = text.match(/(?:AT|at)[\s-_]*(\d+)/i) || text.match(/([a-zA-Z]{1,3}[-_]?\d{3,5})/);
  if (match) {
    return match[0].toUpperCase().replace(/[\s-_]/g, '');
  }
  const words = text.trim().split(/\s+/);
  const lastWord = words[words.length - 1];
  if (lastWord && !/[\u0600-\u06FF]/.test(lastWord) && lastWord.length >= 3) {
    return lastWord.toUpperCase().replace(/[-_]/g, '');
  }
  return null;
};

interface BatchProductUploadProps {
  categories: Category[];
  usdRate: number;
  user: any;
  onAdded: () => void;
  onClose: () => void;
}

export function BatchProductUpload({ categories, usdRate, user, onAdded, onClose }: BatchProductUploadProps) {
  const [targetCount, setTargetCount] = useState<number>(20);
  const [batchCategoryId, setBatchCategoryId] = useState('');
  const [batchSubcategoryId, setBatchSubcategoryId] = useState('');
  const [batchPriceUsd, setBatchPriceUsd] = useState<number | ''>('');
  const [batchPriceIqd, setBatchPriceIqd] = useState<number | ''>('');
  const [batchPackaging, setBatchPackaging] = useState('12');
  const [batchForceCrush, setBatchForceCrush] = useState(true);
  const [publishToShowcase, setPublishToShowcase] = useState(false);
  const [batchNamePrefix, setBatchNamePrefix] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<{ current: number; total: number; percent: number }>({
    current: 0,
    total: 0,
    percent: 0,
  });
  const [isSuccess, setIsSuccess] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);
  const [uploadSessionId, setUploadSessionId] = useState(Date.now());
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [publishedProductIds, setPublishedProductIds] = useState<Set<number>>(new Set());

  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const emptyProduct = () => ({
    name: '',
    categoryId: '',
    subcategoryId: '',
    productCode: '',
    modelNumber: '',
    barcode: '',
    dozenPriceUsd: 0,
    price: 0,
    packaging: '12',
    piecesCount: 12,
    forceStandardCrush: true,
    piecePriceUsd: 0,
    piecePriceIqd: 0,
    imageUrl: '',
    isProcessing: false,
    isPublished: false,
  });

  // Default to 20 products
  const [products, setProducts] = useState<Array<Partial<Product> & { isProcessing?: boolean; isPublished?: boolean }>>(
    Array.from({ length: 20 }).map(emptyProduct)
  );

  // Sync products array length when targetCount changes
  const adjustProductSlots = (newCount: number) => {
    setTargetCount(newCount);
    setProducts(prev => {
      if (prev.length < newCount) {
        const added = Array.from({ length: newCount - prev.length }).map(() => ({
          ...emptyProduct(),
          categoryId: batchCategoryId,
          subcategoryId: batchSubcategoryId,
          packaging: batchPackaging || '12',
          price: typeof batchPriceIqd === 'number' ? batchPriceIqd : 0,
          dozenPriceUsd: typeof batchPriceUsd === 'number' ? batchPriceUsd : 0,
        }));
        return [...prev, ...added];
      } else if (prev.length > newCount) {
        return prev.slice(0, newCount);
      }
      return prev;
    });
  };

  // When global category changes, update slots if empty
  useEffect(() => {
    if (batchCategoryId) {
      setProducts(prev => prev.map(p => {
        const cat = p.categoryId || batchCategoryId;
        const autoSub = autoSelectSubcategory(p.name || '', cat, p.subcategoryId || batchSubcategoryId, categories);
        return { 
          ...p, 
          categoryId: cat, 
          subcategoryId: autoSub || p.subcategoryId || batchSubcategoryId 
        };
      }));
    }
  }, [batchCategoryId, batchSubcategoryId, categories]);

  const handleProductChange = (index: number, field: string, value: any) => {
    setProducts(prev => {
      const newProducts = [...prev];
      const product = { ...newProducts[index], [field]: value };
      
      if (field === 'name') {
        const currentCat = product.categoryId || batchCategoryId;
        if (currentCat) {
          product.subcategoryId = autoSelectSubcategory(product.name || '', currentCat, product.subcategoryId, categories) || product.subcategoryId;
        }
        // Auto-extract AT code if productCode is empty
        if (!product.productCode) {
          const extractedCode = extractAtCodeFromText(value);
          if (extractedCode) {
            product.productCode = extractedCode;
            product.modelNumber = extractedCode;
          }
        }
      }
      
      newProducts[index] = product;
      return newProducts;
    });
  };

  const updateProductCalculations = (index: number, updates: Partial<Product>) => {
    setProducts(prev => {
      const newProducts = [...prev];
      const target = { ...newProducts[index], ...updates };

      const usdValue = target.dozenPriceUsd || 0;
      const iqdValue = target.price || 0;
      
      const calcPieces = target.forceStandardCrush ? 12 : (target.piecesCount || 12);
      
      const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
      const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

      newProducts[index] = {
        ...target,
        piecePriceUsd: Number(pieceUsd.toFixed(2)),
        piecePriceIqd: pieceIqd,
      };
      return newProducts;
    });
  };

  const handleUsdPriceChange = (index: number, usdValue: number) => {
    const iqdValue = usdValue * usdRate;
    updateProductCalculations(index, { dozenPriceUsd: usdValue, price: iqdValue });
  };

  const handleIqdPriceChange = (index: number, iqdValue: number) => {
    const usdValue = usdRate > 0 ? iqdValue / usdRate : 0;
    updateProductCalculations(index, { dozenPriceUsd: Number(usdValue.toFixed(2)), price: iqdValue });
  };

  // High-Speed Canvas Image Compressor
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 850;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.75));
          } else {
            resolve(reader.result as string);
          }
        };
        img.onerror = () => resolve(reader.result as string);
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Single Slot Image Upload
  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Try to extract name/code from filename if slot name is empty
    const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const cleanName = fileNameWithoutExt.replace(/[-_]/g, ' ').trim();
    const extractedCode = extractAtCodeFromText(fileNameWithoutExt);

    const compressed = await compressImageFile(file);
    
    setProducts(prev => {
      const next = [...prev];
      const current = next[index];
      next[index] = {
        ...current,
        imageUrl: compressed,
        name: current.name || (batchNamePrefix ? `${batchNamePrefix} ${cleanName}` : cleanName),
        productCode: current.productCode || extractedCode || '',
        modelNumber: current.modelNumber || extractedCode || '',
      };
      return next;
    });
  };

  // Multi-Image Bulk Selector (Upload up to 20 images at once!)
  const handleMultiImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // If selected files count is greater than current slots, adjust slots
    if (files.length > products.length) {
      adjustProductSlots(Math.min(30, Math.max(20, files.length)));
    }

    const compressedImages = await Promise.all(
      files.map(async (f) => ({
        file: f,
        dataUrl: await compressImageFile(f),
        cleanName: (f.name.substring(0, f.name.lastIndexOf('.')) || f.name).replace(/[-_]/g, ' ').trim(),
        extractedCode: extractAtCodeFromText(f.name),
      }))
    );

    setProducts(prev => {
      const next = [...prev];
      compressedImages.forEach((imgData, i) => {
        if (i < next.length) {
          const existing = next[i];
          const assignedName = existing.name || (batchNamePrefix ? `${batchNamePrefix} ${imgData.cleanName}` : imgData.cleanName);
          const assignedCat = existing.categoryId || batchCategoryId;
          const assignedSub = existing.subcategoryId || (assignedCat ? autoSelectSubcategory(assignedName, assignedCat, batchSubcategoryId, categories) : '');

          next[i] = {
            ...existing,
            imageUrl: imgData.dataUrl,
            name: assignedName,
            productCode: existing.productCode || imgData.extractedCode || '',
            modelNumber: existing.modelNumber || imgData.extractedCode || '',
            categoryId: assignedCat,
            subcategoryId: assignedSub,
            packaging: existing.packaging || batchPackaging || '12',
            price: existing.price || (typeof batchPriceIqd === 'number' ? batchPriceIqd : 0),
            dozenPriceUsd: existing.dozenPriceUsd || (typeof batchPriceUsd === 'number' ? batchPriceUsd : 0),
            forceStandardCrush: batchForceCrush,
          };
        }
      });
      return next;
    });
  };

  // Apply Bulk Global Settings to all slots
  const applyBatchPriceToAll = () => {
    if (batchPriceIqd === '' && batchPriceUsd === '') {
      setAlertMessage('يرجى كتابة السعر بالدينار أو الدولار في شريط التحكم السريع أولاً.');
      return;
    }
    setProducts(prev => prev.map(p => {
      const iqd = typeof batchPriceIqd === 'number' ? batchPriceIqd : (typeof batchPriceUsd === 'number' ? batchPriceUsd * usdRate : p.price || 0);
      const usd = typeof batchPriceUsd === 'number' ? batchPriceUsd : (usdRate > 0 ? iqd / usdRate : 0);
      const calcPieces = p.forceStandardCrush ? 12 : (p.piecesCount || 12);
      return {
        ...p,
        price: iqd,
        dozenPriceUsd: Number(usd.toFixed(2)),
        piecePriceIqd: calcPieces > 0 ? iqd / calcPieces : 0,
        piecePriceUsd: calcPieces > 0 ? Number((usd / calcPieces).toFixed(2)) : 0,
      };
    }));
  };

  const applyBatchPackagingToAll = () => {
    if (!batchPackaging) return;
    setProducts(prev => prev.map(p => ({ ...p, packaging: batchPackaging })));
  };

  const applyBatchCategoryToAll = () => {
    if (!batchCategoryId) return;
    setProducts(prev => prev.map(p => ({
      ...p,
      categoryId: batchCategoryId,
      subcategoryId: autoSelectSubcategory(p.name || '', batchCategoryId, batchSubcategoryId, categories) || batchSubcategoryId,
    })));
  };

  const applyBatchNamePrefixToAll = () => {
    if (!batchNamePrefix.trim()) return;
    setProducts(prev => prev.map(p => {
      if (p.name && !p.name.startsWith(batchNamePrefix)) {
        return { ...p, name: `${batchNamePrefix} ${p.name}` };
      }
      return p;
    }));
  };

  const clearAllSlots = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في تفريغ جميع البطاقات؟')) {
      setProducts(Array.from({ length: targetCount }).map(emptyProduct));
      setUploadSessionId(Date.now());
      setPublishedProductIds(new Set());
    }
  };

  // Ultra-Fast Parallel Publishing Engine
  const handleSubmitAll = async () => {
    const validProductsWithIndices = products
      .map((p, originalIndex) => ({ product: p, originalIndex }))
      .filter(({ product }) => product.name && product.price);

    if (validProductsWithIndices.length === 0) {
      setAlertMessage('الرجاء تعبئة منتج واحد على الأقل (الاسم والسعر مطلوبان لكل منتج جاهز للنشر).');
      return;
    }

    setIsSubmitting(true);
    setPublishedProductIds(new Set());
    setSubmitProgress({ current: 0, total: validProductsWithIndices.length, percent: 0 });

    try {
      // 1. Fetch existing AT numbers once in one quick query for fast duplication warning
      const existingProducts = await api.getProducts();
      const seenAtNumbers = new Set<string>();
      const duplicatesFound: string[] = [];

      for (const { product } of validProductsWithIndices) {
        const atNumber = extractAtCodeFromText(product.name || '') || product.productCode;
        if (atNumber) {
          if (seenAtNumbers.has(atNumber)) {
            duplicatesFound.push(`الكود (${atNumber}) مكرر في هذه القائمة.`);
          }
          seenAtNumbers.add(atNumber);

          const existing = existingProducts.find(p => {
            const existingAt = extractAtCodeFromText(p.name || '') || p.productCode;
            return existingAt === atNumber;
          });
          if (existing) {
            duplicatesFound.push(`الكود (${atNumber}) موجود مسبقاً باسم: "${existing.name}".`);
          }
        }
      }

      if (duplicatesFound.length > 0) {
        const confirmMsg = `تنبيه التكرار:\n${duplicatesFound.slice(0, 3).join('\n')}${duplicatesFound.length > 3 ? `\n... و ${duplicatesFound.length - 3} تنبيهات أخرى` : ''}\n\nهل تريد المتابعة والنشر السريع على أي حال؟`;
        if (!window.confirm(confirmMsg)) {
          setIsSubmitting(false);
          return;
        }
      }

      // 2. High-speed Parallel Processing in concurrent chunks of 6
      const CONCURRENCY = 6;
      let completedCount = 0;
      const newPublishedSet = new Set<number>();

      for (let i = 0; i < validProductsWithIndices.length; i += CONCURRENCY) {
        const chunk = validProductsWithIndices.slice(i, i + CONCURRENCY);

        await Promise.all(
          chunk.map(async ({ product, originalIndex }) => {
            try {
              // Rapid Burn Overlay
              let finalImg = product.imageUrl;
              if (product.imageUrl) {
                try {
                  finalImg = await burnProductOverlay(product as Product, product.imageUrl);
                } catch (err) {
                  console.error('Burn overlay error on batch item:', err);
                }
              }

              // Fast create
              const created = await api.createProduct({
                ...product,
                categoryId: product.categoryId || batchCategoryId,
                subcategoryId: product.subcategoryId || batchSubcategoryId,
                packaging: product.packaging || batchPackaging || '12',
                finalImageUrl: finalImg,
                views: 0,
                isArchived: false,
                isHidden: false, // published directly
                isShowcase: publishToShowcase,
                showcaseCategory: publishToShowcase ? (categories.find(c => c.id === (product.categoryId || batchCategoryId))?.name || 'عام') : undefined,
              } as any);

              // Background log action (non-blocking)
              api.logAction({
                userId: user?.uid || '',
                userName: user?.username || 'System',
                action: 'نشر سريع جماعي (الرفع السريع)',
                entityType: 'product',
                entityId: created.id,
                details: { name: product.name, code: product.productCode },
              }).catch(() => {});

              completedCount++;
              newPublishedSet.add(originalIndex);
              setPublishedProductIds(new Set(newPublishedSet));
              setSubmitProgress({
                current: completedCount,
                total: validProductsWithIndices.length,
                percent: Math.round((completedCount / validProductsWithIndices.length) * 100),
              });
            } catch (err) {
              console.error('Failed to publish item:', product.name, err);
            }
          })
        );
      }

      setPublishedCount(completedCount);
      setIsSuccess(true);
      onAdded();
    } catch (error: any) {
      console.error('Error creating batch products:', error);
      setAlertMessage('حدث خطأ أثناء النشر السريع: ' + (error.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = products.filter(p => p.name && p.price).length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Success Celebration Modal */}
      {isSuccess && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => {
              setIsSuccess(false);
              adjustProductSlots(20);
              setUploadSessionId(Date.now());
            }}
          />
          <div
            className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-black to-gray-950 border-2 border-brq-gold/50 rounded-3xl p-8 shadow-[0_0_60px_rgba(212,175,55,0.25)] flex flex-col items-center text-center overflow-hidden"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500/20 to-brq-gold/20 flex items-center justify-center mb-6 border-2 border-brq-gold shadow-lg shadow-brq-gold/20 animate-bounce">
              <CheckCircle2 size={52} className="text-brq-gold" />
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">
              تم النشر السريع بنجاح! ⚡
            </h3>
            
            <p className="text-amber-300 font-bold text-base mb-2">
              تم نشر {publishedCount} منتج فوراً داخل التطبيق والكتالوج
            </p>
            {publishToShowcase && (
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-2 mb-6 text-xs text-amber-200 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span>تم إدراج المنتجات في معرض شركة الوفاء المتميز</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
              <button
                onClick={() => {
                  setIsSuccess(false);
                  adjustProductSlots(20);
                  setUploadSessionId(Date.now());
                }}
                className="flex-1 py-3.5 px-4 rounded-xl font-black text-black bg-gradient-to-r from-brq-gold to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg text-sm flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                <span>رفع 20 منتج إضافي</span>
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-all text-sm border border-white/10"
              >
                إغلاق والعودة للكتالوج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Top Control Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 p-5 rounded-2xl border border-brq-gold/40 shadow-2xl space-y-4">
        {/* Header Title & Slots Count Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brq-gold/20 border border-brq-gold/40 rounded-xl text-brq-gold">
              <Zap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">الرفع والنشر السريع الفوري</h2>
                <span className="bg-brq-gold text-black text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm">
                  20 منتج دفعة واحدة
                </span>
              </div>
              <p className="text-xs text-white/60">
                ارفع وانشر حتى 20 منتج بضغطة زر واحدة وبأقصى سرعة معالجة متوازية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <div className="flex items-center bg-black/60 border border-white/15 rounded-xl p-1 gap-1 text-xs">
              <span className="text-white/50 px-2 font-bold">عدد البطاقات:</span>
              {[10, 20, 30].map(cnt => (
                <button
                  key={cnt}
                  onClick={() => adjustProductSlots(cnt)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    targetCount === cnt 
                      ? 'bg-brq-gold text-black shadow-md' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cnt} منتج
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="text-white/40 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors"
              title="إغلاق"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Rapid Actions Bar: Multi-Image Dropzone + Global Category & Price Presets */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Multi-Image Quick Selector */}
          <div className="md:col-span-4 bg-gradient-to-tr from-brq-gold/15 to-yellow-500/10 border-2 border-dashed border-brq-gold/60 hover:border-brq-gold rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-brq-gold/20 group relative overflow-hidden"
            onClick={() => multiFileInputRef.current?.click()}
          >
            <input
              ref={multiFileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleMultiImageSelect}
            />
            <div className="w-12 h-12 rounded-full bg-brq-gold/20 flex items-center justify-center mb-2 text-brq-gold group-hover:scale-110 transition-transform">
              <Images size={24} />
            </div>
            <span className="font-black text-white text-sm group-hover:text-brq-gold transition-colors">
              📸 اختيار حتى 20 صورة دفعة واحدة
            </span>
            <span className="text-[11px] text-white/60 mt-1">
              يتم توزيع الصور واستخراج الأسماء والأكواد تلقائياً
            </span>
          </div>

          {/* Quick Apply Global Preset Inputs */}
          <div className="md:col-span-8 bg-black/50 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles size={14} /> تعميم البيانات السريعة على جميع الـ {targetCount} منتج:
              </span>
              <button
                onClick={clearAllSlots}
                className="text-[11px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 size={13} /> تفريغ البطاقات
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Category */}
              <div>
                <label className="text-[11px] text-white/60 block mb-1 font-bold">القسم الرئيسي الموحد</label>
                <select
                  value={batchCategoryId}
                  onChange={(e) => setBatchCategoryId(e.target.value)}
                  className="w-full bg-white border border-black rounded-lg px-2.5 py-1.5 text-xs font-bold text-black outline-none focus:border-brq-gold"
                >
                  <option value="">-- اختر القسم للكل --</option>
                  {categories.filter(c => !c.parentId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* IQD Price */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-white/60 font-bold">سعر الدرزن (د.ع)</label>
                  <button
                    onClick={applyBatchPriceToAll}
                    className="text-[10px] text-brq-gold hover:underline font-bold"
                  >
                    تطبيق على الكل ⚡
                  </button>
                </div>
                <input
                  type="number"
                  placeholder="مثال: 60000"
                  value={batchPriceIqd}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : '';
                    setBatchPriceIqd(val);
                    if (typeof val === 'number' && usdRate > 0) {
                      setBatchPriceUsd(Number((val / usdRate).toFixed(2)));
                    }
                  }}
                  className="w-full bg-white border border-black rounded-lg px-2.5 py-1.5 text-xs font-bold text-black font-mono outline-none"
                />
              </div>

              {/* Packaging */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-white/60 font-bold">التعبئة الموحدة</label>
                  <button
                    onClick={applyBatchPackagingToAll}
                    className="text-[10px] text-brq-gold hover:underline font-bold"
                  >
                    تطبيق على الكل ⚡
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="مثال: 12"
                  value={batchPackaging}
                  onChange={(e) => setBatchPackaging(e.target.value)}
                  className="w-full bg-white border border-black rounded-lg px-2.5 py-1.5 text-xs font-bold text-black font-mono outline-none"
                />
              </div>
            </div>

            {/* Prefix & Showcase Checkbox */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="بادئة الاسم (مثال: حذاء سبورت)..."
                  value={batchNamePrefix}
                  onChange={(e) => setBatchNamePrefix(e.target.value)}
                  className="bg-white border border-black rounded-lg px-2.5 py-1 text-xs text-black font-bold outline-none flex-1 sm:w-48"
                />
                <button
                  onClick={applyBatchNamePrefixToAll}
                  className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg font-bold border border-white/20 whitespace-nowrap"
                >
                  إضافة للأسماء
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 rounded-xl">
                <input
                  type="checkbox"
                  checked={publishToShowcase}
                  onChange={(e) => setPublishToShowcase(e.target.checked)}
                  className="rounded text-amber-400 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-amber-300">
                  ✨ نشر فوري في معرض شركة الوفاء المتميز
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Publishing Progress Bar (Active when submitting) */}
      {isSubmitting && (
        <div className="bg-gradient-to-r from-amber-500/20 via-brq-gold/20 to-amber-500/20 border border-brq-gold/50 rounded-2xl p-4 animate-pulse space-y-2">
          <div className="flex justify-between items-center text-sm font-black text-amber-300">
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-brq-gold" />
              جاري النشر السريع المتوازي...
            </span>
            <span>
              {submitProgress.current} من {submitProgress.total} ({submitProgress.percent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-brq-gold/30">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-brq-gold transition-all duration-300 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.8)]"
              style={{ width: `${submitProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Grid of Product Cards (Responsive 1 to 4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {products.map((product, idx) => {
          const isComplete = Boolean(product.name && product.price);
          const isItemPublished = publishedProductIds.has(idx);

          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                isItemPublished 
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : isComplete
                  ? 'bg-black/60 border-brq-gold/40 shadow-lg'
                  : 'bg-black/40 border-white/10 opacity-90'
              } p-3.5`}
            >
              {/* Card Top Indicator */}
              <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-white/10">
                <span className="font-black text-xs text-white/80 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-brq-gold font-mono">
                    {idx + 1}
                  </span>
                  منتج #{idx + 1}
                </span>

                {isItemPublished ? (
                  <span className="text-[10px] bg-emerald-500 text-black font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={11} /> تم النشر
                  </span>
                ) : isComplete ? (
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                    جاهز للنشر ✓
                  </span>
                ) : (
                  <span className="text-[10px] text-white/40 font-medium">
                    بانتظار البيانات
                  </span>
                )}
              </div>

              {/* Card Form Fields */}
              <div className="space-y-2 flex-1">
                {/* Image Upload Thumbnail & Selector */}
                <div>
                  <div className="flex items-center gap-2">
                    {product.imageUrl ? (
                      <div className="relative group w-14 h-14 rounded-lg overflow-hidden border border-brq-gold/50 bg-black flex-shrink-0">
                        <img
                          src={product.imageUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleProductChange(idx, 'imageUrl', '')}
                          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                          title="حذف الصورة"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-14 h-14 rounded-lg border-2 border-dashed border-white/20 hover:border-brq-gold/70 bg-white/5 flex flex-col items-center justify-center text-white/40 hover:text-brq-gold cursor-pointer flex-shrink-0 transition-colors">
                        <Upload size={16} />
                        <span className="text-[9px] mt-0.5">صورة</span>
                        <input
                          key={`${uploadSessionId}-${idx}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(idx, e)}
                          className="hidden"
                        />
                      </label>
                    )}

                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-white/60 block mb-0.5 font-bold">اسم المنتج *</label>
                      <input
                        type="text"
                        placeholder="اسم الموديل/الحذاء"
                        value={product.name || ''}
                        onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                        className="w-full bg-white border border-black rounded-lg px-2 py-1 text-xs font-bold text-black outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Code & Model */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9.5px] text-white/50 block mb-0.5 font-bold">كود المادة</label>
                    <input
                      type="text"
                      placeholder="الكود"
                      value={product.productCode || ''}
                      onChange={(e) => handleProductChange(idx, 'productCode', e.target.value)}
                      className="w-full bg-white border border-black rounded-lg px-2 py-1 text-xs font-bold text-black font-mono outline-none uppercase placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] text-white/50 block mb-0.5 font-bold">التعبئة</label>
                    <input
                      type="text"
                      placeholder="12"
                      value={product.packaging || ''}
                      onChange={(e) => handleProductChange(idx, 'packaging', e.target.value)}
                      className="w-full bg-white border border-black rounded-lg px-2 py-1 text-xs font-bold text-black font-mono outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Price IQD and USD */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[9.5px] text-white/50 block mb-0.5 font-bold">سعر الدرزن (د.ع) *</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={product.price || ''}
                      onChange={(e) => handleIqdPriceChange(idx, Number(e.target.value))}
                      className="w-full bg-white border border-black rounded-lg px-2 py-1 text-xs font-black text-black font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] text-white/50 block mb-0.5 font-bold">سعر الدرزن ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={product.dozenPriceUsd || ''}
                      onChange={(e) => handleUsdPriceChange(idx, Number(e.target.value))}
                      className="w-full bg-white border border-black rounded-lg px-2 py-1 text-xs font-bold text-black font-mono outline-none"
                    />
                  </div>
                </div>

                {/* Category selection if not globally picked */}
                {!batchCategoryId && (
                  <div>
                    <label className="text-[9.5px] text-white/50 block mb-0.5 font-bold">القسم</label>
                    <select
                      value={product.categoryId || ''}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        const autoSub = autoSelectSubcategory(product.name || '', newCat, '', categories);
                        handleProductChange(idx, 'categoryId', newCat);
                        handleProductChange(idx, 'subcategoryId', autoSub || '');
                      }}
                      className="w-full bg-white border border-black rounded-lg px-2 py-1 text-xs font-bold text-black outline-none"
                    >
                      <option value="">-- اختر القسم --</option>
                      {categories.filter(c => !c.parentId).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Card Footer: Calculated piece price badge */}
              <div className="mt-2.5 pt-2 border-t border-white/10 flex justify-between items-center text-[10px]">
                <span className="text-white/50">سعر القطعة:</span>
                <span className="font-mono font-black text-amber-300">
                  {product.piecePriceIqd ? `${product.piecePriceIqd.toLocaleString('en-US')} د.ع` : '---'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Action Bar: Instant Publish Button */}
      <div className="sticky bottom-4 z-40 bg-gradient-to-r from-gray-900 via-black to-gray-900 p-4 border-2 border-brq-gold/50 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-brq-gold/20 flex items-center justify-center text-brq-gold font-bold font-mono">
            {validCount}/{targetCount}
          </div>
          <div>
            <div className="font-black text-white text-sm">
              جاهز للنشر: {validCount} من {targetCount} منتج
            </div>
            <div className="text-[11px] text-white/60">
              سيتم نشر جميع المنتجات المكتملة بالتوازي وبأقصى سرعة
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => adjustProductSlots(targetCount + 5)}
            className="py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs border border-white/20 flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} /> إضافة 5 بطاقات أخرى
          </button>

          <button
            onClick={handleSubmitAll}
            disabled={isSubmitting || validCount === 0}
            className="flex-1 sm:flex-none py-3.5 px-8 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 hover:from-emerald-400 hover:to-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-all text-base tracking-wide"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري النشر السريع ({submitProgress.current}/{submitProgress.total})...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current" />
                <span>نشر جميع الـ ({validCount}) منتج الآن ⚡</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[350] backdrop-blur-sm">
          <div className="bg-brq-card border border-brq-border rounded-2xl p-6 max-w-sm w-full relative overflow-hidden" dir="rtl">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-amber-500"></div>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              تنبيه
            </h3>
            <p className="text-white/80 text-sm mb-6 leading-relaxed whitespace-pre-wrap">
              {alertMessage}
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setAlertMessage(null)}
                className="px-6 py-2 bg-brq-gold text-black rounded-xl font-bold text-sm hover:bg-yellow-500 transition-all"
              >
                فهمت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
