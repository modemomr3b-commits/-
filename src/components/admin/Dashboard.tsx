import { Package, Users, ShoppingCart, ArrowUpRight, Download, Activity, Bell, Server, Database, Cloud, RefreshCw, ShieldCheck, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    onlineUsers: 0,
    products: 0,
    categories: 0,
    orders: 0
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchDashboard = async () => {
      try {
        const [usersRes, productsRes, categoriesRes, ordersRes, logsRes] = await Promise.all([
          api.getUsers(),
          api.getProducts(),
          api.getCategories(),
          api.getOrders(),
          api.getLogs()
        ]);
        if (mounted) {
          const onlineCount = usersRes.filter(u => u.isOnline || (u.lastActive && (Date.now() - u.lastActive < 300000))).length;
          setStats({
            users: usersRes.length,
            onlineUsers: onlineCount,
            products: productsRes.length,
            categories: categoriesRes.length,
            orders: ordersRes.length
          });
          setLogs(logsRes.slice(0, 50)); // Last 50 activities max
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setLoading(false);
      }
    };
    fetchDashboard();
    const inv = setInterval(fetchDashboard, 5000);
    return () => {
      mounted = false;
      clearInterval(inv);
    };
  }, []);

  const realtimeStats = [
    { label: 'إجمالي المستخدمين', value: stats.users.toString(), icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
    { label: 'المتصلون الآن', value: stats.onlineUsers.toString(), icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', pulse: true },
    { label: 'إجمالي المنتجات', value: stats.products.toString(), icon: Package, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
    { label: 'إجمالي الطلبات', value: stats.orders.toString(), icon: ShoppingCart, color: 'text-brq-gold', bg: 'bg-brq-gold/10', border: 'border-brq-gold/30' },
  ];

  const systemStatus = [
    { label: 'حالة الخادم', status: 'متصل', icon: Server, color: 'text-emerald-400' },
    { label: 'قاعدة البيانات', status: 'متصل', icon: Database, color: 'text-emerald-400' },
    { label: 'التخزين السحابي', status: 'مستقر', icon: Cloud, color: 'text-blue-400' },
    { label: 'المزامنة الحية', status: 'نشط', icon: RefreshCw, color: 'text-brq-gold' },
  ];

  if (loading) {
     return (
        <div className="flex-1 flex justify-center items-center h-[60vh]">
          <Loader2 className="animate-spin text-brq-gold w-12 h-12" />
        </div>
     );
  }

  const ActiveUsersList = () => {
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

    useEffect(() => {
      const fetchOnline = async () => {
        try {
          const users = await api.getUsers();
          const active = users.filter((u: any) => u.isOnline || (u.lastActive && (Date.now() - u.lastActive < 300000)));
          setOnlineUsers(active);
        } catch(e) {}
      };
      fetchOnline();
      const intv = setInterval(fetchOnline, 10000);
      return () => clearInterval(intv);
    }, []);

    if (onlineUsers.length === 0) {
      return <div className="text-xs text-white/40 text-center py-4">لا يوجد مستخدمين أونلاين حالياً</div>;
    }

    return (
      <>
        {onlineUsers.map((u: any) => (
          <div key={u.id} className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5">
             <div className="flex gap-2 items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <div>
                  <p className="text-xs font-bold text-white/90">{u.username}</p>
                  <p className="text-[10px] text-white/40">{u.role === 'admin' ? 'مدير' : 'عميل'}</p>
                </div>
             </div>
             <span className="text-[10px] text-white/30 font-mono">
               الآن
             </span>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {realtimeStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={`glass-card p-5 border ${stat.border} flex items-center justify-between relative overflow-hidden group`}>
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                 <div>
                    <p className="text-white/60 text-xs mb-1 font-bold">{stat.label}</p>
                    <p className="text-3xl font-bold text-white flex items-center gap-2">
                      {stat.value}
                      {stat.pulse && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                    </p>
                 </div>
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                    <Icon size={24} />
                 </div>
              </div>
            )
         })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 glass-panel border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-lg flex items-center gap-2 text-brq-gold">
                  <Activity size={20} /> أحدث النشاطات المباشرة
               </h3>
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                 <span className="text-xs text-white/50 font-mono">LIVE</span>
               </div>
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
               {logs.length === 0 ? (
                  <p className="text-xs text-white/50 text-center py-4">النشاطات ستظهر هنا تلقائياً عند قيام المستخدمين بأي إجراء...</p>
               ) : (
                  logs.map((log) => {
                     let Icon = Server;
                     let color = "text-emerald-400";
                     if (log.entityType === 'order') { Icon = ShoppingCart; color = "text-blue-400"; }
                     if (log.entityType === 'product') { Icon = Package; color = "text-purple-400"; }
                     if (log.entityType === 'user') { Icon = Users; color = "text-brq-gold"; }
                     if (log.action.includes('حذف')) { color = "text-red-400"; }

                     const diff = Date.now() - log.createdAt;
                     let timeText = 'الآن';
                     if (diff > 60000) timeText = `منذ ${Math.floor(diff/60000)} دقيقة`;
                     if (diff > 3600000) timeText = `منذ ${Math.floor(diff/3600000)} ساعة`;

                     return (
                     <div key={log.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ${color}`}>
                              <Icon size={18} />
                           </div>
                           <div>
                              <p className="text-sm font-bold text-white/90">{log.userName || log.userId}</p>
                              <p className="text-xs text-white/50">{log.action}</p>
                           </div>
                        </div>
                        <span className="text-xs font-mono text-white/40">{timeText}</span>
                     </div>
                  )})
               )}
            </div>
         </div>

         <div className="flex flex-col gap-6">
           <div className="glass-panel border border-white/5 rounded-xl p-5 flex flex-col">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-white/60">
                 <Server size={16} /> حالة النظام
              </h3>
              <div className="space-y-3">
                 {systemStatus.map((status, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                       <span className="text-white/70">{status.label}</span>
                       <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono">{status.status}</span>
                          <status.icon className={`${status.color}`} size={14} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="glass-panel border border-white/5 rounded-xl p-5 flex flex-col">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-emerald-400">
                 <Users size={16} /> المستخدمون النشطون الآن
              </h3>
              
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
                 <ActiveUsersList />
              </div>
           </div>
         </div>
      </div>
    </div>
  );
}

