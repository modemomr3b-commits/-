import {
  Search,
  Lock,
  Unlock,
  ChevronLeft,
  Bell,
  Zap,
  TrendingUp,
  Clock,
  Filter,
  Layers,
  Info,
  X,
  Star,
  Shield,
  Sparkles,
  Share2,
  ExternalLink,
  MessageCircle,
  Check
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { api } from "../../api";
import { supabase } from "../../supabase";
import { useStore } from "../../store";
import Animated3DLogo from "../ui/Animated3DLogo";
import { SHOWCASE_CATEGORIES_METADATA } from "../../utils/showcaseClassifier";
import CategoryIcon from "../ui/CategoryIcon";

const DEFAULT_ICONS = ["✨", "👟", "🇹🇷", "⭐", "🎒", "☀️", "🔥"];

export default function Home() {
  const { user } = useStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [showcaseSettings, setShowcaseSettings] = useState<any>({ showcaseEnabled: true });
  const [showcaseCount, setShowcaseCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchCats = async () => {
    try {
      const [cats, prods, settings] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
        api.getSettings()
      ]);
      
      if (cats && Array.isArray(cats)) {
        setCategories(
          cats
            .filter((c) => !c.isHidden && !c.parentId)
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
        );
      }

      if (prods && Array.isArray(prods)) {
        const scCount = prods.filter((p: any) => p.isShowcase && !p.isArchived && !p.isHidden).length;
        setShowcaseCount(scCount);
      }

      if (settings) {
        setShowcaseSettings(settings);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let mounted = true;
    let fetchTimeout: any;

    const initialFetch = async () => {
      try {
        await fetchCats();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialFetch();

    const channel = supabase
      .channel('home_categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(() => {
          if (mounted) fetchCats();
        }, 1500);
      })
      .on('broadcast', { event: 'settings_updated' }, ({ payload }) => {
        if (mounted && payload) {
          setShowcaseSettings(payload);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(fetchTimeout);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-8 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-brq-gold text-black font-bold px-6 py-2.5 rounded-full shadow-2xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Search Bar - Desktop spans full width but is elegant */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-3xl mx-auto mb-8 cursor-text"
        onClick={() => navigate("/search")}
      >
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
          <Search className="w-5 h-5 text-brq-gold" />
        </div>
        <input
          type="text"
          readOnly
          className="w-full glass-card pl-4 pr-12 py-4 rounded-2xl text-base placeholder-white/40 focus:outline-none focus:border-brq-gold focus:ring-1 focus:ring-brq-gold shadow-2xl transition-all cursor-text text-white"
          placeholder="ابحث برقم الموديل، الكود، أو الاسم للوصول السريع للمنتجات..."
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-2">
          <div className="bg-white/10 px-2 py-1 rounded text-xs text-white/50 hidden md:block border border-white/5">
            Ctrl
          </div>
          <div className="bg-white/10 px-2 py-1 rounded text-xs text-white/50 hidden md:block border border-white/5">
            K
          </div>
        </div>
      </motion.div>

      {/* 3D Animated Hero Logo Section */}
      <div className="w-full flex items-center justify-center mb-12 relative pt-8">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1/2 h-full bg-brq-gold/10 blur-[120px] rounded-full" />
        </div>
        <div className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] lg:w-[800px] lg:h-[800px] cursor-pointer z-10">
          <Animated3DLogo isHovered={true} scale={1.3} />
        </div>
      </div>

      {/* Bento Grid Layout for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Banner - Span 8 */}
        <div className="lg:col-span-8 relative rounded-3xl overflow-hidden bg-gradient-to-br from-brq-navy via-brq-royal to-[#081B63] border border-brq-gold/30 lg:h-[320px] h-64 flex items-center shadow-2xl group cursor-pointer">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 group-hover:opacity-20 transition-opacity"></div>
          
          <div className="absolute right-0 top-0 bottom-0 w-full bg-gradient-to-l from-[#081B63]/90 via-[#081B63]/70 to-transparent z-0"></div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="relative z-10 px-6 lg:px-12 w-full lg:w-2/3"
          >
            <span className="text-brq-gold text-sm md:text-base font-bold tracking-widest uppercase mb-2 block drop-shadow-md">
              — حصرياً في BRQ
            </span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight drop-shadow-lg">
              اكتشف أحدث <br /> تشكيلات{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brq-gold to-yellow-300">
                الأحذية
              </span>
            </h2>
            <div className="flex flex-wrap gap-3 md:gap-4 items-center">
              <button className="bg-brq-gold text-black px-5 md:px-6 py-2.5 rounded-full font-bold hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                تسوق الآن
              </button>
              <p className="text-[10px] md:text-xs border border-white/20 px-3 md:px-4 py-2 md:py-2.5 rounded-full bg-black/40 backdrop-blur-md inline-flex items-center gap-1.5 md:gap-2">
                <Zap size={14} className="text-brq-gold" /> شركة الوفاء - الجودة والتميز
              </p>
            </div>
          </motion.div>
        </div>

        {/* Showcase Hub - Replaces Quick Stats (Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-5 sm:p-6 rounded-3xl flex flex-col justify-between border border-brq-gold/30 hover:border-brq-gold/60 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden bg-gradient-to-b from-[#081B63]/40 via-black/60 to-black/80 h-full"
          >
            {/* Background luxury shimmer */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-brq-gold/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Header info */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brq-gold bg-brq-gold/15 border border-brq-gold/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Sparkles size={13} className="text-brq-gold animate-pulse" />
                  رابط مخصص ومباشر
                </span>

                {/* Status indicator */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  showcaseSettings?.showcaseEnabled !== false 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    showcaseSettings?.showcaseEnabled !== false ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                  }`}></span>
                  {showcaseSettings?.showcaseEnabled !== false ? 'متاح للزبائن' : 'مغلق حالياً'}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white leading-snug mb-1">
                معرض شركة الوفاء المتميز
              </h3>

              <p className="text-xs text-white/60 leading-relaxed mb-4">
                صفحة كتالوج خاصة وسريعة بدون تسجيل دخول، مخصصة للمشاركة مع زبائنكم عبر الواتساب مع تصنيف لكافة الفئات.
              </p>

              {/* Categories mini preview list */}
              <div className="flex flex-wrap gap-1.5 mb-5 text-[11px]">
                {SHOWCASE_CATEGORIES_METADATA.map((cat) => (
                  <span key={cat.id} className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/90 px-2 py-1 rounded-lg">
                    <img src={cat.image} alt={cat.name} className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-white/50 px-1 font-mono">
                <span>الموديلات المنشورة:</span>
                <span className="text-brq-gold font-bold">{showcaseCount} موديل</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/showcase"
                  className="py-2.5 px-3 bg-brq-gold hover:bg-yellow-400 text-black font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all active:scale-95"
                >
                  <ExternalLink size={15} />
                  <span>دخول المعرض</span>
                </Link>

                <button
                  onClick={async () => {
                    try {
                      showToast('جاري تحويلك إلى واتساب...');
                      const res = await fetch('/api/showcase/create-invite', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          agentId: user?.id || user?.username || 'agent_1',
                          agentName: user?.fullName || user?.username || 'الوكيل المعتمد'
                        })
                      });
                      const data = await res.json();
                      const inviteToken = data.token;
                      const url = `${window.location.origin}/showcase?invite=${inviteToken}`;
                      const agentDisplayName = user?.fullName || user?.username || 'الوكيل المعتمد';
                      const text = `✨ معرض شركة الوفاء المتميز BRQ ✨\nدعوة خاصة من: ${agentDisplayName}\nتفضل بالاطلاع على أحدث الموديلات والتشكيلات الحصرية عبر رابط الدعوة المخصص لك (صالح لمرة واحدة فقط):\n${url}`;

                      try {
                        await navigator.clipboard.writeText(text);
                      } catch {
                        // ignore clipboard errors
                      }

                      // Direct WhatsApp redirect to immediately pick a contact
                      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                      window.location.href = waUrl;
                    } catch (e) {
                      console.error("Error creating invite:", e);
                      const fallbackUrl = `${window.location.origin}/showcase`;
                      const fallbackText = `✨ معرض شركة الوفاء المتميز BRQ ✨\n${fallbackUrl}`;
                      window.location.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(fallbackText)}`;
                    }
                  }}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <MessageCircle size={16} className="text-white fill-white/20" />
                  <span>مشاركة عبر واتساب</span>
                </button>
              </div>

              {/* Single-use security notice */}
              <div className="flex items-center gap-1.5 text-[10px] text-white/40 bg-white/5 p-2 rounded-lg border border-white/5">
                <Sparkles size={12} className="text-brq-gold shrink-0" />
                <span>الروابط المُنشأة صالحة للاستخدام لمرة واحدة فقط وتُقفل تلقائياً بعد دخول الزائر.</span>
              </div>

              {/* Admin quick status toggle */}
              {user && (user.role === 'admin' || user.role === 'sales') && (
                <div className="flex items-center justify-between pt-2 text-[11px] text-white/50">
                  <span>التحكم بحالة المعرض العام:</span>
                  <button
                    onClick={async () => {
                      const newStatus = showcaseSettings?.showcaseEnabled === false ? true : false;
                      // Optimistic UI update
                      setShowcaseSettings((prev: any) => ({ ...prev, showcaseEnabled: newStatus }));
                      try {
                        await api.updateSettings({ ...showcaseSettings, showcaseEnabled: newStatus });
                        showToast(newStatus ? 'تم فتح المعرض العام للزبائن' : 'تم قفل المعرض العام');
                      } catch (e) {
                        console.error("Failed to update settings:", e);
                        showToast('حدث خطأ في تحديث الإعدادات');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                      showcaseSettings?.showcaseEnabled !== false
                        ? 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    {showcaseSettings?.showcaseEnabled !== false ? (
                      <>
                        <Lock size={11} /> قفل المعرض
                      </>
                    ) : (
                      <>
                        <Unlock size={11} /> فتح المعرض
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Categories Bento */}
      <div className="pt-6 border-t border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black flex items-center gap-3">
            <Layers className="text-brq-gold" />
            تصفح الأقسام
          </h2>
          <button
            onClick={() => setShowAbout(true)}
            className="text-sm text-brq-gold hover:text-white transition-colors flex items-center gap-1 bg-brq-gold/10 px-3 py-1.5 rounded-full"
          >
            <Info size={14} /> عن الشركة
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-10 h-10 border-4 border-brq-gold border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(212,175,55,0.5)]"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center p-12 glass-panel rounded-3xl text-white/50">
            لا توجد أقسام متاحة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * (i % 8) }}
              >
                <Link
                  to={`/category/${cat.id}`}
                  className="glass-panel hover:bg-gradient-to-b hover:from-white/5 hover:to-brq-gold/5 p-6 rounded-3xl flex flex-col items-center justify-center gap-4 border border-white/5 hover:border-brq-gold/40 transition-all group h-full shadow-lg hover:shadow-xl hover:-translate-y-1 duration-300"
                >
                  <CategoryIcon name={cat.name} className="group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-center">
                    <h3 className="font-bold text-lg group-hover:text-brq-gold transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-white/40 mt-1 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      استعرض <ChevronLeft size={12} />
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-md relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brq-gold to-transparent opacity-50" />
              
              <button 
                onClick={() => setShowAbout(false)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6 pt-4">
                <div className="w-20 h-20 bg-brq-gold/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-brq-gold/30">
                  <Info className="text-brq-gold" size={40} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">عن الشركة</h3>
                <p className="text-white/60">شركة الوفاء المتميز</p>
              </div>

              <div className="space-y-4 text-white/80 text-sm leading-relaxed text-right">
                <div className="glass-panel p-4 rounded-xl border border-white/5">
                  <h4 className="text-brq-gold font-bold mb-2 flex items-center gap-2">
                    <Star size={16} /> رؤيتنا
                  </h4>
                  <p>نسعى لتقديم أفضل المنتجات وأجود الخامات لعملائنا الكرام، مع ضمان أفضل الأسعار في السوق.</p>
                </div>
                
                <div className="glass-panel p-4 rounded-xl border border-white/5">
                  <h4 className="text-brq-gold font-bold mb-2 flex items-center gap-2">
                    <Shield size={16} /> قيمنا
                  </h4>
                  <p>المصداقية، الجودة، وسرعة تلبية متطلبات السوق من أهم الركائز التي نعتمد عليها في عملنا.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
