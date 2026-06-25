import React, { useState, useEffect } from "react";
import { Loader2, Plus, Upload, X, CheckCircle2 } from "lucide-react";
import { api } from "../../api";
import { burnProductOverlay } from "../../utils/burnImage";
import { Product, Category } from "../../types";


export const autoSelectSubcategory = (name: string, categoryId: string, currentSubcategoryId?: string, categories: Category[] = []) => {
  if (!categoryId || !name) return currentSubcategoryId || "";
  
  const lowerName = name.toLowerCase();
  const subs = categories.filter(c => c.parentId === categoryId);
  
  const matches = [
      { key: "رجالي", term: "رجالي" },
      { key: "نسائي", term: "نسائي" },
      { key: "شبابي", term: "شبابي" },
      { key: "ولادي", term: "ولادي" },
      { key: "طفل", term: "ولادي" },
      { key: "بناتي", term: "بناتي" },
      { key: "طفلة", term: "بناتي" },
      { key: "بيبي", term: "بيبي" },
      { key: "اعدادي", term: "اعدادي" },
      { key: "مدرسي", term: "مدرسي" },
      { key: "سفر", term: "سفر" },
  ];
  
  for (const match of matches) {
      if (lowerName.includes(match.key)) {
          const foundSub = subs.find(s => s.name.includes(match.term) || s.name.includes(match.key));
          if (foundSub) {
              return foundSub.id;
          }
      }
  }
  return currentSubcategoryId || "";
};

interface BatchProductItemProps {
  categories: Category[];
  usdRate: number;
  user: any;
  onAdded: () => void;
  index: number;
  globalCategoryId?: string;
}

