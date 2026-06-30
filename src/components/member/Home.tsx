import {
  Search,
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
  Shield
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { api } from "../../api";
import { supabase } from "../../supabase";
import Animated3DLogo from "../ui/Animated3DLogo";

const DEFAULT_ICONS = ["✨", "👟", "🇹🇷", "⭐", "🎒", "☀️", "🔥"];

export default function Home() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const navigate = useNavigate();

  const fetchCats = async () => {
    try {
      const cats = await api.getCategories();
      setCategories(
        cats
          .filter((c) => !c.isHidden && !c.parentId)
          .sort((a: any, b: any) => a.order - b.order),
      );
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let mounted = true;
    let fetchTimeout: any;
    const initialFetch = async () => {
      await fetchCats();
      if (mounted) setLoading(false);
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
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(fetchTimeout);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-8">
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
            transition={{ delay: 0.1 }}
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

        {/* Quick Stats - Span 4 */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-6 rounded-3xl flex items-center gap-5 border border-white/10 hover:border-brq-gold/40 transition-colors cursor-default"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 text-red-400 flex items-center justify-center border border-red-500/20 shadow-inner">
              <Zap size={28} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1 uppercase tracking-wider font-mono">
                New Arrivals
              </p>
              <p className="font-bold text-lg">
                وصل حديثاً <span className="text-brq-gold">(50+)</span>
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel p-6 rounded-3xl flex items-center gap-5 border border-white/10 hover:border-brq-gold/40 transition-colors cursor-default"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brq-gold/20 to-yellow-600/10 text-brq-gold flex items-center justify-center border border-brq-gold/20 shadow-inner">
              <TrendingUp size={28} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1 uppercase tracking-wider font-mono">
                Trending Now
              </p>
              <p className="font-bold text-lg">الأكثر مبيعاً هذا الأسبوع</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel p-6 rounded-3xl flex items-center gap-5 border border-white/10 hover:border-brq-gold/40 transition-colors cursor-default"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brq-royal/20 to-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-inner">
              <Clock size={28} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1 uppercase tracking-wider font-mono">
                Last Updated
              </p>
              <p className="font-bold text-lg">تحديثات المخزون اليوم</p>
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
                transition={{ delay: 0.1 * (i % 8) }}
              >
                <Link
                  to={`/category/${cat.id}`}
                  className="glass-panel hover:bg-gradient-to-b hover:from-white/5 hover:to-brq-gold/5 p-6 rounded-3xl flex flex-col items-center justify-center gap-4 border border-white/5 hover:border-brq-gold/40 transition-all group h-full shadow-lg hover:shadow-xl hover:-translate-y-1 duration-300"
                >
                  <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 border border-white/5 group-hover:border-brq-gold/30 shadow-inner">
                    {DEFAULT_ICONS[i % DEFAULT_ICONS.length]}
                  </div>
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
