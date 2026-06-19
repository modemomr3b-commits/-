import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useStore } from '../store';
import { LayoutDashboard, Users, ShoppingCart, Package, Settings, LogOut, Tags, Bell, FileText, Eye, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Order } from '../types';

export default function AdminLayout() {
  const { user, setUser } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ title: string, body: string } | null>(null);
  const previousNewOrdersCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchOrdersForNotifications = async () => {
      try {
        const dbOrders = await api.getOrders();
        if (mounted) {
          const newOrders = dbOrders.filter((o: Order) => o.status === 'new').sort((a: any, b: any) => b.createdAt - a.createdAt);
          setNewOrdersCount(newOrders.length);
          
          if (previousNewOrdersCount.current !== -1 && newOrders.length > previousNewOrdersCount.current) {
             // New order arrived!
             audioRef.current?.play().catch(() => {});
             
             // Get the newest order for the toast
             if (newOrders.length > 0) {
                 const newest = newOrders[0];
                 setToastMessage({
                     title: 'طلب جديد',
                     body: `لديك طلب جديد من المستخدم: ${newest.username}`
                 });
                 setTimeout(() => { if(mounted) setToastMessage(null); }, 6000);
             }
          }
           previousNewOrdersCount.current = newOrders.length;
        }
      } catch (e) {}
    };
    fetchOrdersForNotifications();
    const inv = setInterval(fetchOrdersForNotifications, 4000); 
    return () => {
      mounted = false;
      clearInterval(inv);
    };
  }, []);

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const menu = [
    { icon: LayoutDashboard, path: '/admin', label: 'لوحة القيادة' },
    { icon: Eye, path: '/', label: 'تصفح التطبيق' },
    { icon: Package, path: '/admin/products', label: 'إدارة المنتجات' },
    { icon: Tags, path: '/admin/categories', label: 'إدارة الأقسام' },
    { icon: ShoppingCart, path: '/admin/orders', label: 'إدارة الطلبات', badge: newOrdersCount },
    { icon: Users, path: '/admin/users', label: 'إدارة المستخدمين' },
    { icon: Trash2, path: '/admin/trash', label: 'سلة المحذوفات' },
    { icon: Settings, path: '/admin/settings', label: 'الإعدادات' }
  ];

  return (
    <div className="flex h-screen bg-[#050a1a] overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
         <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-emerald-900 border border-emerald-500 rounded-xl p-4 shadow-2xl flex items-start gap-3 animate-[pulse_2s_ease-in-out_infinite]">
            <Bell className="text-emerald-400 mt-0.5" />
            <div>
               <div className="font-bold text-white">{toastMessage.title}</div>
               <div className="text-sm text-emerald-200 mt-1">{toastMessage.body}</div>
            </div>
         </div>
      )}

      {/* Sidebar for Desktop */}
      <aside className="w-64 glass-panel border-l border-brq-gold/20 flex flex-col hidden md:flex h-full rounded-none">
        <div className="p-6 border-b border-brq-gold/10">
          <h2 className="text-xl font-bold text-brq-gold tracking-widest text-center">BRQ SYSTEM</h2>
          <p className="text-xs text-center text-white/50 uppercase mt-1">Admin Dashboard</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menu.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-brq-royal/20 border border-brq-royal/50 shadow-[0_0_15px_rgba(30,94,255,0.2)] text-white" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                   <Icon size={20} className={isActive ? "text-brq-gold" : ""} />
                   <span className="font-medium">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                   <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-brq-gold/10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="glass-panel border-b border-brq-gold/10 h-16 flex flex-shrink-0 items-center px-6 justify-between rounded-none">
          <h1 className="text-lg font-semibold text-brq-white">
            {menu.find(m => m.path === location.pathname)?.label || 'لوحة القيادة'}
          </h1>
          <div className="flex gap-4 items-center">
             <div className="text-left text-sm hidden sm:block">
               <p className="font-medium">{user?.fullName || 'مدير النظام'}</p>
               <p className="text-white/50 text-xs font-mono">@{user?.username}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-brq-gold/20 border border-brq-gold/50 flex items-center justify-center text-brq-gold font-bold">
               {user?.fullName?.charAt(0).toUpperCase() || 'W'}
             </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
