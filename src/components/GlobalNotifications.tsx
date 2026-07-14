import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useStore } from '../store';

interface NotificationData {
  id: string;
  name: string;
  imageUrl?: string;
  price?: number;
}

export default function GlobalNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const navigate = useNavigate();
  const { user } = useStore();

  useEffect(() => {
    // Only show to regular users, not necessarily the admin who is adding it (optional, but good practice)
    if (user?.role === 'admin') return; 

    const channel = supabase
      .channel('public:announcements', { config: { broadcast: { self: true } } })
      .on('broadcast', { event: 'new_product' }, (payload) => {
        const newProduct = payload.payload;
        setNotifications(prev => [...prev, newProduct]);
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== newProduct.id));
        }, 8000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClick = (id: string) => {
    navigate(`/product/${id}`);
    removeNotification(id);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, x: -50 }}
            className="bg-black/90 border border-brq-gold/50 shadow-[0_0_20px_rgba(212,175,55,0.2)] backdrop-blur-md rounded-xl p-4 w-80 pointer-events-auto cursor-pointer group"
            onClick={() => handleClick(notif.id)}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
              className="absolute top-2 left-2 p-1 text-white/50 hover:text-white bg-black/50 rounded-full"
            >
              <X size={14} />
            </button>
            
            <div className="flex items-center gap-3">
              {notif.imageUrl ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-brq-gold/30">
                  <img src={notif.imageUrl} alt={notif.name || notif.title || 'إشعار جديد'} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-brq-gold/20 flex items-center justify-center flex-shrink-0 text-brq-gold">
                  <Bell size={24} />
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1 text-brq-gold">
                  <Bell size={12} className="animate-pulse" />
                  <span className="text-xs font-bold tracking-wider">شوفوا جديدنا! 🔥</span>
                </div>
                <h4 className="text-sm text-white font-medium line-clamp-1 mb-1">{notif.name || notif.title || 'إشعار جديد'}</h4>
                <p className="text-xs text-white/60">تم إضافة موديل حصري جديد، سارع بمشاهدته الآن.</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