export function BatchProductItem({ categories, usdRate, user, onAdded, index, globalCategoryId }: BatchProductItemProps) {
  const [product, setProduct] = useState<Partial<Product>>({
    name: "",
    categoryId: globalCategoryId || "",
    subcategoryId: "",
    productCode: "",
    dozenPriceUsd: 0,
    price: 0,
    packaging: "",
    piecesCount: 12,
    piecePriceUsd: 0,
    piecePriceIqd: 0,
    imageUrl: "",
  });

  useEffect(() => {
    if (globalCategoryId !== undefined) {
      setProduct(p => {
        const autoSub = autoSelectSubcategory(p.name || "", globalCategoryId, p.subcategoryId, categories);
        return { ...p, categoryId: globalCategoryId, subcategoryId: autoSub || p.subcategoryId };
      });
    }
  }, [globalCategoryId, categories]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePriceAndPackaging = (
    usdValue: number,
    packaging: string,
    customPieces: number,
    forceStandardCrush: boolean = false,
  ) => {
    let pieces = customPieces || 12;

    const iqdValue = usdValue * usdRate;
    const calcPieces = forceStandardCrush ? 12 : pieces;
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    setProduct((prev) => ({
      ...prev,
      dozenPriceUsd: usdValue,
      packaging,
      piecesCount: pieces,
      forceStandardCrush,
      price: iqdValue,
      piecePriceUsd: pieceUsd,
      piecePriceIqd: pieceIqd,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
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
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setProduct({ ...product, imageUrl: dataUrl });
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.name || !product.price || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let finalImg = product.imageUrl;
      if (product.imageUrl) {
        try {
          finalImg = await burnProductOverlay(product, product.imageUrl);
        } catch (err) {
          console.error("Failed to generate burned image", err);
        }
      }

      const created = await api.createProduct({
        ...product,
        finalImageUrl: finalImg,
        views: 0,
        isArchived: false,
      } as any);
      
      await api.logAction({
        userId: user?.uid || "",
        userName: user?.username || "System",
        action: "إضافة منتج جديد (جملة)",
        entityType: "product",
        entityId: created.id,
        details: { name: product.name, code: product.productCode },
      });
      
      setIsSuccess(true);
      onAdded();
      
      // Reset form after a short delay so they can enter another one in this slot if they want
      setTimeout(() => {
        setProduct({
          name: "",
          categoryId: product.categoryId, // Keep category selected for convenience
          subcategoryId: product.subcategoryId, // Keep subcategory
          productCode: "",
          dozenPriceUsd: 0,
          price: 0,
          packaging: "",
          piecesCount: 12,
          piecePriceUsd: 0,
          piecePriceIqd: 0,
          imageUrl: "",
        });
        setIsSuccess(false);
        setIsSubmitting(false);
      }, 1500);

    } catch (error) {
      console.error("Error creating product:", error);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
      return (
          <div className="glass-panel p-6 rounded-2xl border border-emerald-500/50 relative flex items-center justify-center flex-col gap-3 min-h-[300px]">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <h3 className="text-xl font-bold text-emerald-400">تم إضافة المنتج بنجاح</h3>
              <p className="text-white/50 text-sm">جاري التجهيز لمنتج جديد...</p>
          </div>
      );
  }

  return (
    <div className="glass-panel p-4 md:p-6 rounded-2xl border border-white/10 relative">
      <h3 className="text-sm font-bold mb-4 text-white/70 border-b border-white/5 pb-2">
        منتج {index}
      </h3>
      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/50 block mb-1">اسم المنتج *</label>
          <input
            required
            type="text"
            value={product.name}
            onChange={(e) => {
              const newName = e.target.value;
              const autoSub = autoSelectSubcategory(newName, product.categoryId || "", product.subcategoryId, categories);
              setProduct({ ...product, name: newName, subcategoryId: autoSub || product.subcategoryId });
            }}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">سعر الدرزن (بالدولار)</label>
          <input
            type="number"
            step="0.01"
            value={product.dozenPriceUsd || ""}
            onChange={(e) =>
              handlePriceAndPackaging(
                Number(e.target.value),
                product.packaging || "",
                product.piecesCount || 12,
                product.forceStandardCrush
              )
            }
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">سعر الدرزن (بالدينار) *</label>
          <input
            required
            type="number"
            value={product.price || ""}
            onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">التعبئة (رقم أو نص يظهر في الصورة)</label>
          <input
            type="text"
            value={product.packaging || ""}
            placeholder="مثال: 12"
            onChange={(e) => {
              const val = e.target.value;
              const num = parseInt(val) || 12;
              handlePriceAndPackaging(
                product.dozenPriceUsd || 0,
                val,
                num,
                product.forceStandardCrush
              );
            }}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono"
          />
        </div>
        <div className="flex items-center gap-2 mt-4 md:col-span-2">
          <label className="text-sm text-white/80 select-none flex-1">
            تشغيل التكسير التلقائي (تقسيم سعر القطعة على 12 دائماً)
          </label>
          <select
            value={product.forceStandardCrush ? "yes" : "no"}
            onChange={(e) => {
              const forceCrush = e.target.value === "yes";
              handlePriceAndPackaging(
                product.dozenPriceUsd || 0,
                product.packaging || "",
                product.piecesCount || 12,
                forceCrush
              );
            }}
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:border-brq-gold/50 outline-none text-white w-24"
          >
            <option value="no">لا</option>
            <option value="yes">نعم</option>
          </select>
        </div>
        {product.piecesCount ? (
          <div className="md:col-span-2 bg-white/5 p-3 rounded-lg border border-white/10 mt-2 text-center">
            <p className="text-xs text-white/50 mb-1">سعر القطعة (بالدينار)</p>
            <p className="font-mono text-lg font-bold text-brq-gold">
              {product.piecePriceIqd?.toLocaleString()} <span className="text-sm">د.ع</span>
            </p>
          </div>
        ) : null}
        {!globalCategoryId && (
          <div>
            <label className="text-xs text-white/50 block mb-1">القسم</label>
            <select
              value={product.categoryId || ""}
              onChange={(e) => {
                const newCat = e.target.value;
                const autoSub = autoSelectSubcategory(product.name || "", newCat, "", categories);
                setProduct({
                  ...product,
                  categoryId: newCat,
                  subcategoryId: autoSub || "",
                });
              }}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white"
            >
              <option value="">-- إختر القسم --</option>
              {categories.filter((c) => !c.parentId).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-white/50 block mb-1">القسم الفرعي</label>
          <select
            value={product.subcategoryId || ""}
            onChange={(e) => setProduct({ ...product, subcategoryId: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white disabled:opacity-50"
            disabled={!product.categoryId}
          >
            <option value="">-- إختر القسم الفرعي --</option>
            {categories.filter((c) => c.parentId === product.categoryId).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">كود المنتج</label>
          <input
            type="text"
            value={product.productCode || ""}
            onChange={(e) => setProduct({ ...product, productCode: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">صورة المنتج</label>
          <div className="flex items-center gap-3">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt="preview"
                className="w-10 h-10 rounded object-contain border border-white/20 bg-black/50"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-colors"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-brq-gold text-black font-bold rounded-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> جاري الإضافة...</>
            ) : (
              "أضف المنتج"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
