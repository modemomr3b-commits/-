import { Plus, Search, Filter, Edit, Trash2, Archive, Upload, Package, Loader2, X, Copy, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Product, Category } from '../../types.ts';
import { burnProductOverlay } from '../../utils/burnImage.ts';
import { useStore } from '../../store';

export default function ProductManager() {
  const { user } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [usdRate, setUsdRate] = useState<number>(1500);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', price: 0, dozenPriceUsd: 0, modelNumber: '', productCode: '', barcode: '', categoryId: '', imageUrl: ''
  });
  
  const [filterStatus, setFilterStatus] = useState<'active'|'archived'>('active');

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [cats, prods, settings] = await Promise.all([
          api.getCategories(), 
          api.getProducts(),
          api.getSettings()
        ]);
        if (mounted) {
          setCategories(cats);
          setProducts(prods.map((p: any) => ({
            ...p,
            createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now()
          })));
          if (settings?.usdExchangeRate) {
            setUsdRate(settings.usdExchangeRate);
          }
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setLoading(false);
      }
    };
    
    loadData();
    const inv = setInterval(loadData, 10000); // 10 seconds interval
    return () => {
      mounted = false;
      clearInterval(inv);
    };
  }, []);

  const PACKAGING_OPTIONS = [
    { label: 'درزن', pieces: 12 },
    { label: 'درزن وربع', pieces: 15 },
    { label: 'درزن ونص', pieces: 18 },
    { label: 'درزنين', pieces: 24 },
    { label: 'أربع درازن', pieces: 48 },
    { label: 'تعبئة مخصصة', pieces: 0 }
  ];

  const handlePriceAndPackaging = (
    usdValue: number, 
    packaging: string, 
    customPieces: number, 
    isEditing: boolean = false
  ) => {
    let pieces = customPieces;
    if (packaging !== 'تعبئة مخصصة' && packaging !== '') {
       const preset = PACKAGING_OPTIONS.find(o => o.label === packaging);
       if (preset) pieces = preset.pieces;
    }

    const iqdValue = usdValue * usdRate;
    const pieceUsd = pieces > 0 ? (usdValue / pieces) : 0;
    const pieceIqd = pieces > 0 ? (iqdValue / pieces) : 0;
    
    if (isEditing && editingProduct) {
      setEditingProduct({ 
        ...editingProduct, 
        dozenPriceUsd: usdValue, 
        price: iqdValue,
        packaging,
        piecesCount: pieces,
        piecePriceUsd: pieceUsd,
        piecePriceIqd: pieceIqd
      });
    } else {
      setNewProduct({ 
        ...newProduct, 
        dozenPriceUsd: usdValue, 
        price: iqdValue,
        packaging,
        piecesCount: pieces,
        piecePriceUsd: pieceUsd,
        piecePriceIqd: pieceIqd
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          if (isEditing && editingProduct) {
            setEditingProduct({ ...editingProduct, imageUrl: dataUrl });
          } else {
            setNewProduct({ ...newProduct, imageUrl: dataUrl });
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    try {
      let finalImg = newProduct.imageUrl;
      if (newProduct.imageUrl) {
         try {
           finalImg = await burnProductOverlay(newProduct, newProduct.imageUrl);
         } catch (e) {
             console.error("Failed to generate burned image", e);
         }
      }

      await api.createProduct({
        ...newProduct,
        finalImageUrl: finalImg,
        views: 0,
        isArchived: false,
      });
      setIsAdding(false);
      setNewProduct({ name: '', price: 0, dozenPriceUsd: 0, modelNumber: '', productCode: '', barcode: '', categoryId: '', imageUrl: '' });
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.price) return;
    try {
      let finalImg = editingProduct.finalImageUrl || editingProduct.imageUrl;
      if (editingProduct.imageUrl) {
         try {
           finalImg = await burnProductOverlay(editingProduct, editingProduct.imageUrl);
         } catch (err) {
             console.error("Failed to generate burned image on update", err);
         }
      }

      await api.updateProduct(editingProduct.id, {
         ...editingProduct,
         finalImageUrl: finalImg
      });
      setEditingProduct(null);
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      if (!confirm(`هل أنت متأكد من حذف المنتج "${name}" ونقله لسلة المحذوفات؟`)) {
        return;
      }
      if (!id) {
        alert('حدث خطأ: لا يوجد معرف للمنتج');
        return;
      }
      await api.deleteProduct(id, user?.username);
      const updated = await api.getProducts();
      setProducts(updated);
      setDeleteConfirmId(null);
    } catch (e: any) {
      console.error('Error deleting:', e);
      alert('فشل الحذف: ' + e.message);
    }
  };

  const handleDuplicate = async (p: Product) => {
    try {
      const copy = { ...p };
      // @ts-ignore
      delete copy.id;
      copy.name = `${copy.name} (نسخة)`;
      
      let finalImg = copy.finalImageUrl || copy.imageUrl;
      if (copy.imageUrl) {
         try {
           finalImg = await burnProductOverlay(copy, copy.imageUrl);
         } catch (err) {
             console.error("Failed to generate burned image on duplicate", err);
         }
      }
      copy.finalImageUrl = finalImg;

      await api.createProduct(copy);
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleArchive = async (p: Product) => {
    try {
       await api.updateProduct(p.id, { isArchived: !p.isArchived });
       const updated = await api.getProducts();
       setProducts(updated);
    } catch (e) {
       console.error(e);
       alert('فشل تغيير حالة المنتج');
    }
  };

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || 'بدون قسم';
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-brq-gold w-12 h-12 mb-4" />
        <p className="text-white/50">جاري تحميل المنتجات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
             <h2 className="text-2xl font-bold text-white mb-1">إدارة المنتجات</h2>
             <p className="text-sm text-white/50">التحكم الكامل في كتالوج المنتجات والمخزون</p>
         </div>
         <div className="flex gap-2 w-full md:w-auto">
             <button className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-navy border border-brq-gold/50 text-brq-gold rounded-xl hover:bg-brq-gold hover:text-black transition-all text-sm font-bold">
                 <Upload size={18} /> رفع مجلد كامل
             </button>
             <button onClick={() => setIsAdding(!isAdding)} className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2.5 px-4 bg-brq-royal hover:bg-blue-600 text-white rounded-xl transition-all text-sm font-bold shadow-[0_4px_15px_rgba(30,94,255,0.3)]">
                 <Plus size={18} /> إضافة منتج
             </button>
         </div>
      </div>

      {isAdding && (
        <div className="glass-panel p-6 rounded-2xl border border-brq-gold/30 relative">
           <button onClick={() => setIsAdding(false)} className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-black/40 rounded-full">
             <X size={16} />
           </button>
           <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">إضافة منتج جديد</h3>
           <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="text-xs text-white/50 block mb-1">اسم المنتج *</label>
               <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white" />
             </div>
             <div>
               <label className="text-xs text-white/50 block mb-1">سعر الدرزن (بالدولار)</label>
               <input type="number" step="0.01" value={newProduct.dozenPriceUsd || ''} onChange={e => handlePriceAndPackaging(Number(e.target.value), newProduct.packaging || 'درزن', newProduct.piecesCount || 12, false)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
               <p className="text-[10px] text-white/40 mt-1">يتم ضربه بسعر الصرف الحالي: {usdRate}</p>
             </div>
             <div>
               <label className="text-xs text-white/50 block mb-1">سعر الدرزن (بالدينار) *</label>
               <input required type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
             </div>
             <div>
               <label className="text-xs text-white/50 block mb-1">التعبئة</label>
               <select value={newProduct.packaging || ''} onChange={e => handlePriceAndPackaging(newProduct.dozenPriceUsd || 0, e.target.value, 0, false)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white">
                 <option value="">-- إختر التعبئة --</option>
                 {PACKAGING_OPTIONS.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
               </select>
             </div>
             {newProduct.packaging === 'تعبئة مخصصة' && (
               <div>
                 <label className="text-xs text-white/50 block mb-1">عدد القطع</label>
                 <input type="number" value={newProduct.piecesCount || ''} onChange={e => handlePriceAndPackaging(newProduct.dozenPriceUsd || 0, newProduct.packaging || '', Number(e.target.value), false)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
               </div>
             )}
             {newProduct.piecesCount ? (
               <div className="md:col-span-2 bg-white/5 p-3 rounded-lg border border-white/10 mt-2 text-center">
                 <p className="text-xs text-white/50 mb-1">سعر القطعة (بالدينار)</p>
                 <p className="font-mono text-lg font-bold text-brq-gold">{newProduct.piecePriceIqd?.toLocaleString()} <span className="text-sm">د.ع</span></p>
               </div>
             ) : null}
             <div>
               <label className="text-xs text-white/50 block mb-1">القسم</label>
               <select value={newProduct.categoryId} onChange={e => setNewProduct({...newProduct, categoryId: e.target.value, subcategoryId: ''})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white">
                 <option value="">-- إختر القسم --</option>
                 {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
             </div>
             <div>
               <label className="text-xs text-white/50 block mb-1">القسم الفرعي</label>
               <select value={newProduct.subcategoryId || ''} onChange={e => setNewProduct({...newProduct, subcategoryId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white disabled:opacity-50" disabled={!newProduct.categoryId}>
                 <option value="">-- إختر القسم الفرعي --</option>
                 {categories.filter(c => c.parentId === newProduct.categoryId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
             </div>
             <div>
               <label className="text-xs text-white/50 block mb-1">كود المنتج</label>
               <input type="text" value={newProduct.productCode} onChange={e => setNewProduct({...newProduct, productCode: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white" />
             </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">صورة المنتج</label>
                <div className="flex items-center gap-3">
                   {newProduct.imageUrl && <img src={newProduct.imageUrl} alt="preview" className="w-10 h-10 rounded object-contain border border-white/20 bg-black/50" />}
                   <input type="file" accept="image/*" onChange={e => handleImageUpload(e, false)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-colors" />
                </div>
              </div>
             <div className="md:col-span-2">
                <button type="submit" className="w-full py-3 bg-brq-gold text-black font-bold rounded-lg mt-2">
                  أضف المنتج
                </button>
             </div>
           </form>
        </div>
      )}

      {products.length === 0 && !isAdding ? (
        <div className="flex-1 flex flex-col justify-center items-center h-[40vh] text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-brq-navy flex items-center justify-center text-brq-gold">
            <Package size={48} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">لا توجد منتجات</h2>
            <p className="text-white/50 max-w-md mx-auto">لم يتم العثور على أي منتجات في قاعدة البيانات.</p>
          </div>
        </div>
      ) : (
      <div className="space-y-4">
         <div className="flex gap-4 border-b border-white/10 pb-0">
            <button 
              onClick={() => setFilterStatus('active')}
              className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${filterStatus === 'active' ? 'border-brq-gold text-brq-gold' : 'border-transparent text-white/50 hover:text-white'}`}
            >
              المنتجات الفعالة
            </button>
            <button 
              onClick={() => setFilterStatus('archived')}
              className={`pb-2 px-2 text-sm font-bold border-b-2 transition-colors ${filterStatus === 'archived' ? 'border-brq-gold text-brq-gold' : 'border-transparent text-white/50 hover:text-white'}`}
            >
              المواد النافذة
            </button>
         </div>

         <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden p-1">
            <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3">
               <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                  <input 
                     type="text" 
                     className="w-full bg-black/40 border border-white/10 rounded-lg pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:border-brq-gold/50"
                     placeholder="بحث بالاسم، الكود، الباركود..."
                  />
               </div>
               <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm hover:bg-white/5 transition-colors">
                   <Filter size={16} /> تصفية حسب القسم
               </button>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-right">
                  <thead className="bg-black/40 text-white/60">
                     <tr>
                        <th className="p-4 font-medium rounded-tr-lg">صورة</th>
                        <th className="p-4 font-medium">اسم المنتج</th>
                        <th className="p-4 font-medium">الكود</th>
                        <th className="p-4 font-medium">القسم</th>
                        <th className="p-4 font-medium">السعر (د.ع)</th>
                        <th className="p-4 font-medium">المشاهدات</th>
                        <th className="p-4 font-medium rounded-tl-lg">الإجراءات</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/90">
                     {products.filter(p => filterStatus === 'archived' ? p.isArchived : !p.isArchived).map((p) => (
                     <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                           <div className="w-12 h-12 rounded-lg bg-brq-navy flex items-center justify-center border border-white/10 overflow-hidden text-2xl">
                                {(p.finalImageUrl || p.imageUrl) ? <img src={p.finalImageUrl || p.imageUrl} alt={p.name} className="w-full h-full object-contain bg-black/20" /> : '👟'}
                           </div>
                        </td>
                        <td className="p-4 font-bold">{p.name}</td>
                        <td className="p-4 font-mono text-brq-gold">{p.productCode || '-'}</td>
                        <td className="p-4 text-xs bg-black/20"><span className="px-2 py-1 rounded bg-brq-navy/50 border border-white/10">{getCategoryName(p.categoryId)}</span></td>
                        <td className="p-4 font-mono font-bold">{(p.price || 0).toLocaleString('ar-IQ')}</td>
                        <td className="p-4">
                           <span className="flex items-center gap-1 text-white/60">
                              <Search size={12} /> {p.views || 0}
                           </span>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-2">
                              {(p.finalImageUrl || p.imageUrl) && (
                                 <a href={p.finalImageUrl || p.imageUrl} download={`BRQ-${p.name}.jpg`} className="p-1.5 hover:bg-white/20 text-white/70 rounded transition-colors" title="تحميل"><Download size={16} /></a>
                              )}
                              <button type="button" onClick={() => handleDuplicate(p)} className="p-1.5 hover:bg-green-500/20 text-green-400 rounded transition-colors" title="نسخ المنتج"><Copy size={16} /></button>
                              <button type="button" onClick={() => setEditingProduct(p)} className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors" title="تعديل"><Edit size={16} /></button>
                              <button type="button" onClick={() => handleToggleArchive(p)} className="p-1.5 hover:bg-yellow-500/20 text-yellow-400 rounded transition-colors" title={p.isArchived ? "استرجاع للمنتجات الفعالة" : "نقل للمواد النافذة"}><Archive size={16} /></button>
                              <button type="button" onClick={() => handleDelete(p.id, p.name)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors" title="حذف"><Trash2 size={16} /></button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
      </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl border border-brq-gold/30 relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditingProduct(null)} className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-black/40 rounded-full">
              <X size={16} />
            </button>
            <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">تعديل المنتج</h3>
            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/50 block mb-1">اسم المنتج *</label>
                <input required type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white" />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">سعر الدرزن (بالدولار)</label>
                <input type="number" step="0.01" value={editingProduct.dozenPriceUsd || ''} onChange={e => handlePriceAndPackaging(Number(e.target.value), editingProduct.packaging || 'درزن', editingProduct.piecesCount || 12, true)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
                <p className="text-[10px] text-white/40 mt-1">يتم ضربه بسعر الصرف الحالي: {usdRate}</p>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">سعر الدرزن (بالدينار) *</label>
                <input required type="number" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">التعبئة</label>
                <select value={editingProduct.packaging || ''} onChange={e => handlePriceAndPackaging(editingProduct.dozenPriceUsd || 0, e.target.value, 0, true)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white">
                  <option value="">-- إختر التعبئة --</option>
                  {PACKAGING_OPTIONS.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
                </select>
              </div>
              {editingProduct.packaging === 'تعبئة مخصصة' && (
                <div>
                  <label className="text-xs text-white/50 block mb-1">عدد القطع</label>
                  <input type="number" value={editingProduct.piecesCount || ''} onChange={e => handlePriceAndPackaging(editingProduct.dozenPriceUsd || 0, editingProduct.packaging || '', Number(e.target.value), true)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
                </div>
              )}
              {editingProduct.piecesCount ? (
                <div className="md:col-span-2 bg-white/5 p-3 rounded-lg border border-white/10 mt-2 text-center">
                  <p className="text-xs text-white/50 mb-1">سعر القطعة (بالدينار)</p>
                  <p className="font-mono text-lg font-bold text-brq-gold">{editingProduct.piecePriceIqd?.toLocaleString()} <span className="text-sm">د.ع</span></p>
                </div>
              ) : null}
              <div>
                <label className="text-xs text-white/50 block mb-1">القسم</label>
                <select value={editingProduct.categoryId} onChange={e => setEditingProduct({...editingProduct, categoryId: e.target.value, subcategoryId: ''})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white">
                  <option value="">-- إختر القسم --</option>
                  {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">القسم الفرعي</label>
                <select value={editingProduct.subcategoryId || ''} onChange={e => setEditingProduct({...editingProduct, subcategoryId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white disabled:opacity-50" disabled={!editingProduct.categoryId}>
                  <option value="">-- إختر القسم الفرعي --</option>
                  {categories.filter(c => c.parentId === editingProduct.categoryId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">كود المنتج</label>
                <input type="text" value={editingProduct.productCode} onChange={e => setEditingProduct({...editingProduct, productCode: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white" />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">صورة المنتج</label>
                <div className="flex items-center gap-3">
                   {editingProduct.imageUrl && <img src={editingProduct.imageUrl} alt="preview" className="w-10 h-10 rounded object-contain border border-white/20 bg-black/50" />}
                   <input type="file" accept="image/*" onChange={e => handleImageUpload(e, true)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-colors" />
                </div>
              </div>
              <div className="md:col-span-2">
                 <button type="submit" className="w-full py-3 bg-brq-gold text-black font-bold rounded-lg mt-2">
                   حفظ التعديلات
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
