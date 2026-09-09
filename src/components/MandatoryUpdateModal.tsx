import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';
import { api } from '../api';

export default function MandatoryUpdateModal() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const lastUpdateSeen = localStorage.getItem('brq_last_update_seen');
    
    const checkUpdates = async () => {
      try {
        const updates = await api.getUpdates();
        if (updates && updates.length > 0) {
          const latest = updates[0];
          const latestTime = new Date(latest.createdAt || latest.updatedAt || Date.now()).getTime();
          if (lastUpdateSeen && Number(lastUpdateSeen) < latestTime) {
            setNeedsUpdate(true);
          } else if (!lastUpdateSeen) {
            localStorage.setItem('brq_last_update_seen', latestTime.toString());
          }
        }
      } catch (e) {}
    };

    checkUpdates();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('public:announcements')
      .on('broadcast', { event: 'new_product' }, () => {
        setNeedsUpdate(true);
      })
      .on('broadcast', { event: 'new_announcement' }, () => {
        setNeedsUpdate(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateNow = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await api.forceRefreshAll();
      localStorage.setItem('brq_last_update_seen', Date.now().toString());
    } catch (e) {}
    window.location.reload();
  };

  if (!needsUpdate) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-[#0a1128] border-2 border-brq-gold rounded-3xl p-8 shadow-[0_0_60px_rgba(212,175,55,0.5)] text-center relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-brq-gold/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-20 h-20 bg-gradient-to-br from-brq-gold/30 to-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brq-gold/40 shadow-[0_0_25px_rgba(212,175,55,0.3)]">
          <RefreshCw size={36} className={`text-brq-gold ${isUpdating ? 'animate-spin' : ''}`} />
        </div>

        <h3 className="text-2xl font-black text-white mb-2">تحديث إجباري متوفر! 🔥</h3>
        <p className="text-sm text-brq-gold/90 mb-6 leading-relaxed">
          تم إضافة منتجات أو تحديثات جديدة في الأقسام. يرجى الضغط على زر التحديث الإجباري أدناه لمتابعة التصفح وعرض أحدث الموديلات.
        </p>

        <button
          onClick={handleUpdateNow}
          disabled={isUpdating}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-brq-gold via-amber-400 to-yellow-500 text-black font-black text-base shadow-[0_10px_30px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isUpdating ? <RefreshCw size={20} className="animate-spin" /> : <Sparkles size={20} />}
          <span>تحديث الآن وعرض الجديد</span>
        </button>
      </motion.div>
    </div>
  );
}
