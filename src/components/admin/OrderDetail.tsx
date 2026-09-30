import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '../../api';
import { Order } from '../../types';
import { Loader2 } from 'lucide-react';

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        setLoading(true);
        // Assuming api.getOrderById(id) exists or similar
        // Since I don't have getOrderById, I'll fetch all orders and filter.
        // Actually, let's look at api.ts for better options.
        const allOrders = await api.getAllOrders();
        const foundOrder = allOrders.find(o => o.id === orderId);
        setOrder(foundOrder || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-brq-gold" /></div>;
  if (!order) return <div className="p-10 text-white">الطلب غير موجود</div>;

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">تفاصيل الطلب: {order.orderNumber}</h1>
      <pre className="bg-white/10 p-4 rounded">{JSON.stringify(order, null, 2)}</pre>
    </div>
  );
}
