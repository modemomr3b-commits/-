import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Bell, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useStore } from '../store';
import { subscribeToPushNotifications } from '../pushService';

interface NotificationData {
  id: string;
  name: string;
  title?: string;
  imageUrl?: string;
  price?: number;
}

export default function GlobalNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, showToast } = useStore();

  useEffect(() => {
    // Check if notifications need prompting
    if (user?.role !== 'admin') {
      const isDismissed = sessionStorage.getItem('brq_notif_prompt_dismissed');
      if (!isDismissed && 'Notification' in window) {
        if (Notification.permission === 'default') {
          // Show prompt after 2 seconds
          const timer = setTimeout(() => {
            setShowPermissionPrompt(true);
          }, 2000);
          return () => clearTimeout(timer);
        } else if (Notification.permission === 'granted') {
          setPermissionGranted(true);
        }
      }
    }
  }, [user]);

  useEffect(() => {
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

  const handleEnableClick = async () => {
    setStatusMessage(null);
    const res = await subscribeToPushNotifications();
    if (res.success) {
      setPermissionGranted(true);
      setShowPermissionPrompt(false);
      showToast(res.message || 'تم تفعيل الإشعارات بنجاح!', 'success');
    } else {
      if (Notification.permission === 'denied') {
        setStatusMessage('الإشعارات محظورة من متصفحك. يرجى تفعيل السماح بالإشعارات من إعدادات المتصفح ليصلك كل جديد.');
      } else {
        setStatusMessage(res.message || 'خلي الإشعارات تتفعل علمود يوصلك كل الجديد الي ننشرة.');
      }
    }
  };

  const handleDismissPrompt = () => {
    setShowPermissionPrompt(false);
    sessionStorage.setItem('brq_notif_prompt_dismissed', 'true');
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClick = (id: string) => {
    navigate(`/product/${id}`);
    removeNotification(id);
  };

  return (
    <>
      {/* Notification Permission Prompt Modal (Custom styled with site colors) */}
      <AnimatePresence>
        {showPermissionPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0a1128] border border-brq-gold/40 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(212,175,55,0.25)] flex flex-col items-center text-center overflow-hidden"
            >
              {/* Background ambient glow */}
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-brq-gold/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-brq-gold/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Close Button */}
              <button 
                onClick={handleDismissPrompt}
                className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={18} />
              </button>

              {/* Bell Icon */}
              <div className="relative w-20 h-20 bg-gradient-to-br from-brq-gold/20 via-brq-gold/10 to-transparent rounded-2xl flex items-center justify-center mb-5 border border-brq-gold/30 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                <Bell size={38} className="text-brq-gold animate-bounce" />
                <Sparkles size={18} className="text-yellow-300 absolute -top-1 -right-1" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2 leading-snug">
                تفعيل الإشعارات
              </h3>

              <p className="text-sm sm:text-base text-brq-gold/90 font-medium leading-relaxed mb-6">
                خلي الإشعارات تتفعل علمود يوصلك كل الجديد الي ننشرة 🔔
              </p>

              {statusMessage && (
                <div className="w-full mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 leading-relaxed">
                  {statusMessage}
                </div>
              )}

              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={handleEnableClick}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brq-gold via-amber-400 to-yellow-500 text-black font-bold text-sm shadow-[0_10px_25px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Bell size={18} />
                  <span>تفعيل الإشعارات الآن</span>
                </button>

                <button
                  onClick={handleDismissPrompt}
                  className="w-full py-2.5 px-4 rounded-xl text-white/60 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
                >
                  لاحقاً
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating In-App Notifications Toast */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: -50 }}
              className="bg-black/90 border border-brq-gold/50 shadow-[0_0_20px_rgba(212,175,55,0.2)] backdrop-blur-md rounded-xl p-4 w-80 pointer-events-auto cursor-pointer group relative"
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
    </>
  );
}
