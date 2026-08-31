import React, { useState, useEffect, useRef } from 'react';
import { 
  Loader2, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  CheckSquare, 
  Square, 
  Layers, 
  Check, 
  Plus, 
  Trash2,
  Images,
  FolderOpen,
  Sparkles,
  FileCheck,
  UploadCloud,
  HelpCircle,
  Eye
} from 'lucide-react';
import { api } from '../../api';
import { burnProductOverlay } from '../../utils/burnImage';
import { Product, Category } from '../../types';
import { 
  extractProductCodes, 
  extractImageCodes, 
  calculateMatchScore, 
  processImageFileToDataUrl 
} from '../../utils/artNumberMatcher';

export const autoSelectSubcategory = (name: string, categoryId: string, currentSubcategoryId?: string, categories: Category[] = []) => {
  if (!categoryId || !name) return currentSubcategoryId || '';
  
  const lowerName = name.toLowerCase();
  const subs = categories.filter(c => c.parentId === categoryId);
  
  const matches = [
      { key: 'رجالي', term: 'رجالي' },
      { key: 'نسائي', term: 'نسائي' },
      { key: 'شبابي', term: 'شبابي' },
      { key: 'ولادي', term: 'ولادي' },
      { key: "طفلة", term: "طفلة" },
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

interface BatchProductUploadProps {
  categories: Category[];
  usdRate: number;
  user: any;
  onAdded: () => void;
  onClose: () => void;
}

export function BatchProductUpload({ categories, usdRate, user, onAdded, onClose }: BatchProductUploadProps) {
  const [batchCategoryId, setBatchCategoryId] = useState('');
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [rangeFrom, setRangeFrom] = useState<number>(1);
  const [rangeTo, setRangeTo] = useState<number>(5);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadSessionId, setUploadSessionId] = useState(Date.now());
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  // Bulk Image Upload & Auto-Match by Art Number States
  const [isMatchingImages, setIsMatchingImages] = useState(false);
  const [matchingProgress, setMatchingProgress] = useState<{ current: number; total: number; currentFile: string } | null>(null);
  const [autoMatchedCards, setAutoMatchedCards] = useState<Record<number, { filename: string; matchedBy: string; score: number }>>({});
  const [matchResultModal, setMatchResultModal] = useState<{
    totalUploaded: number;
    matchedCount: number;
    unmatchedCount: number;
    matchedDetails: Array<{ productIndex: number; productName: string; filename: string; matchedBy: string }>;
    unmatchedFiles: string[];
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const emptyProduct = () => ({
    name: '',
    categoryId: batchCategoryId || '',
    subcategoryId: '',
    productCode: '',
    modelNumber: '',
    barcode: '',
    dozenPriceUsd: 0,
    price: 0,
    packaging: '',
    piecesCount: 12,
    forceStandardCrush: true,
    piecePriceUsd: 0,
    piecePriceIqd: 0,
    imageUrl: '',
  });

  // Start with 5 product cards or 20, dynamically expandable by +5
  const [products, setProducts] = useState<Partial<Product>[]>(Array.from({ length: 5 }).map(emptyProduct));

  // Add 5 more cards
  const handleAddFiveCards = () => {
    setProducts(prev => [
      ...prev,
      ...Array.from({ length: 5 }).map(emptyProduct)
    ]);
  };

  // Remove a single card
  const handleRemoveCard = (indexToRemove: number) => {
    if (products.length <= 1) return;
    setProducts(prev => prev.filter((_, i) => i !== indexToRemove));
    setSelectedCards(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < indexToRemove) next.add(i);
        else if (i > indexToRemove) next.add(i - 1);
      });
      return next;
    });
  };

  // Toggle card selection for bulk assignment
  const toggleCardSelection = (index: number) => {
    setSelectedCards(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAllCards = () => {
    if (selectedCards.size === products.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(Array.from({ length: products.length }, (_, i) => i)));
    }
  };

  // Apply chosen category to ALL cards
  const applyCategoryToAll = (catId: string) => {
    if (!catId) return;
    setProducts(prev => prev.map(p => {
      const autoSub = autoSelectSubcategory(p.name || '', catId, p.subcategoryId, categories);
      return { ...p, categoryId: catId, subcategoryId: autoSub || p.subcategoryId };
    }));
  };

  // Apply chosen category to only SELECTED cards
  const applyCategoryToSelected = (catId: string) => {
    if (!catId) {
      setAlertMessage('يرجى اختيار القسم أولاً لتطبيقه.');
      return;
    }
    if (selectedCards.size === 0) {
      setAlertMessage('يرجى تحديد البطاقات المطلوبة (عبر المربع أعلى كل بطاقة) لتطبيق القسم عليها.');
      return;
    }
    setProducts(prev => prev.map((p, idx) => {
      if (selectedCards.has(idx)) {
        const autoSub = autoSelectSubcategory(p.name || '', catId, p.subcategoryId, categories);
        return { ...p, categoryId: catId, subcategoryId: autoSub || p.subcategoryId };
      }
      return p;
    }));
  };

  // Apply chosen category to a numeric RANGE (e.g. from card 1 to card 5)
  const applyCategoryToRange = (catId: string) => {
    if (!catId) {
      setAlertMessage('يرجى اختيار القسم أولاً لتطبيقه على المدى المحدد.');
      return;
    }
    const fromIdx = Math.max(0, Math.min(products.length - 1, rangeFrom - 1));
    const toIdx = Math.max(0, Math.min(products.length - 1, rangeTo - 1));
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);

    setProducts(prev => prev.map((p, idx) => {
      if (idx >= start && idx <= end) {
        const autoSub = autoSelectSubcategory(p.name || '', catId, p.subcategoryId, categories);
        return { ...p, categoryId: catId, subcategoryId: autoSub || p.subcategoryId };
      }
      return p;
    }));
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    setProducts(prev => {
      const newProducts = [...prev];
      const product = { ...newProducts[index], [field]: value };
      
      if (field === 'name' && product.categoryId) {
        product.subcategoryId = autoSelectSubcategory(product.name || '', product.categoryId, product.subcategoryId, categories) || product.subcategoryId;
      }
      
      if (field === 'categoryId') {
        const autoSub = autoSelectSubcategory(product.name || '', value, '', categories);
        product.subcategoryId = autoSub || '';
      }
      
      newProducts[index] = product;
      return newProducts;
    });
  };

  const getNormalizedRate = () => {
    const r = usdRate || 1500;
    if (r >= 50000) return Math.round(r / 100);
    if (r >= 50 && r <= 500) return Math.round(r * 10);
    return Math.round(r);
  };

  const updateProductCalculations = (
    index: number,
    updates: Partial<Product>
  ) => {
    setProducts(prev => {
      const newProducts = [...prev];
      const target = { ...newProducts[index], ...updates };

      const usdValue = Number(target.dozenPriceUsd) || 0;
      const iqdValue = Number(target.price) || 0;
      
      const calcPieces = target.forceStandardCrush ? 12 : (Number(target.piecesCount) || 12);
      
      const pieceUsd = calcPieces > 0 ? Number((usdValue / calcPieces).toFixed(2)) : 0;
      const pieceIqd = calcPieces > 0 ? Math.round(iqdValue / calcPieces) : 0;

      newProducts[index] = {
        ...target,
        piecePriceUsd: pieceUsd,
        piecePriceIqd: pieceIqd,
      };
      return newProducts;
    });
  };

  const handleUsdPriceChange = (index: number, usdValue: number) => {
    const rate = getNormalizedRate();
    const cleanUsd = Number(Number(usdValue).toFixed(2));
    const iqdValue = Math.round(cleanUsd * rate);
    updateProductCalculations(index, { dozenPriceUsd: cleanUsd, price: iqdValue });
  };

  const handleIqdPriceChange = (index: number, iqdValue: number) => {
    const rate = getNormalizedRate();
    const cleanIqd = Math.round(Number(iqdValue) || 0);
    const usdValue = rate > 0 ? Number((cleanIqd / rate).toFixed(2)) : 0;
    updateProductCalculations(index, { dozenPriceUsd: usdValue, price: cleanIqd });
  };

  const handlePackagingTextChange = (index: number, packaging: string) => {
    setProducts(prev => {
      const newProducts = [...prev];
      newProducts[index] = { ...newProducts[index], packaging };
      return newProducts;
    });
  };

  const handleForceCrushChange = (index: number, forceStandardCrush: boolean) => {
    updateProductCalculations(index, { forceStandardCrush });
  };

  const handlePiecesCountChange = (index: number, piecesCount: number) => {
    updateProductCalculations(index, { piecesCount });
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 850;
        const MAX_HEIGHT = 850;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          handleProductChange(index, 'imageUrl', dataUrl);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const extractAtNumber = (name: string) => {
    if (!name) return null;
    const words = name.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    if (lastWord && !/[\u0600-\u06FF]/.test(lastWord) && lastWord.length >= 3) {
      return lastWord.toUpperCase().replace(/[-_]/g, '');
    }
    return null;
  };

  // Process Bulk Image Files & Auto-Match by Art Number
  const handleProcessBulkImages = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    // Filter image files only
    const imageFiles = rawFiles.filter(file => 
      file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name)
    );

    if (imageFiles.length === 0) {
      setAlertMessage('لم يتم العثور على أي ملفات صور صالحة بين الملفات المحددة.');
      return;
    }

    setIsMatchingImages(true);
    setMatchingProgress({ current: 0, total: imageFiles.length, currentFile: imageFiles[0]?.name || '' });

    try {
      // 1. Gather all product cards and their extracted Art Numbers
      const productCodeInfos = products.map((p, idx) => ({
        index: idx,
        product: p,
        codes: extractProductCodes(p),
        hasNameOrCode: !!(p.name?.trim() || p.productCode?.trim() || p.modelNumber?.trim())
      }));

      const filledCardsCount = productCodeInfos.filter(p => p.hasNameOrCode).length;
      if (filledCardsCount === 0) {
        setIsMatchingImages(false);
        setMatchingProgress(null);
        setAlertMessage('يرجى أولاً كتابة اسم أو كود المنتجات في البطاقات (مثلاً: رياضة رجالي XD-83649) حتى يتعرف النظام على الآرت نمبر ومطابقة الصور معه.');
        return;
      }

      const newProducts = [...products];
      const matchedDetails: Array<{ productIndex: number; productName: string; filename: string; matchedBy: string }> = [];
      const unmatchedFiles: string[] = [];
      const newAutoMatched = { ...autoMatchedCards };
      const matchedProductIndices = new Set<number>();

      // 2. Iterate through each image file and match with best product
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        setMatchingProgress({ current: i + 1, total: imageFiles.length, currentFile: file.name });

        const imageCodeInfo = extractImageCodes(file.name);
        let bestMatch: { index: number; score: number; matchedBy: string; product: Partial<Product> } | null = null;

        // Compare against each product card that hasn't been assigned an image in this run
        for (const pInfo of productCodeInfos) {
          if (!pInfo.hasNameOrCode) continue; // Skip completely empty cards
          if (matchedProductIndices.has(pInfo.index)) continue; // Already matched in this batch

          const matchRes = calculateMatchScore(pInfo.codes, imageCodeInfo, pInfo.product.name || '');
          if (matchRes.isMatch && matchRes.score >= 70) {
            if (!bestMatch || matchRes.score > bestMatch.score) {
              bestMatch = {
                index: pInfo.index,
                score: matchRes.score,
                matchedBy: matchRes.matchedBy,
                product: pInfo.product
              };
            }
          }
        }

        if (bestMatch) {
          try {
            const dataUrl = await processImageFileToDataUrl(file);
            newProducts[bestMatch.index] = {
              ...newProducts[bestMatch.index],
              imageUrl: dataUrl
            };
            matchedProductIndices.add(bestMatch.index);
            newAutoMatched[bestMatch.index] = {
              filename: file.name,
              matchedBy: bestMatch.matchedBy,
              score: bestMatch.score
            };
            matchedDetails.push({
              productIndex: bestMatch.index + 1,
              productName: bestMatch.product.name || `منتج ${bestMatch.index + 1}`,
              filename: file.name,
              matchedBy: bestMatch.matchedBy
            });
          } catch (err) {
            console.error(`Error processing image ${file.name}:`, err);
            unmatchedFiles.push(file.name);
          }
        } else {
          unmatchedFiles.push(file.name);
        }
      }

      setProducts(newProducts);
      setAutoMatchedCards(newAutoMatched);
      setIsMatchingImages(false);
      setMatchingProgress(null);

      // Open detailed summary modal
      setMatchResultModal({
        totalUploaded: imageFiles.length,
        matchedCount: matchedDetails.length,
        unmatchedCount: unmatchedFiles.length,
        matchedDetails,
        unmatchedFiles
      });

    } catch (err: any) {
      console.error('Error during bulk image auto-matching:', err);
      setIsMatchingImages(false);
      setMatchingProgress(null);
      setAlertMessage('حدث خطأ أثناء فحص الصور ومطابقتها: ' + (err.message || ''));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessBulkImages(e.dataTransfer.files);
    }
  };

  // Ultra-Fast Parallel Publishing (Automatically created as inactive isHidden: true)
  const handleSubmitAll = async () => {
    const validProducts = products.filter(p => p.name && p.price);
    
    if (validProducts.length === 0) {
      setAlertMessage('الرجاء تعبئة منتج واحد على الأقل (الاسم والسعر مطلوبان)');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Quick Duplication Check
      const existingProducts = await api.getProducts();
      const seenAtNumbers = new Set<string>();

      for (const product of validProducts) {
        const atNumber = extractAtNumber(product.name || "");
        if (atNumber) {
          if (seenAtNumbers.has(atNumber)) {
            setIsSubmitting(false);
            if (!window.confirm(`الموديل (${atNumber}) متكرر في قائمة الإضافة الحالية.\n\nهل تريد الاستمرار على أي حال؟`)) {
              return;
            }
          }
          seenAtNumbers.add(atNumber);

          const existing = existingProducts.find(p => {
            const existingAt = extractAtNumber(p.name || "");
            return existingAt === atNumber;
          });
          
          if (existing) {
            setIsSubmitting(false);
            if (!window.confirm(`الموديل (${atNumber}) الخاص بالمنتج "${product.name}" موجود مسبقاً باسم:\n${existing.name}\n\nهل تريد الاستمرار بنشره على أي حال؟`)) {
              return;
            }
          }
        }
      }

      setIsSubmitting(true);

      // 2. Parallel Processing: Upload/burn/save all valid products concurrently
      // Set isHidden: true so products are inactive by default until enabled by the admin
      await Promise.all(
        validProducts.map(async (product) => {
          let finalImg = product.imageUrl;
          if (product.imageUrl) {
            try {
              finalImg = await burnProductOverlay(product as Product, product.imageUrl);
            } catch (err) {
              console.error('Failed to generate burned image', err);
            }
          }

          const created = await api.createProduct({
            ...product,
            categoryId: product.categoryId || batchCategoryId,
            subcategoryId: product.subcategoryId,
            finalImageUrl: finalImg,
            views: 0,
            isArchived: false,
            isHidden: true, // Non-active (غير مفعل) by default as requested!
          } as any);
          
          api.logAction({
            userId: user?.uid || '',
            userName: user?.username || 'System',
            action: 'إضافة منتج جديد (نشر سريع - غير مفعل تلقائياً)',
            entityType: 'product',
            entityId: created.id,
            details: { name: product.name, code: product.productCode },
          }).catch(() => {});
        })
      );
      
      setIsSuccess(true);
      onAdded();
      
    } catch (error: any) {
      console.error('Error creating products:', error);
      setIsSubmitting(false);
      setAlertMessage('حدث خطأ أثناء إضافة المنتجات: ' + (error.message || ''));
    }
  };

  return (
    <div className="space-y-4">
      {isSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => {
              setProducts(Array.from({ length: 5 }).map(() => ({
                ...emptyProduct(),
                categoryId: batchCategoryId
              })));
              setUploadSessionId(Date.now());
              setSelectedCards(new Set());
              setIsSuccess(false);
              setIsSubmitting(false);
            }}
          />
          <div
            className="relative w-full max-w-sm bg-brq-card border border-brq-gold/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(212,175,55,0.15)] flex flex-col items-center text-center overflow-hidden"
            dir="rtl"
          >
            <div className="w-20 h-20 rounded-full bg-brq-gold/10 flex items-center justify-center mb-6 border border-brq-gold/20">
              <CheckCircle2 size={40} className="text-brq-gold" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              تم النشر السريع بنجاح!
            </h3>
            <p className="text-white/70 mb-2 text-sm leading-relaxed">
              تم نشر المنتجات بنجاح، وتلقائياً كمنتجات <span className="text-amber-400 font-bold">غير مفعلة</span> حتى تقوم بتفعيلها من قائمة المنتجات.
            </p>
            <button
              onClick={() => {
                setProducts(Array.from({ length: 5 }).map(() => ({
                  ...emptyProduct(),
                  categoryId: batchCategoryId
                })));
                setUploadSessionId(Date.now());
                setSelectedCards(new Set());
                setIsSuccess(false);
                setIsSubmitting(false);
              }}
              className="w-full mt-6 py-3 px-4 rounded-xl font-bold text-black bg-brq-gold hover:bg-yellow-500 transition-colors shadow-lg"
            >
              فهمت
            </button>
          </div>
        </div>
      )}

      {/* Top Header: Flexible Category Assignment Bar & Add +5 Cards button */}
      <div className="flex flex-col gap-3 bg-black/40 p-4 rounded-xl border border-white/10" dir="rtl">
        <div className="flex flex-wrap justify-between items-center pb-2 border-b border-white/10 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-brq-gold font-bold text-base">النشر السريع للمنتجات ({products.length} بطاقة) ⚡</h3>
            <span className="text-xs text-white/50">
              (المنتجات تنشر تلقائياً كمنتجات غير مفعلة)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* The requested option: Add 5 Cards on every click */}
            <button
              type="button"
              onClick={handleAddFiveCards}
              className="flex items-center gap-1.5 py-1.5 px-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl font-bold text-xs transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] active:scale-95"
              title="إضافة 5 بطاقات جديدة لإدخال منتجات أكثر"
            >
              <Plus size={16} />
              <span>إضافة 5 بطاقات (+5)</span>
            </button>

            <button onClick={onClose} className="text-white/50 hover:text-white p-1" title="إغلاق">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Category Controls & Bulk Apply */}
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto flex-1">
            <div className="w-full sm:w-64">
              <label className="text-xs text-white/50 block mb-1 font-bold">اختر القسم لتطبيقه:</label>
              <select
                value={batchCategoryId}
                onChange={(e) => setBatchCategoryId(e.target.value)}
                className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm font-bold focus:border-brq-gold/50 outline-none text-black"
              >
                <option value="">-- اختر القسم --</option>
                {categories.filter((c) => !c.parentId).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-auto">
              <button
                type="button"
                onClick={() => applyCategoryToAll(batchCategoryId)}
                disabled={!batchCategoryId}
                className="py-2 px-3 bg-brq-gold text-black rounded-lg font-bold text-xs hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                title={`تطبيق هذا القسم على جميع الـ ${products.length} بطاقة`}
              >
                تطبيق على الكل ({products.length} بطاقة)
              </button>

              <button
                type="button"
                onClick={() => applyCategoryToSelected(batchCategoryId)}
                disabled={!batchCategoryId || selectedCards.size === 0}
                className="py-2 px-3 bg-brq-navy border border-brq-gold/60 text-brq-gold rounded-lg font-bold text-xs hover:bg-brq-gold hover:text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="تطبيق على البطاقات التي قمت بالتأشير عليها"
              >
                تطبيق على المحددة ({selectedCards.size})
              </button>
            </div>
          </div>

          {/* Range Selection: From Card X to Card Y */}
          <div className="flex flex-wrap items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10 text-xs w-full lg:w-auto">
            <span className="text-white/70 font-bold">أو تطبيق من بطاقة</span>
            <input
              type="number"
              min="1"
              max={products.length}
              value={rangeFrom}
              onChange={(e) => setRangeFrom(parseInt(e.target.value) || 1)}
              className="w-12 bg-white text-black font-bold font-mono px-1.5 py-1 rounded text-center outline-none"
            />
            <span className="text-white/70 font-bold">إلى</span>
            <input
              type="number"
              min="1"
              max={products.length}
              value={rangeTo}
              onChange={(e) => setRangeTo(parseInt(e.target.value) || 1)}
              className="w-12 bg-white text-black font-bold font-mono px-1.5 py-1 rounded text-center outline-none"
            />
            <button
              type="button"
              onClick={() => applyCategoryToRange(batchCategoryId)}
              disabled={!batchCategoryId}
              className="py-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              تطبيق على المدى
            </button>

            <button
              type="button"
              onClick={selectAllCards}
              className="py-1 px-2 text-[11px] text-white/60 hover:text-white underline mr-1"
            >
              {selectedCards.size === products.length ? 'إلغاء تحديد الكل' : 'تحديد كل البطاقات'}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden File and Folder Inputs for Bulk Matching */}
      <input
        ref={multiFileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleProcessBulkImages(e.target.files);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: "", directory: "" } as any)}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleProcessBulkImages(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Bulk Images Auto-Match by Art Number Panel */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-4 rounded-xl border transition-all ${
          isDragOver 
            ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)] scale-[1.01]' 
            : 'bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border-amber-500/30'
        }`}
        dir="rtl"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
              <Images size={22} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm md:text-base font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-amber-400" />
                  رفع وتوزيع الصور تلقائياً حسب الآرت نمبر (Art Number / رقم الموديل) ⚡
                </h4>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  Auto-Match
                </span>
              </div>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                ارفع أي عدد من الصور (مثلاً <span className="text-amber-300 font-bold">20 صورة</span> والمنتجات <span className="text-amber-300 font-bold">10 منتجات</span>)، وسيقوم النظام فوراً بمطابقة كود الصورة (مثل <span className="text-amber-300 font-mono font-bold">XD-83649</span>) مع الآرت نمبر الموجود في اسم المنتج وتوزيعها على الحقول تلقائياً!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => multiFileInputRef.current?.click()}
              disabled={isMatchingImages}
              className="flex-1 md:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <UploadCloud size={16} />
              <span>اختر حزمة صور (Files) 📂</span>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={isMatchingImages}
              className="flex-1 md:flex-none px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="اختيار مجلد كامل لرفع كل الصور بداخله"
            >
              <FolderOpen size={16} className="text-amber-400" />
              <span>مجلد كامل (Folder) 📁</span>
            </button>
          </div>
        </div>

        {/* Progress indicator during matching */}
        {isMatchingImages && matchingProgress && (
          <div className="mt-3 pt-3 border-t border-amber-500/20">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin text-amber-400" />
                جاري مطابقة وتوزيع الصور ({matchingProgress.current} من {matchingProgress.total})...
              </span>
              <span className="font-mono text-white/70 text-[11px] truncate max-w-[200px]" dir="ltr">
                {matchingProgress.currentFile}
              </span>
            </div>
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-amber-500/20">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-150"
                style={{ width: `${Math.round((matchingProgress.current / matchingProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Grid of Dynamic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" dir="rtl">
        {products.map((product, idx) => {
          const isSelected = selectedCards.has(idx);
          const currentCat = categories.find(c => c.id === product.categoryId);

          return (
            <div 
              key={idx} 
              className={`glass-panel p-4 rounded-xl border transition-all relative ${
                isSelected 
                  ? 'border-brq-gold/80 bg-brq-gold/5 shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                  : 'border-white/10'
              }`}
            >
              {/* Card Header with Checkbox, Card Number and Delete button */}
              <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCardSelection(idx)}
                    className="rounded text-brq-gold focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-white/80">
                    منتج {idx + 1}
                  </span>
                </label>

                <div className="flex items-center gap-1.5">
                  {product.categoryId && (
                    <span className="text-[10px] bg-white/10 text-brq-gold px-2 py-0.5 rounded font-bold max-w-[100px] truncate" title={currentCat?.name}>
                      {currentCat?.name}
                    </span>
                  )}
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCard(idx)}
                      className="text-white/30 hover:text-red-400 p-1 transition-colors"
                      title="حذف هذه البطاقة"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">اسم المنتج *</label>
                  <input
                    type="text"
                    value={product.name || ''}
                    onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                    className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-base font-bold focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">كود المنتج</label>
                  <input
                    type="text"
                    value={product.productCode || ''}
                    onChange={(e) => handleProductChange(idx, 'productCode', e.target.value)}
                    className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-base font-bold focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">سعر الدرزن (بالدولار)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={product.dozenPriceUsd || ''}
                    onChange={(e) => handleUsdPriceChange(idx, Number(e.target.value))}
                    className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">سعر الدرزن (بالدينار) *</label>
                  <input
                    type="number"
                    value={product.price || ''}
                    onChange={(e) => handleIqdPriceChange(idx, Number(e.target.value))}
                    className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">التعبئة (رقم/نص)</label>
                  <input
                    type="text"
                    value={product.packaging || ''}
                    placeholder="مثال: 12"
                    onChange={(e) => handlePackagingTextChange(idx, e.target.value)}
                    className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                  />
                </div>

                {/* Individual Card Category Selector (Always Available for Customization) */}
                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5 font-bold">القسم الرئيسي</label>
                  <select
                    value={product.categoryId || ''}
                    onChange={(e) => handleProductChange(idx, 'categoryId', e.target.value)}
                    className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-base font-bold focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                  >
                    <option value="">-- اختر القسم --</option>
                    {categories.filter((c) => !c.parentId).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">القسم الفرعي</label>
                  <select
                    value={product.subcategoryId || ''}
                    onChange={(e) => handleProductChange(idx, 'subcategoryId', e.target.value)}
                    className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-base font-bold focus:border-brq-gold/50 outline-none text-black disabled:opacity-50 placeholder:text-gray-500"
                    disabled={!product.categoryId}
                  >
                    <option value="">-- إختر --</option>
                    {categories.filter((c) => c.parentId === product.categoryId).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">
                    تكسير تلقائي (على 12)
                  </label>
                  <select
                    value={product.forceStandardCrush ? 'yes' : 'no'}
                    onChange={(e) => handleForceCrushChange(idx, e.target.value === 'yes')}
                    className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-base font-bold focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                  >
                    <option value="no">لا</option>
                    <option value="yes">نعم</option>
                  </select>
                </div>
                {!product.forceStandardCrush && (
                  <div>
                    <label className="text-[10px] text-white/50 block mb-0.5">عدد القطع</label>
                    <input
                      type="number"
                      value={product.piecesCount || ""}
                      onChange={(e) => handlePiecesCountChange(idx, parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-base font-bold focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                    />
                  </div>
                )}

                {product.piecesCount ? (
                  <div className="bg-white/5 p-1.5 rounded border border-white/10 mt-1 text-center flex justify-between items-center">
                    <span className="text-[10px] text-white/50">سعر القطعة:</span>
                    <span className="font-mono text-xs font-bold text-brq-gold">
                      {product.piecePriceIqd?.toLocaleString("en-US")} د.ع
                    </span>
                  </div>
                ) : null}

                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5 font-bold">صورة المنتج</label>
                  
                  {autoMatchedCards[idx] && (
                    <div className="mb-1.5 bg-amber-500/15 border border-amber-400/40 rounded-lg p-1.5 flex items-center justify-between text-[11px] text-amber-300 font-bold">
                      <span className="flex items-center gap-1 truncate">
                        <Sparkles size={12} className="text-amber-400 shrink-0" />
                        <span>تم الربط التلقائي:</span>
                      </span>
                      <span className="font-mono text-white text-[10px] bg-black/40 px-1.5 py-0.5 rounded truncate max-w-[110px]" title={autoMatchedCards[idx].filename}>
                        {autoMatchedCards[idx].filename}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {product.imageUrl && (
                      <div className="relative group w-20 h-20 rounded-lg overflow-hidden border border-amber-400/40 bg-black/60 shadow-md">
                        <img
                          src={product.imageUrl}
                          alt="preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleProductChange(idx, 'imageUrl', '');
                            setAutoMatchedCards(prev => {
                              const next = { ...prev };
                              delete next[idx];
                              return next;
                            });
                          }}
                          className="absolute top-1 left-1 bg-red-600/90 text-white rounded p-0.5 hover:bg-red-700 transition-colors opacity-90 group-hover:opacity-100"
                          title="إزالة الصورة"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <input
                      key={`${uploadSessionId}-${idx}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(idx, e)}
                      className="w-full bg-white border border-black rounded px-2 py-1 text-[10px] focus:border-brq-gold/50 outline-none text-black file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-black/10 file:text-black hover:file:bg-black/20 transition-colors"
                    />
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
      
      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 bg-black/80 backdrop-blur-md p-4 border-t border-white/10 z-10 flex flex-col sm:flex-row gap-3 items-center justify-between mt-4 rounded-xl" dir="rtl">
          <button
            type="button"
            onClick={handleAddFiveCards}
            className="w-full sm:w-auto py-3 px-5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
          >
            <Plus size={18} />
            <span>إضافة 5 بطاقات أخرى (+5)</span>
          </button>

          <button
            onClick={handleSubmitAll}
            disabled={isSubmitting}
            className="w-full sm:flex-1 py-4 text-base sm:text-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-colors shadow-lg shadow-emerald-500/20"
          >
            {isSubmitting ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> جاري النشر بأقصى سرعة...</>
            ) : (
              <><Upload className="w-6 h-6" /> نشر جميع المنتجات ({products.filter(p => p.name && p.price).length} منتج جاهز)</>
            )}
          </button>
      </div>

      {/* Match Result Summary Modal */}
      {matchResultModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[320] backdrop-blur-md">
          <div className="bg-brq-card border border-amber-500/40 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)]" dir="rtl">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"></div>

            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    تقرير مطابقة وتوزيع الصور (Auto-Match)
                  </h3>
                  <p className="text-xs text-white/60">
                    تم فحص أسماء ملفات الصور ومطابقتها مع كود الآرت نمبر لكل منتج
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setMatchResultModal(null)} 
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-2 p-4 bg-black/50 border-b border-white/10 text-center">
              <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                <span className="text-xs text-white/90 block mb-1 font-bold">الصور المرفوعة</span>
                <span className="text-xl font-black text-white font-mono">{matchResultModal.totalUploaded}</span>
              </div>
              <div className="bg-emerald-600/30 p-3 rounded-xl border border-emerald-400/40">
                <span className="text-xs text-white font-bold block mb-1">تم ربطها بنجاح</span>
                <span className="text-xl font-black text-white font-mono">
                  {matchResultModal.matchedCount}
                </span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                <span className="text-xs text-white/90 block mb-1 font-bold">تم تجاهلها (بدون تطابق)</span>
                <span className="text-xl font-black text-white font-mono">{matchResultModal.unmatchedCount}</span>
              </div>
            </div>

            {/* Scrollable details list */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4 max-h-[45vh]">
              {matchResultModal.matchedDetails.length > 0 && (
                <div>
                  <h4 className="text-sm font-black text-white mb-2.5 flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    المنتجات التي تم إسناد صور لها بنجاح ({matchResultModal.matchedDetails.length}):
                  </h4>
                  <div className="space-y-2">
                    {matchResultModal.matchedDetails.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/10 border border-white/20 text-xs shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-emerald-600 text-white font-black px-2 py-1 rounded text-xs shadow-sm">
                            بطاقة {item.productIndex}
                          </span>
                          <span className="font-black text-white text-sm max-w-[240px] truncate drop-shadow-sm" title={item.productName}>
                            {item.productName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/60 text-sm">⬅️</span>
                          <span className="font-mono text-xs text-yellow-300 font-bold bg-black/60 px-2.5 py-1 rounded border border-white/20 max-w-[180px] truncate" title={item.filename} dir="ltr">
                            {item.filename}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchResultModal.unmatchedFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                      <HelpCircle size={16} className="text-amber-400" />
                      صور لم يُعثر على منتج مطابق لها في البطاقات الحالية ({matchResultModal.unmatchedFiles.length}):
                    </h4>
                  </div>
                  <p className="text-xs text-white/80 mb-2 font-medium">
                    (تأكد من كتابة نفس الآرت نمبر بدقة في اسم المنتج مثل: <span className="text-yellow-300 font-mono font-bold bg-black/50 px-1 rounded">XD-83649</span>)
                  </p>
                  <div className="p-3 rounded-lg bg-white/10 border border-white/20 max-h-36 overflow-y-auto">
                    <div className="flex flex-wrap gap-2" dir="ltr">
                      {matchResultModal.unmatchedFiles.map((fname, i) => (
                        <span key={i} className="text-xs font-mono bg-black/70 text-white font-bold px-2.5 py-1 rounded border border-white/20 truncate max-w-[200px]" title={fname}>
                          {fname}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end">
              <button
                type="button"
                onClick={() => setMatchResultModal(null)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                ممتاز، متابعة العمل 👍
              </button>
            </div>
          </div>
        </div>
      )}

      {alertMessage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[300] backdrop-blur-sm">
          <div className="bg-brq-card border border-brq-border rounded-xl p-6 max-w-sm w-full relative overflow-hidden" dir="rtl">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-700"></div>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              تنبيه
            </h3>
            <p className="text-white/80 mb-6 leading-relaxed whitespace-pre-wrap">
              {alertMessage}
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setAlertMessage(null)}
                className="px-6 py-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 hover:border-red-500 rounded-lg transition-all font-bold text-sm"
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
