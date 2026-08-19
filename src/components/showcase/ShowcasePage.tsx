import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Share2, 
  MessageCircle, 
  Lock, 
  Check, 
  Columns, 
  LayoutGrid, 
  Square, 
  Download, 
  Phone,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  X,
  SlidersHorizontal,
  PackageCheck
} from 'lucide-react';
import { api } from '../../api';
import { Product } from '../../types';
import OptimizedImage from '../OptimizedImage';
import ImageViewer from '../ImageViewer';
import Animated3DLogo from '../ui/Animated3DLogo';

export const SHOWCASE_CATEGORIES = [
  { id: 'all', name: 'الكل', icon: '✨' },
  { id: 'رجالي', name: 'رجالي', icon: '👞' },
  { id: 'نسائي', name: 'نسائي', icon: '👠' },
  { id: 'شبابي', name: 'شبابي', icon: '👟' },
  { id: 'ولادي', name: 'ولادي', icon: '👦' },
  { id: 'بناتي', name: 'بناتي', icon: '👧' },
  { id: 'طفل', name: 'طفل', icon: '🧒' },
  { id: 'طفلة', name: 'طفلة', icon: '🎀' },
  { id: 'بيبي', name: 'بيبي', icon: '🍼' },
  { id: 'مواليد', name: 'مواليد', icon: '👶' },
];

