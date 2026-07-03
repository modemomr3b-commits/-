import React, { useState, useEffect } from 'react';
import { Loader2, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { burnProductOverlay } from '../../utils/burnImage';
import { Product, Category } from '../../types';

export const autoSelectSubcategory = (name: string, categoryId: string, currentSubcategoryId?: string, categories: Category[] = []) => {
  if (!categoryId || !name) return currentSubcategoryId || '';
  
  const lowerName = name.toLowerCase();
  const subs = categories.filter(c => c.parentId === categoryId);
  
  const matches = [
      { key: 'رجالي', term: 'رجالي' },
      { key: 'نسائي', term: 'نسائي' },
      { key: 'شبابي', term: 'شبابي' },
      { key: 'ولادي', term: 'ولادي' },
      { key: 'طفلة', term: 'طفل' },
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadSessionId, setUploadSessionId] = useState(Date.now());
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  const emptyProduct = () => ({
    name: '',
    categoryId: '',
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

  const [products, setProducts] = useState<Partial<Product>[]>(Array.from({ length: 10 }).map(emptyProduct));

  useEffect(() => {
    if (batchCategoryId) {
      setProducts(prev => prev.map(p => {
        const autoSub = autoSelectSubcategory(p.name || '', batchCategoryId, p.subcategoryId, categories);
        return { ...p, categoryId: batchCategoryId, subcategoryId: autoSub || p.subcategoryId };
      }));
    }
  }, [batchCategoryId, categories]);

  const handleProductChange = (index: number, field: string, value: any) => {
    setProducts(prev => {
      const newProducts = [...prev];
      const product = { ...newProducts[index], [field]: value };
      
      if (field === 'name' && product.categoryId) {
        product.subcategoryId = autoSelectSubcategory(product.name || '', product.categoryId, product.subcategoryId, categories) || product.subcategoryId;
      }
      
      newProducts[index] = product;
      return newProducts;
    });
  };

  const handlePriceAndPackaging = (
    index: number,
    usdValue: number,
    packaging: string,
    customPieces: number,
    forceStandardCrush: boolean = false,
  ) => {
    let pieces = forceStandardCrush ? 12 : (customPieces || 12);

    const iqdValue = usdValue * usdRate;
    const calcPieces = forceStandardCrush ? 12 : pieces;
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    setProducts(prev => {
      const newProducts = [...prev];
      newProducts[index] = {
        ...newProducts[index],
        dozenPriceUsd: usdValue,
        packaging,
        piecesCount: pieces,
        forceStandardCrush,
        price: iqdValue,
        piecePriceUsd: pieceUsd,
        piecePriceIqd: pieceIqd,
      };
      return newProducts;
    });
  };

  const handleIqdPriceChange = (
    index: number,
    iqdValue: number,
    packaging: string,
    customPieces: number,
    forceStandardCrush: boolean = false,
  ) => {
    let pieces = forceStandardCrush ? 12 : (customPieces || 12);

    const usdValue = usdRate > 0 ? iqdValue / usdRate : 0;
    const calcPieces = forceStandardCrush ? 12 : pieces;
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    setProducts(prev => {
      const newProducts = [...prev];
      newProducts[index] = {
        ...newProducts[index],
        dozenPriceUsd: Number(usdValue.toFixed(2)),
        packaging,
        piecesCount: pieces,
        forceStandardCrush,
        price: iqdValue,
        piecePriceUsd: Number(pieceUsd.toFixed(2)),
        piecePriceIqd: pieceIqd,
      };
      return newProducts;
    });
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
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
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
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

  const handleSubmitAll = async () => {
    const validProducts = products.filter(p => p.name && p.price);
    
    if (validProducts.length === 0) {
      setAlertMessage('الرجاء تعبئة منتج واحد على الأقل (الاسم والسعر مطلوبان)');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const existingProducts = await api.getProducts();
      const seenAtNumbers = new Set<string>();

      for (const product of validProducts) {
        const atNumber = extractAtNumber(product.name || "");
        if (atNumber) {
          if (seenAtNumbers.has(atNumber)) {
            setIsSubmitting(false);
            if (!window.confirm(`الموديل (${atNumber}) متكرر في قائمة الإضافة الحالية.\n\nهل تريد الاستمرار على أي حال؟`)) {
            setIsSubmitting(false);
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
            setIsSubmitting(false);
            return;
          }
          }
        }
      }

      for (const product of validProducts) {
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
          finalImageUrl: finalImg,
          views: 0,
          isArchived: false,
          isHidden: true,
        } as any);
        
        await api.logAction({
          userId: user?.uid || '',
          userName: user?.username || 'System',
          action: 'إضافة منتج جديد (جملة - نشر سريع)',
          entityType: 'product',
          entityId: created.id,
          details: { name: product.name, code: product.productCode },
        });
      }
      
      setIsSuccess(true);
      onAdded();
      
      setTimeout(() => {
        setProducts(Array.from({ length: 10 }).map(() => ({
          ...emptyProduct(),
          categoryId: batchCategoryId
        })));
        setUploadSessionId(Date.now());
        setIsSuccess(false);
        setIsSubmitting(false);
      }, 1500);

    } catch (error: any) {
      console.error('Error creating products:', error);
      setIsSubmitting(false);
      setAlertMessage('حدث خطأ أثناء إضافة المنتجات: ' + (error.message || ''));
    }
  };

  return (
    <div className="space-y-4">
      {isSuccess && (
          <div className="glass-panel p-6 rounded-2xl border border-emerald-500/50 flex flex-col items-center justify-center gap-3">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <h3 className="text-xl font-bold text-emerald-400">تم إضافة المنتجات بنجاح</h3>
              <p className="text-white/50 text-sm">جاري التجهيز لدفعة جديدة...</p>
          </div>
      )}

      <div className="flex flex-col gap-4 bg-black/40 p-4 rounded-xl border border-white/10">
          <div className="flex justify-between items-center">
              <h3 className="text-brq-gold font-bold">نمط الرفع السريع</h3>
              <button onClick={onClose} className="text-white/50 hover:text-white">
                  <X size={20} />
              </button>
          </div>
          <div className="w-full md:w-1/2">
              <label className="text-xs text-white/50 block mb-1">القسم الرئيسي لكل المنتجات</label>
              <select
                  value={batchCategoryId}
                  onChange={(e) => setBatchCategoryId(e.target.value)}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
              >
                  <option value="">-- إختر القسم الرئيسي --</option>
                  {categories.filter((c) => !c.parentId).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product, idx) => (
          <div key={idx} className="glass-panel p-4 rounded-xl border border-white/10 relative">
            <h3 className="text-xs font-bold mb-3 text-white/70 border-b border-white/5 pb-2">
              منتج {idx + 1}
            </h3>
            
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-[10px] text-white/50 block mb-0.5">اسم المنتج *</label>
                <input
                  type="text"
                  value={product.name || ''}
                  onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                  className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-xs focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                />
              </div>
              
              <div>
                <label className="text-[10px] text-white/50 block mb-0.5">كود المنتج</label>
                <input
                  type="text"
                  value={product.productCode || ''}
                  onChange={(e) => handleProductChange(idx, 'productCode', e.target.value)}
                  className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-xs focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-white/50 block mb-0.5">سعر الدرزن (بالدولار)</label>
                <input
                  type="number"
                  step="0.01"
                  value={product.dozenPriceUsd || ''}
                  onChange={(e) =>
                    handlePriceAndPackaging(
                      idx,
                      Number(e.target.value),
                      product.packaging || '',
                      product.piecesCount || 12,
                      product.forceStandardCrush
                    )
                  }
                  className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-xs focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-white/50 block mb-0.5">سعر الدرزن (بالدينار) *</label>
                <input
                  type="number"
                  value={product.price || ''}
                  onChange={(e) => handleIqdPriceChange(
                    idx,
                    Number(e.target.value),
                    product.packaging || "",
                    product.piecesCount || 12,
                    product.forceStandardCrush
                  )}
                  className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-xs focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-white/50 block mb-0.5">التعبئة (رقم/نص)</label>
                <input
                  type="text"
                  value={product.packaging || ''}
                  placeholder="مثال: 12"
                  onChange={(e) => {
                    const val = e.target.value;
                    const num = parseInt(val) || 12;
                    handlePriceAndPackaging(
                      idx,
                      product.dozenPriceUsd || 0,
                      val,
                      num,
                      product.forceStandardCrush
                    );
                  }}
                  className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-xs focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
              </div>

              {!batchCategoryId && (
                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">القسم</label>
                  <select
                    value={product.categoryId || ''}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const autoSub = autoSelectSubcategory(product.name || '', newCat, '', categories);
                      handleProductChange(idx, 'categoryId', newCat);
                      handleProductChange(idx, 'subcategoryId', autoSub || '');
                    }}
                    className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-xs focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                  >
                    <option value="">-- إختر --</option>
                    {categories.filter((c) => !c.parentId).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] text-white/50 block mb-0.5">القسم الفرعي</label>
                <select
                  value={product.subcategoryId || ''}
                  onChange={(e) => handleProductChange(idx, 'subcategoryId', e.target.value)}
                  className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-xs focus:border-brq-gold/50 outline-none text-black disabled:opacity-50 placeholder:text-gray-500"
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
                  onChange={(e) => {
                    const forceCrush = e.target.value === 'yes';
                    handlePriceAndPackaging(
                      idx,
                      product.dozenPriceUsd || 0,
                      product.packaging || '',
                      product.piecesCount || 12,
                      forceCrush
                    );
                  }}
                  className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-xs focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500"
                >
                  <option value="no">لا</option>
                  <option value="yes">نعم</option>
                </select>
              </div>

              {product.piecesCount ? (
                <div className="bg-white/5 p-1.5 rounded border border-white/10 mt-1 text-center flex justify-between items-center">
                  <span className="text-[10px] text-white/50">سعر القطعة:</span>
                  <span className="font-mono text-xs font-bold text-brq-gold">
                    {product.piecePriceIqd?.toLocaleString()} د.ع
                  </span>
                </div>
              ) : null}

              <div>
                <label className="text-[10px] text-white/50 block mb-0.5">صورة المنتج</label>
                <div className="flex flex-col gap-2">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt="preview"
                      className="w-16 h-16 rounded object-contain border border-white/20 bg-black/50"
                    />
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
        ))}
      </div>
      
      <div className="sticky bottom-0 bg-black/80 backdrop-blur-md p-4 border-t border-white/10 z-10 flex justify-center mt-4 rounded-xl">
          <button
            onClick={handleSubmitAll}
            disabled={isSubmitting}
            className="w-full md:w-1/2 py-4 text-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-colors shadow-lg shadow-emerald-500/20"
          >
            {isSubmitting ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> جاري النشر...</>
            ) : (
              <><Upload className="w-6 h-6" /> نشر جميع المنتجات ({products.filter(p => p.name && p.price).length})</>
            )}
          </button>
      </div>

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
