import {
  Search,
  ChevronLeft,
  Bell,
  Zap,
  TrendingUp,
  Clock,
  Filter,
  Layers,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { api } from "../../api";
import { supabase } from "../../supabase";

const DEFAULT_ICONS = ["✨", "👟", "🇹🇷", "⭐", "🎒", "☀️", "🔥"];

export default function Home() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

      {/* Bento Grid Layout for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Banner - Span 8 */}
        <div className="lg:col-span-8 relative rounded-3xl overflow-hidden bg-gradient-to-br from-brq-navy via-brq-royal to-purple-900 border border-brq-gold/30 lg:h-[320px] h-48 flex items-center shadow-2xl group cursor-pointer">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 group-hover:opacity-20 transition-opacity"></div>
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-black/60 to-transparent"></div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="relative z-10 px-8 lg:px-12 w-full lg:w-2/3"
          >
            <span className="text-brq-gold text-sm md:text-base font-bold tracking-widest uppercase mb-2 block">
              — حصرياً في BRQ
            </span>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
              اكتشف أحدث <br /> تشكيلات{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brq-gold to-yellow-300">
                الأحذية
              </span>
            </h2>
            <div className="flex gap-4 items-center">
              <button className="bg-brq-gold text-black px-6 py-2.5 rounded-full font-bold hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                تسوق الآن
              </button>
              <p className="text-xs md:text-sm border border-white/20 px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-md inline-flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" /> خصم 30% لفترة
                محدودة
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
          <Link
            to="/search"
            className="text-sm text-brq-gold hover:text-white transition-colors flex items-center gap-1"
          >
            عرض الكل <ChevronLeft size={14} />
          </Link>
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
    </div>
  );
}
