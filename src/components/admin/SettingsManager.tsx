import { Save, Building2, Monitor, Bell, Shield, Globe, HardDrive, Loader2, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api.ts';

export default function SettingsManager() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [settings, setSettings] = useState({
    companyName: 'شركة الوفاء المتميز',
    phone: '',
    maintenanceMode: false,
    openRegistration: true,
    usdExchangeRate: 1500, // Default value
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
            <h3 className="font-bold text-lg">إعدادات سعر التكسير</h3>
          </div>
          <div className="space-y-3">
             <div>
               <label className="text-xs text-white/50 mb-1 block">سعر الدولار مقابل الدينار لليوم</label>
               <input 
                  type="number" 
                  value={settings.usdExchangeRate || ''} 
                  onChange={e => setSettings({...settings, usdExchangeRate: Number(e.target.value)})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" 
               />
               <p className="text-[10px] text-white/40 mt-1">
                 تغيير هذا السعر سيؤثر على حساب أسعار المنتجات الجديدة فقط (سعر الدرزن).
               </p>
             </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Building2 className="text-brq-gold" size={24} />
            <h3 className="font-bold text-lg">معلومات الشركة</h3>
          </div>
          <div className="space-y-3">
             <div>
               <label className="text-xs text-white/50 mb-1 block">اسم الشركة</label>
               <input 
                  type="text" 
                  value={settings.companyName} 
                  onChange={e => setSettings({...settings, companyName: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white" 
               />
             </div>
             <div>
               <label className="text-xs text-white/50 mb-1 block">رقم الهاتف</label>
               <input 
                  type="text" 
                  value={settings.phone} 
                  onChange={e => setSettings({...settings, phone: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white" 
               />
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
             <button className="w-full text-right px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm hover:bg-white/5 transition-colors">تغيير كلمة المرور...</button>
             <button className="w-full text-right px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm hover:bg-white/5 transition-colors">إعدادات المصادقة الثنائية...</button>
          </div>
        </div>
      </div>
    </div>
  );
}
