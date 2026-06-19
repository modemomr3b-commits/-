import { TrendingUp, FileText, Download, Calendar, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api';

export default function ReportManager() {
  const [stats, setStats] = useState({
    sales: 0,
    orders: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchReports = async () => {
      try {
        const [ordersRes, usersRes] = await Promise.all([api.getOrders(), api.getUsers()]);
        
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
             <h2 className="text-2xl font-bold text-white mb-1">التقارير</h2>
             <p className="text-sm text-white/50">تحليل الأداء والإحصائيات</p>
         </div>
         <div className="flex gap-2">
            <button className="flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-navy border border-brq-gold/50 text-brq-gold rounded-xl hover:bg-brq-gold hover:text-black transition-all text-sm font-bold">
               <Download size={18} /> تحميل تقرير شامل
            </button>
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
         <h3 className="font-bold text-lg mb-4">توليد التقارير المخصصة</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
               <label className="text-xs text-white/50 mb-1 block">نوع التقرير</label>
               <select className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white">
                  <option>المبيعات</option>
                  <option>المخزون</option>
                  <option>العملاء</option>
               </select>
            </div>
            <div>
               <label className="text-xs text-white/50 mb-1 block">من تاريخ</label>
               <input type="date" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white color-scheme-dark" />
            </div>
            <div>
               <label className="text-xs text-white/50 mb-1 block">إلى تاريخ</label>
               <input type="date" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white color-scheme-dark" />
            </div>
         </div>
         <button className="px-6 py-2.5 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(30,94,255,0.3)]">
             إنشاء تقرير
         </button>
      </div>
    </div>
  );
}
