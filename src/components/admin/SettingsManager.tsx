import { Save, Building2, Monitor, Bell, Shield, Globe, HardDrive, Loader2, DollarSign, Phone, Send, MessageCircle, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api.ts';
import { supabase } from '../../supabase';
import { burnProductOverlay } from '../../utils/burnImage';
import { normalizeArabic, autoDetectCategoryAndSubcategory } from '../../utils/categoryDetector';
import { isArchivedCategoryName } from '../../utils/search';

export default function SettingsManager() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [updateProgress, setUpdateProgress] = useState<{current: number, total: number} | null>(null);
  const [isUsdRateLocked, setIsUsdRateLocked] = useState(true);
  const [settings, setSettings] = useState({
    companyName: 'شركة الوفاء المتميز',
    phone: '07801359735',
    phone2: '07817982888',
    telegram1: '07801359735',
    telegram2: '07817982888',
    showcasePromptEnabled: true,
    maintenanceMode: false,
    openRegistration: true,
    usdExchangeRate: 1590, // Default value
  });
  
  useEffect(() => {
    let mounted = true;
    api.getSettings().then((data) => {
      if (mounted) {
        if (data) {
          setSettings(prev => ({ ...prev, ...data }));
        }
        setInitialLoad(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [priceUpdateProgress, setPriceUpdateProgress] = useState<{current: number, total: number} | null>(null);

  const handleUpdatePricesAndImages = async () => {
    if (!window.confirm("هل أنت متأكد من رغبتك في إعادة حساب جميع الأسعار وتحديث الصور؟ سيتم استخدام تقنية التحديث السريع (Lightning Update) كما سيتم محاولة استرجاع الأقسام المفقودة تلقائياً.")) return;
    setIsUpdatingPrices(true);
    try {
      const [products, categories] = await Promise.all([
        api.getProducts(),
        api.getCategories()
      ]);

      const archivedCat = categories.find(c => isArchivedCategoryName(c.name));
      const archivedCatId = archivedCat?.id;
      
      // Default fallback for new products
      const newArrivalsCat = categories.find(c => c.name === 'جديد الوفاء' && !c.parentId);
      const newArrivalsCatId = newArrivalsCat?.id;

      const productsToUpdate = products.filter(p => 
        !p.isDeleted && 
        p.dozenPriceUsd && p.dozenPriceUsd > 0 && p.imageUrl
      );
      
      const total = productsToUpdate.length;
      if (total === 0) {
        alert("لا توجد منتجات فعالة بأسعار دولار تحتاج لتحديث.");
        setIsUpdatingPrices(false);
        return;
      }

      setPriceUpdateProgress({ current: 0, total });
      
      const rate = settings.usdExchangeRate || 1590;
      const normalizedRate = rate >= 50000 ? Math.round(rate / 100) : (rate >= 50 && rate <= 500 ? Math.round(rate * 10) : Math.round(rate));

      // Step 1: Generate all images and data in parallel batches
      const BATCH_SIZE = 15; 
      const updates: any[] = [];
      let processed = 0;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = productsToUpdate.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (p) => {
          try {
            const dozenUsd = Number(p.dozenPriceUsd) || 0;
            const newPriceIqd = Math.round(dozenUsd * normalizedRate);
            
            let piecesCount = 12;
            if (!(p.forceStandardCrush ?? true)) {
              piecesCount = Number(p.piecesCount) || (p.size?.piecesCount ? Number(p.size.piecesCount) : 12);
            }
            if (piecesCount <= 0) piecesCount = 12;

            const newPiecePriceIqd = Math.round(newPriceIqd / piecesCount);
            const newFinalImg = await burnProductOverlay({...p, price: newPriceIqd, piecePriceIqd: newPiecePriceIqd}, p.imageUrl!);

            // Category Restoration Logic
            let finalCatId = p.categoryId;
            let finalSubCatId = p.subcategoryId;

            const isCurrentlyArchived = p.isArchived || (archivedCatId && p.categoryId === archivedCatId);

            if (isCurrentlyArchived && archivedCatId) {
              finalCatId = archivedCatId;
              finalSubCatId = null;
            } else if (!finalCatId || finalCatId === "" || finalCatId === "null") {
              // Try to detect from name (High Priority for "Correctness")
              const detected = autoDetectCategoryAndSubcategory(p.name, '', '', categories);
              
              if (detected.categoryId) {
                finalCatId = detected.categoryId;
                finalSubCatId = detected.subcategoryId;
              } else {
                // Try fallback to showcaseCategory hint
                const showcaseCat = p.showcaseCategory || (p as any).size?.showcaseCategory;
                if (showcaseCat) {
                   const matchedCat = categories.find(c => !c.parentId && normalizeArabic(c.name).includes(normalizeArabic(showcaseCat)));
                   if (matchedCat) {
                     finalCatId = matchedCat.id;
                     const subDetected = autoDetectCategoryAndSubcategory(p.name, matchedCat.id, '', categories);
                     finalSubCatId = subDetected.subcategoryId;
                   }
                }
              }
              
              // Final Fallback to New Arrivals if still nothing
              if ((!finalCatId || finalCatId === "") && newArrivalsCatId) {
                finalCatId = newArrivalsCatId;
                const subDetected = autoDetectCategoryAndSubcategory(p.name, newArrivalsCatId, '', categories);
                finalSubCatId = subDetected.subcategoryId;
              }
            }

            // Collect update payload
            updates.push({
              id: p.id,
              price: newPriceIqd,
              piecePriceIqd: newPiecePriceIqd,
              finalImageUrl: newFinalImg,
              categoryId: finalCatId || null,
              subcategoryId: finalSubCatId || null,
              updatedAt: Date.now()
            });
          } catch (err) {
            console.error(err);
          } finally {
            processed++;
            setPriceUpdateProgress(prev => prev ? { ...prev, current: processed } : null);
          }
        }));
      }

      // Step 2: Send ALL updates to Supabase in chunks
      const CHUNK_SIZE = 50;
      for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      }

      // Refresh local data once at the end
      await api.forceRefreshAll();
      
      alert('تم التحديث واسترجاع الأقسام بنجاح! تم معالجة كافة المنتجات وتحديث الصور.');
    } catch (e: any) {
      console.error(e);
      alert('حدث خطأ أثناء التحديث السريع: ' + e.message);
    } finally {
      setIsUpdatingPrices(false);
      setPriceUpdateProgress(null);
    }
  };

  const handleUpdateImages = async () => {
    if (!window.confirm("هل أنت متأكد من رغبتك في تحديث جميع الصور المدمجة؟ قد تستغرق هذه العملية بعض الوقت.")) return;
    try {
      const products = await api.getProducts();
      const productsToUpdate = products.filter(p => p.imageUrl && p.imageUrl.startsWith('https://')); // Only process products with uploaded raw images
      
      setUpdateProgress({ current: 0, total: productsToUpdate.length });
      
      let i = 0;
      for (const p of productsToUpdate) {
        try {
          const newFinalImg = await burnProductOverlay(p, p.imageUrl);
          await api.updateProduct(p.id!, { finalImageUrl: newFinalImg });
        } catch (e) {
          console.error("Failed to update image for product", p.id, e);
        }
        i++;
        setUpdateProgress({ current: i, total: productsToUpdate.length });
      }
      
      alert('تم تحديث جميع الصور بنجاح!');
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء تحديث الصور');
    } finally {
      setUpdateProgress(null);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateSettings({ ...settings });
      alert('تم حفظ الإعدادات بنجاح!');
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return (
      <div className="flex-1 flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-brq-gold w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {priceUpdateProgress && (
        <div className="fixed inset-x-0 top-0 z-[100] bg-brq-gold/10 backdrop-blur-md border-b border-brq-gold/30 p-4 animate-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brq-gold/20 flex items-center justify-center">
                <Loader2 className="animate-spin text-brq-gold" size={20} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">جاري تحديث أسعار وصور المتجر...</h4>
                <p className="text-white/50 text-[11px]">يرجى عدم إغلاق الصفحة حتى اكتمال العملية لضمان تحديث كافة البيانات.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex-1 md:w-64 h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-brq-gold transition-all duration-300 shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                  style={{ width: `${(priceUpdateProgress.current / priceUpdateProgress.total) * 100}%` }}
                />
              </div>
              <span className="text-brq-gold font-mono font-bold text-sm whitespace-nowrap">
                {priceUpdateProgress.current} / {priceUpdateProgress.total}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
             <h2 className="text-2xl font-bold text-white mb-1">الإعدادات</h2>
             <p className="text-sm text-white/50">تكوين إعدادات النظام والمتجر</p>
         </div>
         <button 
           onClick={handleSave} 
           disabled={loading}
           className="flex items-center justify-center gap-2 py-2.5 px-6 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(30,94,255,0.3)] disabled:opacity-50"
         >
             {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />} حفظ التغييرات
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <DollarSign className="text-brq-gold" size={24} />
            <div>
              <h3 className="font-bold text-lg">سعر صرف الدولار والتكسير</h3>
              <p className="text-[11px] text-white/50">المعتمد لحساب أسعار المنتجات والتكسيرة</p>
            </div>
          </div>
          <div className="space-y-3">
             {isUsdRateLocked ? (
               <div>
                 <label className="text-xs text-white/70 mb-1.5 block font-bold">
                   سعر صرف الدولار (التكسيرة) - محمي برمز سري
                 </label>
                 <div className="flex gap-2">
                   <input
                     type="password"
                     placeholder="أدخل الرمز السري لفك القفل"
                     className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-400"
                     onChange={(e) => {
                        if (e.target.value === 'Mode') {
                          setIsUsdRateLocked(false);
                          e.target.value = '';
                        }
                     }}
                   />
                 </div>
               </div>
             ) : (
               <div>
                 <label className="text-xs text-white/70 mb-1.5 flex justify-between font-bold">
                   <span>سعر صرف الدولار (لكل 1 دولار)</span>
                   <button 
                     onClick={() => setIsUsdRateLocked(true)} 
                     className="text-brq-gold hover:underline"
                     type="button"
                   >
                     قفل
                   </button>
                 </label>
                 <input
                     type="number"
                     value={settings.usdExchangeRate || ''}
                     placeholder="مثال: 1590 أو 1530"
                    onChange={e => setSettings({...settings, usdExchangeRate: Number(e.target.value)})}
                    className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono font-bold placeholder:text-gray-400"
                  />
               </div>
             )}

             {/* Live calculation helper */}
             {settings.usdExchangeRate ? (
               <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1.5 text-xs">
                 <div className="flex justify-between items-center text-white/70">
                   <span>سعر الـ 100 دولار:</span>
                   <span className="font-mono font-bold text-brq-gold">
                     {(
                       (settings.usdExchangeRate >= 50000 
                         ? settings.usdExchangeRate 
                         : settings.usdExchangeRate >= 50 && settings.usdExchangeRate <= 500
                           ? settings.usdExchangeRate * 1000
                           : settings.usdExchangeRate * 100)
                     ).toLocaleString('en-US')} د.ع
                   </span>
                 </div>
                 <div className="flex justify-between items-center text-white/70">
                   <span>سعر الـ 1 دولار:</span>
                   <span className="font-mono font-bold text-blue-400">
                     {(
                       (settings.usdExchangeRate >= 50000 
                         ? Math.round(settings.usdExchangeRate / 100) 
                         : settings.usdExchangeRate >= 50 && settings.usdExchangeRate <= 500
                           ? Math.round(settings.usdExchangeRate * 10)
                           : Math.round(settings.usdExchangeRate))
                     ).toLocaleString('en-US')} د.ع
                   </span>
                 </div>

                 <div className="pt-3 border-t border-white/5 mt-2">
                   <button
                     onClick={handleUpdatePricesAndImages}
                     disabled={isUpdatingPrices}
                     className="w-full py-2 bg-brq-gold text-black rounded-lg text-xs font-black flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/10 disabled:opacity-50"
                   >
                     {priceUpdateProgress ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          جاري التحديث ({priceUpdateProgress.current}/{priceUpdateProgress.total})
                        </>
                     ) : (
                        <>
                          <Sparkles size={14} />
                          تطبيق السعر الجديد على الصور والمنتجات
                        </>
                     )}
                   </button>
                   <p className="text-[9px] text-white/30 text-center mt-1.5 leading-tight">
                     سيقوم هذا الإجراء بإعادة حساب سعر الدينار وتغيير الشريط في كافة الصور بناءً على سعر الدولار المدخل أعلاه.
                   </p>
                 </div>
               </div>
             ) : null}

             <p className="text-[11px] text-white/40 leading-relaxed">
               يتم اعتماد هذا السعر في النظام تلقائياً لتحويل أسعار الدولار إلى الدينار وتكسير القطع.
             </p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 md:col-span-2">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Building2 className="text-brq-gold" size={24} />
            <div>
              <h3 className="font-bold text-lg">بيانات الشركة وأرقام التواصل (المعرض والمتجر)</h3>
              <p className="text-[11px] text-white/50">تظهر هذه الأرقام في المعرض والموقع الأساسي للتواصل عبر واتساب وتيليجرام والاتصال الهاتفي</p>
            </div>
          </div>
          <div className="space-y-4">
             <div>
               <label className="text-xs text-white/70 mb-1 block font-bold">اسم الشركة أو المتجر</label>
               <input 
                  type="text" 
                  value={settings.companyName} 
                  onChange={e => setSettings({...settings, companyName: e.target.value})}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black placeholder:text-gray-500 font-bold" 
               />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/10">
               {/* Contact 1 */}
               <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 space-y-3">
                 <div className="flex items-center gap-2 text-yellow-300 font-bold text-xs">
                   <Phone size={14} />
                   <span>جهة الاتصال الأولى (الرقم الأساسي)</span>
                 </div>
                 <div>
                   <label className="text-[11px] text-white/70 mb-1 block">رقم الهاتف (واتساب + اتصال)</label>
                   <input 
                      type="text" 
                      value={settings.phone} 
                      placeholder="مثال: 07801234567"
                      onChange={e => setSettings({...settings, phone: e.target.value})}
                      className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono font-bold placeholder:text-gray-400" 
                      dir="ltr"
                   />
                 </div>
                 <div>
                   <label className="text-[11px] text-white/70 mb-1 block flex items-center gap-1">
                     <Send size={12} className="text-sky-400" />
                     <span>حساب تيليجرام (معرف أو رابط)</span>
                   </label>
                   <input 
                      type="text" 
                      value={settings.telegram1 || ''} 
                      placeholder="مثال: @username أو الرابط"
                      onChange={e => setSettings({...settings, telegram1: e.target.value})}
                      className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-400" 
                      dir="ltr"
                   />
                 </div>
               </div>

               {/* Contact 2 */}
               <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                 <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                   <Phone size={14} />
                   <span>جهة الاتصال الثانية (الرقم الإضافي)</span>
                 </div>
                 <div>
                   <label className="text-[11px] text-white/70 mb-1 block">رقم الهاتف (واتساب + اتصال)</label>
                   <input 
                      type="text" 
                      value={settings.phone2 || ''} 
                      placeholder="مثال: 07701234567"
                      onChange={e => setSettings({...settings, phone2: e.target.value})}
                      className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono font-bold placeholder:text-gray-400" 
                      dir="ltr"
                   />
                 </div>
                 <div>
                   <label className="text-[11px] text-white/70 mb-1 block flex items-center gap-1">
                     <Send size={12} className="text-sky-400" />
                     <span>حساب تيليجرام (معرف أو رابط)</span>
                   </label>
                   <input 
                      type="text" 
                      value={settings.telegram2 || ''} 
                      placeholder="مثال: @support_user أو الرابط"
                      onChange={e => setSettings({...settings, telegram2: e.target.value})}
                      className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-400" 
                      dir="ltr"
                   />
                 </div>
               </div>
             </div>

             {/* Showcase prompt notification option */}
             <div className="pt-3 border-t border-white/10 flex items-center justify-between">
               <div>
                 <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                   <Sparkles size={14} className="text-yellow-400" />
                   <span>إظهار رسالة "لرؤية المزيد من المنتجات مراسلة الأرقام" بالمعرض</span>
                 </span>
                 <span className="text-[10px] text-white/50 block">تظهر للزائر عند التنقل بين أقسام وصفحات المعرض</span>
               </div>
               <label className="relative inline-flex items-center cursor-pointer">
                 <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.showcasePromptEnabled !== false}
                    onChange={e => setSettings({...settings, showcasePromptEnabled: e.target.checked})}
                 />
                 <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brq-gold"></div>
               </label>
             </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Monitor className="text-brq-gold" size={24} />
            <h3 className="font-bold text-lg">إعدادات النظام</h3>
          </div>
          <div className="space-y-3">
             <div className="flex items-center justify-between">
               <span className="text-sm font-medium">وضع الصيانة</span>
               <label className="relative inline-flex items-center cursor-pointer">
                 <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.maintenanceMode}
                    onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})}
                 />
                 <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brq-gold"></div>
               </label>
             </div>
             <div className="flex items-center justify-between">
               <span className="text-sm font-medium">التسجيل المفتوح</span>
               <label className="relative inline-flex items-center cursor-pointer">
                 <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.openRegistration}
                    onChange={e => setSettings({...settings, openRegistration: e.target.checked})}
                 />
                 <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brq-gold"></div>
               </label>
             </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Shield className="text-brq-gold" size={24} />
            <h3 className="font-bold text-lg">الأمان</h3>
          </div>
          <div className="space-y-3">
             <button className="w-full text-right px-4 py-2 bg-white border border-black rounded-lg text-sm hover:bg-gray-100 transition-colors text-black">تغيير كلمة المرور...</button>
             <button className="w-full text-right px-4 py-2 bg-white border border-black rounded-lg text-sm hover:bg-gray-100 transition-colors text-black">إعدادات المصادقة الثنائية...</button>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <HardDrive className="text-brq-gold" size={24} />
            <h3 className="font-bold text-lg">أدوات متقدمة</h3>
          </div>
          <div className="space-y-3">
             <button 
               onClick={handleUpdateImages}
               disabled={updateProgress !== null}
               className="w-full px-4 py-2 bg-brq-royal text-white border-brq-gold border rounded-lg text-sm hover:opacity-90 transition-colors font-bold disabled:opacity-50"
             >
               {updateProgress ? `جاري تحديث الصور (${updateProgress.current}/${updateProgress.total})...` : "إعادة دمج جميع الصور (تحديث الخط)"}
             </button>
             <p className="text-[10px] text-white/50 text-center">
               هذه العملية تقوم بإعادة رسم الشريطة على كافة منتجات المتجر لتطبيق أي تغييرات على الخط أو التصميم. قد تستغرق بعض الوقت.
             </p>
          </div>
        </div>
      </div>
    </div>

  );
}
