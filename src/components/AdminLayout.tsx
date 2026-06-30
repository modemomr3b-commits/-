import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useStore } from '../store';
import { LayoutDashboard, Users, ShoppingCart, Package, Settings, LogOut, Tags, Bell, FileText, Eye, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { Order } from '../types';
import Animated3DLogo from './ui/Animated3DLogo';

export default function AdminLayout() {
  const { user, setUser } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ title: string, body: string } | null>(null);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
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
    <div className="admin-theme flex h-screen bg-[#050a1a] overflow-hidden">
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
      <aside className="w-64 glass-panel border-l border-white/20 flex flex-col hidden md:flex h-full rounded-none">
        <div className="p-6 border-b border-white/10 flex flex-col items-center gap-3">
          <div className="w-24 h-24 flex items-center justify-center relative transition-transform hover:scale-105 duration-500" onMouseEnter={() => setIsLogoHovered(true)} onMouseLeave={() => setIsLogoHovered(false)}>
            <div className="absolute inset-2 bg-brq-gold/10 rounded-full blur-xl"></div>
            <div className="w-full h-full relative z-10">
              <Animated3DLogo isHovered={isLogoHovered} scale={0.6} />
            </div>
          </div>
          <div className="text-center mt-2">
            <p className="text-xs text-brq-gold tracking-[0.2em] uppercase font-semibold">Admin Dashboard</p>
          </div>
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
                    ? "bg-white/10 border border-white/20 text-white" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                   <Icon size={20} className={isActive ? "text-white" : ""} />
                   <span className="font-medium">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                   <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
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
        <header className="glass-panel border-b border-white/10 h-16 flex flex-shrink-0 items-center px-6 justify-between rounded-none">
          <h1 className="text-lg font-semibold text-white">
            {menu.find(m => m.path === location.pathname)?.label || 'لوحة القيادة'}
          </h1>
          <div className="flex gap-4 items-center">
             <div className="text-left text-sm hidden sm:block">
               <p className="font-medium text-white">{user?.fullName || 'مدير النظام'}</p>
               <p className="text-white/50 text-xs font-mono">@{user?.username}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold">
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