export default function ShowcasePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; alt: string; product: Product } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Column view layout (1, 2, or 4)
  const [gridColumns, setGridColumns] = useState<1 | 2 | 4>(() => {
    const saved = localStorage.getItem('brq_showcase_cols');
    if (saved === '1' || saved === '2' || saved === '4') return Number(saved) as 1 | 2 | 4;
    return window.innerWidth < 640 ? 2 : 4;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [allProds, appSettings] = await Promise.all([
        api.getProducts(),
        api.getSettings()
      ]);
      
      // Filter products that are designated for showcase AND not archived/hidden
      const showcaseProds = (allProds || []).filter(p => p.isShowcase && !p.isArchived && !p.isHidden);
      setProducts(showcaseProds);
      setSettings(appSettings || {});
    } catch (e) {
      console.error("Error loading showcase data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isShowcaseLocked = settings?.showcaseEnabled === false;

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category match
      if (selectedCategory !== 'all') {
        const cat = p.showcaseCategory || '';
        if (cat !== selectedCategory) return false;
      }

      // Search match
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchCode = p.productCode?.toLowerCase().includes(q);
        const matchModel = p.modelNumber?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchModel) return false;
      }

      return true;
    });
  }, [products, selectedCategory, searchTerm]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    SHOWCASE_CATEGORIES.forEach(cat => {
      if (cat.id !== 'all') {
        counts[cat.id] = products.filter(p => (p.showcaseCategory || '') === cat.id).length;
      }
    });
    return counts;
  }, [products]);

  // WhatsApp share handler
  const handleSharePage = async () => {
    const url = window.location.href;
    const text = `✨ معرض شركة الوفاء المتميز BRQ ✨\nتفضلوا بالاطلاع على أحدث الموديلات والتشكيلات الحصرية عبر الرابط التالي:\n${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'معرض شركة الوفاء المتميز',
          text: text,
          url: url
        });
        showToast('تمت المشاركة بنجاح');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: Copy link or open WhatsApp
    try {
      await navigator.clipboard.writeText(url);
      showToast('تم نسخ رابط المعرض');
    } catch (e) {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    }
  };

  // Order / Inquire on WhatsApp for single product
  const handleInquireProduct = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    const phone = settings?.phone || '9647700000000';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const currentUrl = window.location.origin + `/showcase?product=${p.id}`;
    const text = `السلام عليكم شركة الوفاء المتميز،\nأود الاستفسار والطلب بخصوص هذا الموديل المعروض:\n- الاسم: ${p.name}\n- الكود: ${p.productCode || '---'}\n- الرمز: ${p.modelNumber || '---'}\n- السعر: ${p.price?.toLocaleString('en-US')} د.ع\n- التعبئة: ${p.piecesCount ? `${p.piecesCount} قطعة` : (p.packaging || '---')}\nرابط الصورة: ${p.finalImageUrl || p.imageUrl || currentUrl}`;
    
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Download product image
  const handleDownloadImage = async (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    const imgUrl = p.finalImageUrl || p.imageUrl;
    if (!imgUrl) return;

    showToast('جاري تنزيل الصورة...');
    try {
      const ext = imgUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
      const filename = `BRQ-${safeName}.${ext}`;
      
      const { downloadImages } = await import('../../utils/download');
      const success = await downloadImages([{ url: imgUrl, filename }]);
      if (success) {
        showToast('تم حفظ الصورة بنجاح');
      } else {
        showToast('حدث خطأ أثناء التنزيل');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء التنزيل');
    }
  };

  // If the admin locked the showcase
  if (!loading && isShowcaseLocked) {
    return (
      <div className="min-h-screen bg-brq-black text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-32 h-32 mb-6">
          <Animated3DLogo scale={1} />
        </div>
        <div className="max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="w-16 h-16 bg-brq-gold/10 text-brq-gold rounded-full flex items-center justify-center mx-auto mb-2 border border-brq-gold/20">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-white">معرض شركة الوفاء المتميز</h1>
          <p className="text-brq-gold font-bold text-sm">المعرض مغلق حالياً للتحديث والتطوير</p>
          <p className="text-white/60 text-xs leading-relaxed">
            نقوم حالياً بتحديث التشكيلات وإضافة أحدث الموديلات الحصرية. سيتم إعادة افتتاح المعرض قريباً جداً.
          </p>
          {settings?.phone && (
            <a 
              href={`tel:${settings.phone}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brq-royal hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg transition-all"
            >
              <Phone size={18} />
              الاتصال بنا: {settings.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brq-black text-white pb-20 selection:bg-brq-gold selection:text-black" dir="rtl">
      
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-brq-gold text-black font-bold px-6 py-2.5 rounded-full shadow-2xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <header className="relative border-b border-white/10 bg-gradient-to-b from-[#081B63]/60 via-black/40 to-transparent backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col gap-3">
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 relative flex items-center justify-center">
                <Animated3DLogo scale={0.7} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-brq-gold bg-brq-gold/10 border border-brq-gold/30 px-2 py-0.5 rounded-full">
                    كتالوج مباشر
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    متاح الآن
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-white leading-tight">
                  معرض شركة الوفاء المتميز
                </h1>
              </div>
            </div>

            {/* Top action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSharePage}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs sm:text-sm font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95"
                title="مشاركة المعرض عبر الواتساب"
              >
                <Share2 size={16} className="text-emerald-400" />
                <span>مشاركة</span>
              </button>

              {settings?.phone && (
                <a
                  href={`https://wa.me/${settings.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('السلام عليكم شركة الوفاء المتميز، أود الاستفسار عن الموديلات المعروضة في الكتالوج.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-brq-royal hover:bg-blue-600 text-white text-xs sm:text-sm font-bold transition-all shadow-lg active:scale-95"
                  title="محادثة واتساب مباشرة"
                >
                  <MessageCircle size={16} />
                  <span className="hidden sm:inline">طلب / استفسار</span>
                </a>
              )}
            </div>
          </div>

          {/* Search bar & Grid controls */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث برقم الموديل، الكود، أو الاسم..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-brq-gold transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Grid Column Selector Buttons */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
              <button
                onClick={() => {
                  setGridColumns(4);
                  localStorage.setItem('brq_showcase_cols', '4');
                }}
                className={`p-1.5 rounded-lg transition-colors ${gridColumns === 4 ? 'bg-brq-gold text-black font-bold' : 'text-white/50 hover:text-white'}`}
                title="عرض 4 أعمدة"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => {
                  setGridColumns(2);
                  localStorage.setItem('brq_showcase_cols', '2');
                }}
                className={`p-1.5 rounded-lg transition-colors ${gridColumns === 2 ? 'bg-brq-gold text-black font-bold' : 'text-white/50 hover:text-white'}`}
                title="عرض عمودين"
              >
                <Columns size={16} />
              </button>
              <button
                onClick={() => {
                  setGridColumns(1);
                  localStorage.setItem('brq_showcase_cols', '1');
                }}
                className={`p-1.5 rounded-lg transition-colors ${gridColumns === 1 ? 'bg-brq-gold text-black font-bold' : 'text-white/50 hover:text-white'}`}
                title="عرض عمود واحد كبير"
              >
                <Square size={16} />
              </button>
            </div>
          </div>

          {/* 9 Categories Tab Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
            {SHOWCASE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all border shrink-0 ${
                    isSelected
                      ? 'bg-brq-gold text-black font-bold border-brq-gold shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-12 h-12 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-white/50 font-mono">جاري تحميل الموديلات المعروضة...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-12 bg-white/5 border border-white/10 rounded-3xl max-w-lg mx-auto mt-8">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-lg font-bold text-white mb-2">لا توجد موديلات منشورة في هذا القسم حالياً</h3>
            <p className="text-xs text-white/50 leading-relaxed max-w-sm mb-6">
              {searchTerm 
                ? 'لم يتم العثور على أي منتج يطابق عبارة البحث الخاصة بك.' 
                : 'سيتم إضافة موديلات وتشكيلات جديدة إلى هذا القسم قريباً.'}
            </p>
            {(selectedCategory !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchTerm('');
                }}
                className="px-5 py-2 bg-brq-gold text-black rounded-xl text-xs font-bold shadow-lg"
              >
                عرض كافة الموديلات
              </button>
            )}
          </div>
        ) : (
          <div className={`transition-all duration-300 ${
            gridColumns === 4 
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4" 
              : gridColumns === 1 
              ? "grid grid-cols-1 max-w-2xl mx-auto gap-5" 
              : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
          }`}>
            {filteredProducts.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => {
                  if (p.finalImageUrl || p.imageUrl) {
                    setFullscreenImage({
                      src: p.finalImageUrl || p.imageUrl,
                      alt: p.name,
                      product: p
                    });
                  }
                }}
                className="glass-card rounded-2xl overflow-hidden flex flex-col border border-white/10 hover:border-brq-gold transition-all duration-300 group cursor-pointer shadow-lg hover:shadow-[0_8px_30px_rgba(0,0,0,0.8)] relative bg-black/40"
              >
                {/* Image Container */}
                <div className="w-full aspect-[4/5] bg-black/60 relative flex items-center justify-center overflow-hidden border-b border-white/5">
                  {p.finalImageUrl || p.imageUrl ? (
                    <OptimizedImage
                      src={p.finalImageUrl || p.imageUrl}
                      alt={p.name}
                      size="medium"
                      className="w-full h-full"
                      imgClassName="object-contain w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="text-4xl text-white/30">👟</div>
                  )}

                  {/* Category Tag Badge */}
                  {p.showcaseCategory && (
                    <span className="absolute top-2.5 right-2.5 z-10 bg-black/70 backdrop-blur-md text-brq-gold border border-brq-gold/30 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                      {p.showcaseCategory}
                    </span>
                  )}

                  {/* Top Action Buttons (Download & Inquire) */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDownloadImage(e, p)}
                      className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-emerald-600 hover:text-white transition-all shadow-md active:scale-90"
                      title="تحميل الصورة"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      onClick={(e) => handleInquireProduct(e, p)}
                      className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-emerald-500 hover:text-white transition-all shadow-md active:scale-90"
                      title="طلب الموديل عبر واتساب"
                    >
                      <MessageCircle size={15} className="text-emerald-400" />
                    </button>
                  </div>
                </div>

                {/* Product Information */}
                <div className="p-3.5 flex flex-col justify-between flex-1 gap-2 bg-gradient-to-b from-transparent to-black/60">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-white text-xs sm:text-sm leading-tight line-clamp-2">
                        {p.name}
                      </h3>
                      {p.productCode && (
                        <span className="text-[10px] text-brq-gold bg-brq-gold/10 border border-brq-gold/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                          {p.productCode}
                        </span>
                      )}
                    </div>

                    {p.modelNumber && (
                      <p className="text-[11px] text-white/50 font-mono mt-1">
                        الرمز: <span className="text-white/80">{p.modelNumber}</span>
                      </p>
                    )}
                  </div>

                  {/* Pricing and Pieces */}
                  <div className="pt-2 border-t border-white/5 flex items-end justify-between">
                    <div>
                      <p className="text-brq-gold font-bold text-sm sm:text-base font-mono">
                        {p.price?.toLocaleString('en-US')} <span className="text-[10px] font-sans">د.ع</span>
                      </p>
                      <p className="text-[9px] text-white/40">سعر الجملة</p>
                    </div>

                    {p.piecesCount ? (
                      <div className="text-left">
                        <p className="text-white font-mono text-xs font-bold">{p.piecesCount} ق</p>
                        <p className="text-[9px] text-white/40">الكرتون</p>
                      </div>
                    ) : p.packaging ? (
                      <span className="text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded">
                        {p.packaging}
                      </span>
                    ) : null}
                  </div>

                  {/* Direct WhatsApp Order Button */}
                  <button
                    onClick={(e) => handleInquireProduct(e, p)}
                    className="w-full mt-1 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                  >
                    <MessageCircle size={14} />
                    <span>طلب عبر واتساب</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Fullscreen Interactive Lightbox Image Viewer */}
      {fullscreenImage && (
        <ImageViewer
          src={fullscreenImage.src}
          alt={fullscreenImage.alt}
          product={fullscreenImage.product}
          currentIndex={filteredProducts.findIndex(p => p.id === fullscreenImage.product.id)}
          totalCount={filteredProducts.length}
          onClose={() => setFullscreenImage(null)}
          onNext={() => {
            const currIdx = filteredProducts.findIndex(p => p.id === fullscreenImage.product.id);
            if (currIdx < filteredProducts.length - 1) {
              const nextProd = filteredProducts[currIdx + 1];
              setFullscreenImage({
                src: nextProd.finalImageUrl || nextProd.imageUrl,
                alt: nextProd.name,
                product: nextProd
              });
            }
          }}
          onPrev={() => {
            const currIdx = filteredProducts.findIndex(p => p.id === fullscreenImage.product.id);
            if (currIdx > 0) {
              const prevProd = filteredProducts[currIdx - 1];
              setFullscreenImage({
                src: prevProd.finalImageUrl || prevProd.imageUrl,
                alt: prevProd.name,
                product: prevProd
              });
            }
          }}
          hasNext={filteredProducts.findIndex(p => p.id === fullscreenImage.product.id) < filteredProducts.length - 1}
          hasPrev={filteredProducts.findIndex(p => p.id === fullscreenImage.product.id) > 0}
        />
      )}
    </div>
  );
}
