import React, { useState } from 'react';
import { X, Minus, Plus, ShoppingCart, Loader2 } from 'lucide-react';
import { Product } from '../../types';
import { api } from '../../api';

interface ShowcaseCartModalProps {
  cart: { product: Product; quantity: number }[];
  setCart: React.Dispatch<React.SetStateAction<{ product: Product; quantity: number }[]>>;
  onClose: () => void;
  authData: { agent: { id: string; fullName: string }; visitorName: string };
  showToast: (msg: string) => void;
}

export default function ShowcaseCartModal({ cart, setCart, onClose, authData, showToast }: ShowcaseCartModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQ = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const orderNumber = `BRQ-${Math.floor(1000 + Math.random() * 9000)}`;
      await api.createOrder({
        userId: authData.agent.id,
        username: authData.agent.fullName,
        fullName: authData.visitorName,
        orderNumber,
        status: 'pending_agent',
        items: cart.map(item => ({
             productId: item.product.id,
             quantity: item.quantity,
             product: item.product,
        })),
        totalQuantity: totalQuantity,
        notes: `طلبية من زائر المعرض: ${authData.visitorName}`,
        createdAt: Date.now()
      });
      showToast('تم إرسال الطلبية بنجاح إلى الوكيل!');
      setCart([]);
      onClose();
    } catch (err: any) {
      alert('حدث خطأ أثناء إرسال الطلبية: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <ShoppingCart size={20} className="text-brq-gold" />
            سلة الطلبيات
          </div>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-white/50">
              <ShoppingCart size={48} className="mx-auto mb-3 opacity-20" />
              السلة فارغة حالياً
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex gap-3 bg-white/5 border border-white/5 rounded-xl p-3">
                {item.product.finalImageUrl || item.product.imageUrl ? (
                   <img src={item.product.finalImageUrl || item.product.imageUrl} alt={item.product.name} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                   <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center text-xs text-white/30">لا صورة</div>
                )}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-white text-sm font-bold line-clamp-1">{item.product.name}</h4>
                    <p className="text-xs text-brq-gold font-mono mt-0.5">{item.product.productCode}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/10">
                      <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-r-lg transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-l-lg transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-black/40">
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/70 text-sm">إجمالي القطع</span>
              <span className="text-xl font-bold text-white">{totalQuantity}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-brq-gold hover:bg-yellow-400 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                'إرسال الطلبية للوكيل'
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
