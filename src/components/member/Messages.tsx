import { formatDateTime, formatDate } from '../../utils/time';
import { useState, useEffect } from 'react';
import { api } from '../../api';
import { Bell, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Messages() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getUpdates().then(data => {
      if (mounted) {
        setMessages(data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-brq-navy rounded-xl border border-brq-gold flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)]">
          <MessageCircle className="text-brq-gold w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">الرسائل والإشعارات</h1>
          <p className="text-white/60 text-sm">أحدث الأخبار والعروض من شركة الوفاء</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/40 border border-white/5 rounded-2xl">
          <Bell className="w-16 h-16 text-white/20 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">لا توجد رسائل</h3>
          <p className="text-white/50 max-w-sm">لم تصلك أي إشعارات أو رسائل حتى الآن. سنقوم بإبلاغك فور توفر أي جديد.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={msg.id} 
              className="bg-black/40 border border-white/10 rounded-2xl p-5 hover:bg-black/60 transition-all shadow-lg"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-brq-gold/20 flex items-center justify-center flex-shrink-0 text-brq-gold border border-brq-gold/30">
                  <Bell size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">{msg.title}</h3>
                    <span className="text-xs text-white/40" dir="ltr">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-white/80 leading-relaxed text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
