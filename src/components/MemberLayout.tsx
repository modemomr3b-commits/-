import { Outlet, Link, useLocation } from 'react-router';
import { useStore } from '../store.ts';
import { api } from '../api.ts';
import { Home, Search, Heart, ShoppingBag, User, Download, X, Share, MessageCircle, LayoutDashboard, Package, Users } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useState, useEffect } from 'react';
import Animated3DLogo from './ui/Animated3DLogo';
import { isOrderBelongsToAgent } from '../utils/orderUtils';
import QuickContactWidget from './common/QuickContactWidget';

export default function MemberLayout() {
  const { cart, user } = useStore();
  const location = useLocation();
  const { deferredPrompt, isIOS, showInstallPrompt, setShowInstallPrompt, handleInstallClick } = usePWAInstall();
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [pendingCustomerOrdersCount, setPendingCustomerOrdersCount] = useState(0);
  const [settings, setSettings] = useState<any>(null);

  const isBannerVisible = showInstallPrompt;

  useEffect(() => {
    api.getSettings().then(data => {
      if (data) setSettings(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkCustomerOrders = async () => {
      if (!user) return;
      try {
        const allOrders = await api.getOrders();
        const pending = allOrders.filter(o => o.status === 'pending_agent' && isOrderBelongsToAgent(o, user));

        if (isMounted) {
          setPendingCustomerOrdersCount(pending.length);
        }
      } catch (err) {
        // silent check
      }
    };

    checkCustomerOrders();
    const interval = setInterval(checkCustomerOrders, 15000); // Check every 15s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, location.pathname]);

  const navItems = [
    { icon: Home, path: '/', label: 'الرئيسية' },
    { icon: Search, path: '/search', label: 'بحث' },
    { icon: Package, path: '/orders', label: 'سجل الطلبات' },
    { icon: Users, path: '/customer-orders', label: 'طلبات الزبائن', badge: pendingCustomerOrdersCount },
    { icon: ShoppingBag, path: '/cart', label: 'الطلبات', badge: cart.length },
    { icon: MessageCircle, path: '/messages', label: 'الرسائل' },
    { icon: User, path: '/profile', label: 'حسابي' },
  ];

  return (
    <div className="flex md:flex-row flex-col min-h-screen bg-brq-navy" dir="rtl">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 glass-panel border-l border-brq-gold/20 h-screen sticky top-0 bg-black/40 backdrop-blur-xl">
        <div className="p-6 border-b border-brq-gold/20 flex flex-col items-center gap-3 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brq-gold/10 blur-[50px] rounded-full pointer-events-none"></div>
          
          <div className="w-32 h-32 flex items-center justify-center relative transition-transform hover:scale-105 duration-500 group">
            <div className="absolute inset-4 bg-brq-gold/20 rounded-full blur-xl group-hover:bg-brq-gold/40 transition-colors duration-500"></div>
            <div className="w-full h-full relative z-10" onMouseEnter={() => setIsLogoHovered(true)} onMouseLeave={() => setIsLogoHovered(false)}>
              <Animated3DLogo isHovered={isLogoHovered} scale={0.7} />
            </div>
          </div>
        </div>

        <nav className="flex-1 py-8 px-4 flex flex-col gap-2 relative overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden",
                  isActive ? "bg-gradient-to-r from-brq-gold/20 to-transparent text-brq-gold" : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && <div className="absolute right-0 top-0 bottom-0 w-1 bg-brq-gold rounded-l-full shadow-[0_0_10px_rgba(212,175,55,0.8)]"></div>}
                
                <div className={cn("p-2 rounded-lg transition-colors", isActive ? "bg-brq-gold/20" : "bg-black/20 group-hover:bg-black/40")}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive && "drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]")} />
                </div>
                
                <span className="font-bold tracking-wide">{item.label}</span>
                
                {item.badge && item.badge > 0 && (
                  <span className="mr-auto bg-red-500 text-white min-w-6 h-6 px-1 rounded-full text-xs flex items-center justify-center font-bold shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-brq-gold/20 mt-auto flex flex-col gap-2">
          {/* Customer Orders quick action */}
          <Link
            to="/customer-orders"
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all group",
              pendingCustomerOrdersCount > 0
                ? "bg-purple-600/20 text-purple-200 border-purple-500/40 shadow-lg shadow-purple-900/30 hover:bg-purple-600/30"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
            )}
          >
            <div className="flex items-center gap-2">
              <Users size={16} className={pendingCustomerOrdersCount > 0 ? "text-purple-400" : "text-white/60"} />
              <span>طلبات الزبائن</span>
            </div>
            {pendingCustomerOrdersCount > 0 ? (
              <span className="bg-purple-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                {pendingCustomerOrdersCount} جديدة
              </span>
            ) : (
              <span className="text-[10px] text-white/40">المعرض</span>
            )}
          </Link>

          <Link to="/profile" className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5 hover:border-brq-gold/30 transition-colors group">
             <img src="/assets/avatar-placeholder.png" alt="" className="w-10 h-10 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity" onError={(e) => (e.currentTarget.style.display = 'none')} />
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-bold text-white truncate group-hover:text-brq-gold transition-colors">{user?.username || 'مستخدم'}</p>
               <p className="text-xs text-brq-gold truncate uppercase text-left dir-ltr">{user?.role || 'member'}</p>
             </div>
          </Link>
          {(user?.role === 'admin' || user?.role === 'sales') && (
            <Link to="/admin" className="mt-1 flex items-center justify-center w-full py-2.5 bg-gradient-to-r from-brq-gold/20 to-brq-royal/40 text-brq-gold rounded-xl border border-brq-gold/30 text-sm font-bold font-mono hover:from-brq-gold/30 hover:to-brq-royal/50 transition-colors gap-2 shadow-lg shadow-brq-gold/10">
              <LayoutDashboard size={16} /> لوحة التحكم
            </Link>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden pb-20 md:pb-0 relative">
        <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-brq-gold/5 blur-[120px] rounded-full pointer-events-none md:block hidden"></div>
        
        {/* Top Header - Mobile */}
        <header className="md:hidden sticky top-0 z-50 glass-panel border-b border-brq-gold/20 px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center relative">
              <Animated3DLogo scale={0.35} />
            </div>
            <div className="flex flex-col">
              <span className="text-brq-gold font-bold text-base tracking-wide uppercase">BRQ</span>
              <span className="text-[10px] text-white/50">شركة الوفاء</span>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {/* Customer Orders button right next to user profile on mobile */}
            <Link
              to="/customer-orders"
              className={cn(
                "px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all shadow-md relative",
                pendingCustomerOrdersCount > 0
                  ? "bg-purple-600/30 text-purple-200 border-purple-400/50 shadow-purple-500/20 animate-pulse"
                  : "bg-white/10 text-white/80 border-white/10 hover:bg-white/20"
              )}
            >
              <Users size={15} className="text-purple-300" />
              <span className="text-xs">طلبات الزبائن</span>
              {pendingCustomerOrdersCount > 0 && (
                <span className="bg-purple-500 text-white font-black text-[10px] px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-lg">
                  {pendingCustomerOrdersCount}
                </span>
              )}
            </Link>

            {(user?.role === 'admin' || user?.role === 'sales') && (
              <Link to="/admin" className="px-2.5 py-1.5 bg-brq-royal/20 text-brq-gold rounded-lg border border-brq-gold/30 text-xs font-bold font-mono hover:bg-brq-royal/40 flex items-center gap-1 shadow-lg shadow-brq-gold/10">
                <LayoutDashboard size={13} />
                <span className="hidden sm:inline">لوحة التحكم</span>
              </Link>
            )}

            <Link to="/profile" className="w-9 h-9 rounded-full bg-brq-black border border-brq-gold/30 flex items-center justify-center relative overflow-hidden">
              <img src="/assets/avatar-placeholder.png" alt="" className="w-7 h-7 rounded-full opacity-70" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </Link>
          </div>
        </header>

        {/* PWA Install Modal */}
        <AnimatePresence>
          {isBannerVisible && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-sm glass-panel border border-brq-gold/30 rounded-2xl p-6 flex flex-col items-center text-center shadow-[0_20px_50px_rgba(212,175,55,0.2)] relative overflow-hidden"
              >
                <button 
                  onClick={() => {
                    setShowInstallPrompt(false);
                  }}
                  className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="w-20 h-20 rounded-2xl bg-brq-gold/10 border border-brq-gold/20 flex items-center justify-center mb-4">
                  <Download className="text-brq-gold" size={40} />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">تثبيت التطبيق</h3>
                <p className="text-white/70 text-sm mb-6">
                  قم بتثبيت تطبيق شركة الوفاء المتميز للوصول السريع وتجربة استخدام أفضل.
                </p>
                
                {isIOS ? (
                  <div className="w-full bg-black/40 rounded-xl p-4 flex flex-col gap-3 relative border border-white/10">
                    <span className="text-sm text-white/90 font-medium flex items-center justify-center gap-2" dir="rtl">
                      ١. اضغط <Share size={16} className="text-brq-gold" /> في متصفح سفاري
                    </span>
                    <span className="text-sm text-white/90 font-medium" dir="rtl">
                      ٢. اختر "الإضافة للشاشة الرئيسية"
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 bg-gradient-to-r from-brq-gold to-yellow-400 text-black font-bold rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:shadow-[0_0_25px_rgba(212,175,55,0.6)] transition-all text-lg"
                  >
                    تثبيت الآن
                  </button>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden md:p-6 p-4">
          <Outlet />
        </main>

        {/* Quick Contact Widget for Main App */}
        <div className="hidden sm:block">
          <QuickContactWidget settings={settings} variant="floating" />
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-brq-gold/20 pb-safe md:hidden z-50 rounded-t-2xl">
          <div className="flex items-center justify-around p-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className="relative p-2 flex flex-col items-center gap-1 w-16"
                >
                  <div className={cn("relative p-2 rounded-xl transition-all duration-300", isActive ? "bg-brq-royal/20 text-brq-royal" : "text-white/60 hover:text-white")}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive && "text-brq-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]")} />
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white shadow-lg">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <motion.div layoutId="navIndicator" className="absolute inset-0 border border-brq-gold/50 rounded-xl" transition={{ type: "spring", stiffness: 300, damping: 20 }} />
                    )}
                  </div>
                  <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-brq-gold" : "text-white/50")}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
