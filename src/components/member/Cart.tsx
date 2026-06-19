import { ShoppingBag, CheckCircle, Send, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useStore } from '../../store';
import { useState } from 'react';
import { api } from '../../api';
import { useNavigate, Link } from 'react-router';
import OptimizedImage from '../OptimizedImage';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, clearCart, user } = useStore();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const totalPieces = cart.reduce((acc, item) => {
    // If we are selling pieces or dozens, here the quantity is just what user selected
    return acc + item.quantity;
  }, 0);

  const handleSubmitOptions = async () => {
    if (cart.length === 0 || !user) return;
    setIsSubmitting(true);
    try {
      const orderNumber = `BRQ-${Math.floor(1000 + Math.random() * 9000)}`;
      await api.createOrder({
        userId: user.uid,
        username: user.username,
        fullName: user.fullName || user.username,
        orderNumber,
        status: 'new',
        items: cart.map(item => ({
             productId: item.product.id,
             quantity: item.quantity,
             product: item.product,
        })),
        totalQuantity: totalPieces,
        notes: notes.trim(),
        createdAt: Date.now()
      });
      clearCart();
      setSuccess(true);
      
      // Let's create an update entry or notification for admins
      // But firestore `onSnapshot` inside Admin's components could just listen to `orders`
    } catch(e) {
      console.error(e);
      alert('حدث خطأ أثناء إرسال الطلبية');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
     return (
        <div className="p-4 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] text-center space-y-6">
           <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-2">
              <CheckCircle size={48} />
           </div>
           <div>
              <h2 className="text-2xl font-bold text-white mb-2">تمت الطلبية بنجاح!</h2>
              <p className="text-white/60 mb-6">سيتم مراجعة الطلبية من قبل الإدارة والتواصل معك قريباً.</p>
           </div>
           <button onClick={() => navigate('/')} className="bg-brq-navy text-white px-6 py-3 rounded-xl border border-white/10 flex items-center gap-2 hover:bg-white/5 transition-colors font-bold">
              العودة للرئيسية <ArrowRight size={18} className="rotate-180" />
           </button>
        </div>
     );
  }

  if (cart.length === 0) {
     return (
        <div className="p-4 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] text-center space-y-6">
           <div className="w-20 h-20 bg-brq-navy rounded-full flex items-center justify-center text-brq-gold mb-2 border border-white/10">
              <ShoppingBag size={32} />
           </div>
           <div>
              <h2 className="text-xl font-bold text-white mb-2">السلة فارغة</h2>
              <p className="text-white/60 text-sm mb-6">قم بإضافة منتجات إلى السلة من خلال تصفح الأقسام.</p>
           </div>
           <button onClick={() => navigate('/')} className="bg-brq-gold text-black px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-yellow-500 transition-colors font-bold">
              تصفح المنتجات
           </button>
        </div>
     );
  }

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-2 text-brq-royal">
            <ShoppingBag className="w-6 h-6" />
            <h1 className="text-xl font-bold text-white">الطلبيات السريعة</h1>
         </div>
         <span className="text-sm font-bold bg-white/10 px-3 py-1 rounded-full text-white/70">
            {totalPieces} علب/قطع
         </span>
      </div>
      
      <div className="flex-1 space-y-4">
         {cart.map((item) => (
             <div key={item.product.id} className="glass-card p-3 rounded-2xl flex gap-3 relative">
                <Link to={`/product/${item.product.id}`} className="shrink-0">
                  {item.product.finalImageUrl || item.product.imageUrl ? (
                     <OptimizedImage src={item.product.finalImageUrl || item.product.imageUrl} alt={item.product.name} size="thumbnail" className="w-24 h-24 rounded-xl object-contain bg-black/40 border border-white/5" />
                  ) : <div className="w-24 h-24 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-3xl">👟</div>}
                </Link>
                <div className="flex flex-col flex-1 py-1">
                   <h3 className="font-bold text-sm mb-1 leading-tight text-white">{item.product.name}</h3>
                   <span className="text-xs text-white/50 font-mono">{item.product.productCode} - {item.product.modelNumber}</span>
                   <div className="flex items-center gap-3 bg-black/40 rounded-lg p-1 border border-white/5 w-fit mt-auto">
                       <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 hover:text-brq-gold text-white"><Plus size={14} /></button>
                       <span className="text-xs font-mono font-bold w-4 text-center text-white">{item.quantity}</span>
                       <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 hover:text-white/50 text-white/50"><Minus size={14} /></button>
                   </div>
                </div>
                <button onClick={() => removeFromCart(item.product.id)} className="absolute top-3 left-3 text-red-400 p-2 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors">
                    <Trash2 size={16} />
                </button>
             </div>
         ))}

         <div className="glass-panel p-4 rounded-xl mt-6 space-y-3 border border-white/5">
             <label className="text-xs text-white/70 font-bold block mb-2">ملاحظات الطلبية (اختياري)</label>
             <textarea 
               value={notes}
               onChange={e => setNotes(e.target.value)}
               className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-brq-gold/50 h-24 text-white placeholder-white/30"
               placeholder="أضف ملاحظاتك حول الألوان أو القياسات المطلوبة، أو أي تفاصيل أخرى..."
             />
         </div>
      </div>

      <div className="mt-8 mb-4">
         <button 
            onClick={handleSubmitOptions}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-brq-gold to-yellow-600 hover:from-yellow-500 hover:to-yellow-500 text-black rounded-xl font-bold tracking-wide shadow-[0_4px_20px_rgba(212,175,55,0.3)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
         >
            {isSubmitting ? <span className="animate-pulse">جاري إرسال الطلب...</span> : (
               <>
                  <Send size={20} /> إرسال الطلبية للإدارة
               </>
            )}
         </button>
      </div>
    </div>
  );
}
