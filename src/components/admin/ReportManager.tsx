import { TrendingUp, FileText, Download, Calendar, Loader2, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { ActivityLog } from '../../types';

export default function ReportManager() {
  const [stats, setStats] = useState({
    sales: 0,
    orders: 0,
    users: 0,
  });
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchReports = async () => {
      try {
        const [ordersRes, usersRes, logsRes] = await Promise.all([
           api.getOrders(), 
           api.getUsers(),
           api.getLogs()
        ]);
        
        if (mounted) {
          let totalSales = 0;
          let totalOrders = ordersRes.length;
          ordersRes.forEach((order: any) => {
            if (order.items) {
               totalSales += order.items.reduce((acc: number, cur: any) => acc + (cur.quantity * 10000), 0);
            }
          });
          
          setStats({
             sales: totalSales,
             orders: totalOrders,
             users: usersRes.length
          });
          setLogs(logsRes);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setLoading(false);
      }
    };
    
    fetchReports();
    const inv = setInterval(fetchReports, 5000);
    return () => {
      mounted = false;
      clearInterval(inv);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-brq-gold w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
             <h2 className="text-2xl font-bold text-white mb-1">التقارير وسجل النشاط</h2>
             <p className="text-sm text-white/50">تحليل الأداء والإحصائيات ومتابعة الأنشطة</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="w-12 h-12 rounded-xl bg-brq-gold/20 flex items-center justify-center text-brq-gold mb-4">
             <TrendingUp size={24} />
          </div>
          <h3 className="font-bold text-lg mb-1">إجمالي المبيعات التقديرية</h3>
          <p className="text-2xl font-mono text-brq-gold mb-4">{stats.sales.toLocaleString('ar-IQ')} د.ع</p>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
             <div className="bg-brq-gold h-full w-[60%] rounded-full"></div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
             <FileText size={24} />
          </div>
          <h3 className="font-bold text-lg mb-1">الطلبات المسجلة</h3>
          <p className="text-2xl font-mono text-blue-400 mb-4">{stats.orders} طلب</p>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
             <div className="bg-blue-400 h-full w-[85%] rounded-full"></div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 mb-4">
             <Calendar size={24} />
          </div>
          <h3 className="font-bold text-lg mb-1">المستخدمين المسجلين</h3>
          <p className="text-2xl font-mono text-green-400 mb-4">{stats.users} مستخدم</p>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
             <div className="bg-green-400 h-full w-[45%] rounded-full"></div>
          </div>
        </div>
      </div>
      
      <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden p-6 mt-6">
         <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Activity className="text-brq-gold" size={20} /> سجل نشاطات النظام
         </h3>
         
         <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar space-y-3">
             {logs.length === 0 ? (
                 <p className="text-white/50 text-center py-6">لا يوجد نشاطات مسجلة حتى الآن.</p>
             ) : (
                 <div className="divide-y divide-white/5">
                    {logs.map((log) => (
                       <div key={log.id} className="py-3 flex flex-col hover:bg-white/5 p-2 rounded-lg transition-colors">
                           <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2">
                                 <span className="font-bold text-sm text-brq-gold">{log.userName || log.userId}</span>
                                 <span className="text-sm text-white/70">قام بـ {log.action}</span>
                              </div>
                              <span className="text-xs text-white/40" dir="ltr">{new Date(log.createdAt).toLocaleString('ar-IQ')}</span>
                           </div>
                           {(log.entityType || log.entityId) && (
                              <div className="text-xs text-white/50 mt-1 font-mono">
                                 [ {log.entityType === 'order' ? 'طلب' : log.entityType === 'user' ? 'مستخدم' : log.entityType === 'product' ? 'منتج' : log.entityType} : {log.entityId} ]
                              </div>
                           )}
                       </div>
                    ))}
                 </div>
             )}
         </div>
      </div>
    </div>
  );
}
