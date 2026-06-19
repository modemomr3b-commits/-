import { Plus, Search, Edit, Trash2, Eye, EyeOff, Loader2, BarChart2, FolderTree, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Category } from '../../types.ts';
import { useStore } from '../../store';

export default function CategoryManager() {
  const { user } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchCats = async () => {
      try {
        const cats = await api.getCategories();
        if (mounted) {
          setCategories(cats);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setLoading(false);
      }
    };
    fetchCats();
    const inv = setInterval(fetchCats, 5000);
    return () => {
      mounted = false;
      clearInterval(inv);
    };
  }, []);

  const handleCreate = async () => {
    if (!newCatName.trim()) return;
    try {
      await api.createCategory({
        name: newCatName,
        order: categories.length + 1,
        parentId: null,
        isHidden: false,
      });
      setNewCatName('');
      setIsAdding(false);
      const updated = await api.getCategories();
      setCategories(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const allProducts = await api.getProducts();
      const productsInCat = allProducts.filter(p => p.categoryId === id || p.subcategoryId === id);
      
      if (productsInCat.length > 0) {
         if(!confirm(`تنبيه: هذا القسم (${name}) يحتوي على ${productsInCat.length} منتجات.\nهل أنت متأكد من رغبتك في حذفه ونقله لسلة المحذوفات؟`)) {
            return;
         }
      } else {
         if(!confirm(`هل تريد بالتأكيد نقل قسم "${name}" إلى سلة المحذوفات؟`)) {
            return;
         }
      }

      await api.deleteCategory(id, user?.username);
      const updated = await api.getCategories();
      setCategories(updated);
    } catch(e) {
      console.error(e);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const handleToggleHide = async (id: string, currentIsHidden: boolean) => {
    try {
      await api.updateCategory(id, {
        isHidden: !currentIsHidden
      });
      const updated = await api.getCategories();
      setCategories(updated);
    } catch(e) {
      console.error(e);
    }
  };

  const parentCategories = categories.filter(c => !c.parentId).sort((a: any, b: any) => a.order - b.order);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parentId === parentId).sort((a: any, b: any) => a.order - b.order);

  const [activeParentForSub, setActiveParentForSub] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  const handleCreateSub = async (parentId: string) => {
    if (!newSubName.trim()) return;
    try {
      const subs = getSubcategories(parentId);
      await api.createCategory({
        name: newSubName,
        order: subs.length + 1,
        parentId: parentId,
        isHidden: false,
      });
      setNewSubName('');
      setActiveParentForSub(null);
      const updated = await api.getCategories();
      setCategories(updated);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-brq-gold w-12 h-12" />
      </div>
    );
  }

  if (categories.length === 0 && !isAdding) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-[60vh] text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-brq-navy flex items-center justify-center text-brq-gold">
          <Search size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">لا توجد أقسام</h2>
          <p className="text-white/50 max-w-md mx-auto">لم يتم العثور على أي أقسام في قاعدة البيانات. يمكنك إضافة قسم جديد لبدء تصنيف منتجاتك.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-6 py-3 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all font-bold">
            <Plus size={20} />
            إنشاء قسم يدوي
          </button>
          
          <button onClick={async () => {
             const CATEGORIES = [
                { name: 'جديد الوفاء', order: 1, subs: ['ولادي', 'بناتي', 'محير'] },
                { name: 'جديد لاستيك & ايفا', order: 2, subs: ['رجالي', 'نسائي'] },
                { name: 'جديد تركي', order: 3, subs: ['رجالي', 'نسائي', 'ولادي'] },
                { name: 'سكيجر راقي', order: 4, subs: ['رجالي', 'نسائي'] },
                { name: 'جديد الوفاء مدرسي & سفر', order: 5, subs: ['مدرسي', 'سفر'] },
                { name: 'صيفي', order: 6, subs: [] },
                { name: 'تحطيم الأسعار', order: 7, subs: [] },
             ];
             for (const cat of CATEGORIES) {
                const parent = await api.createCategory({ name: cat.name, order: cat.order, parentId: null, isHidden: false });
                let subOrder = 1;
                for (const sub of cat.subs) {
                   await api.createCategory({ name: sub, order: subOrder++, parentId: parent.id, isHidden: false });
                }
             }
             const updated = await api.getCategories();
             setCategories(updated);
          }} className="flex items-center gap-2 px-6 py-3 bg-brq-gold hover:bg-brq-gold/80 text-black rounded-xl transition-all font-bold">
            <Layers size={20} />
            تحميل القوائم المتفق عليها
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
             <h2 className="text-2xl font-bold text-white mb-1">إدارة الأقسام</h2>
             <p className="text-sm text-white/50">تنظيم وتصنيف المنتجات في المتجر</p>
         </div>
         <button onClick={() => setIsAdding(!isAdding)} className="flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(30,94,255,0.3)]">
             <Plus size={18} /> {isAdding ? 'إلغاء' : 'إضافة قسم رئيسي'}
         </button>
      </div>

      {isAdding && (
        <div className="glass-panel p-4 rounded-xl border border-brq-gold/30 flex gap-4 items-end">
           <div className="flex-1">
             <label className="text-xs text-white/50 block mb-1">اسم القسم الجديد</label>
             <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white" placeholder="مثال: أحذية رياضية..." autoFocus />
           </div>
           <button onClick={handleCreate} disabled={!newCatName.trim()} className="px-6 py-2 bg-brq-gold text-black rounded-lg font-bold disabled:opacity-50">
             حفظ
           </button>
        </div>
      )}

      {categories.length > 0 && (
      <div className="grid grid-cols-1 gap-4">
          {parentCategories.map((c) => {
             const subs = getSubcategories(c.id!);
             return (
               <div key={c.id} className="glass-panel border border-white/5 rounded-2xl p-4 overflow-hidden">
                  <div className={`flex flex-col md:flex-row justify-between md:items-center gap-4 ${c.isHidden ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-brq-gold font-bold">
                         {c.order}
                       </div>
                       <div>
                         <h3 className="font-bold text-lg">{c.name}</h3>
                         <p className="text-xs text-white/50">{subs.length} أقسام فرعية</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 border-t border-white/5 md:border-none pt-3 md:pt-0">
                       <button onClick={() => setActiveParentForSub(activeParentForSub === c.id ? null : c.id!)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors text-blue-400">
                         <Plus size={14} /> قسم فرعي
                       </button>
                       <span className={`px-2 py-1 rounded text-[10px] border mr-2 ${c.isHidden ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                         {c.isHidden ? 'مخفي' : 'مرئي'}
                       </span>
                       <button onClick={() => handleToggleHide(c.id!, c.isHidden === true)} className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors" title={c.isHidden ? "إظهار" : "إخفاء"}>
                          {c.isHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                       </button>
                       <button onClick={() => handleDelete(c.id!, c.name)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="حذف">
                          <Trash2 size={18} />
                       </button>
                    </div>
                  </div>

                  {activeParentForSub === c.id && (
                     <div className="mt-4 p-3 bg-black/40 rounded-xl border border-blue-500/30 flex gap-2">
                        <input type="text" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} placeholder="اسم القسم الفرعي..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500/50" autoFocus />
                        <button onClick={() => handleCreateSub(c.id!)} disabled={!newSubName.trim()} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors">
                          إضافة
                        </button>
                     </div>
                  )}

                  {subs.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                       {subs.map(sub => (
                         <div key={sub.id} className="bg-black/30 border border-white/5 p-2 rounded-lg flex items-center justify-between group">
                            <span className="text-sm font-semibold">{sub.name}</span>
                            <button onClick={() => handleDelete(sub.id!, sub.name)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded">
                              <Trash2 size={14} />
                            </button>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
             );
          })}
      </div>
      )}
    </div>
  );
}
