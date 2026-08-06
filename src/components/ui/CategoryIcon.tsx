import React from 'react';
import { motion } from 'motion/react';
import { Flame, Sun, Sparkles, ShoppingBag } from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

export default function CategoryIcon({ name, className = '' }: CategoryIconProps) {
  const normalizedName = (name || '').trim().toLowerCase();

  // 1. جديد الوفاء (New Wafaa)
  if (normalizedName.includes('جديد الوفاء') || (normalizedName.includes('جديد') && normalizedName.includes('الوفاء') && !normalizedName.includes('حقائب') && !normalizedName.includes('شحاطة'))) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* Glow pulse background */}
        <motion.div 
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/40 via-yellow-400/40 to-amber-600/40 blur-md"
        />
        {/* Shiny Badge */}
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-700 p-[2px] shadow-lg shadow-amber-500/20">
          <div className="w-full h-full rounded-full bg-slate-950/90 flex flex-col items-center justify-center relative overflow-hidden border border-amber-300/30">
            {/* Shimmer light effect */}
            <motion.div 
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12"
            />
            <Sparkles size={12} className="text-amber-300 absolute top-1.5 animate-pulse" />
            <span className="font-black text-xs tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-100 font-mono uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-1">
              NEW
            </span>
            <span className="text-[9px] font-bold text-amber-300/90 leading-tight">جديد</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. جديد لاستيك & ايتف / قسم جديد لاستيك
  if (normalizedName.includes('لاستيك') || normalizedName.includes('ايتف') || normalizedName.includes('ايفا') || normalizedName.includes('ايڤا')) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 flex items-center justify-center shadow-md relative overflow-hidden group">
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-3xl flex items-center justify-center filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]"
          >
            🩴
          </motion.div>
        </div>
      </div>
    );
  }

  // 3. جديد تركي / قسم جديد تركي
  if (normalizedName.includes('تركي') || normalizedName.includes('تركية') || normalizedName.includes('تركيا')) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600/30 to-red-950/40 border border-red-500/40 flex items-center justify-center shadow-md relative overflow-hidden">
          <motion.div
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-3xl flex items-center justify-center filter drop-shadow-[0_2px_8px_rgba(220,38,38,0.5)]"
          >
            🇹🇷
          </motion.div>
        </div>
      </div>
    );
  }

  // 4. قسم صيفي
  if (normalizedName.includes('صيفي') || normalizedName.includes('صيف')) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-yellow-500/10 border border-amber-400/30 flex items-center justify-center shadow-md relative overflow-hidden">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 flex items-center justify-center opacity-30 text-amber-400"
          >
            <Sun size={48} strokeWidth={1} />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-3xl relative z-10 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
          >
            ☀️
          </motion.div>
        </div>
      </div>
    );
  }

  // 5. سكجر راقي / سكجر راقي الوفاء
  if (normalizedName.includes('سكجر') || normalizedName.includes('سكيتشرز') || normalizedName.includes('skechers')) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600/30 via-indigo-900/40 to-slate-900 border border-blue-400/40 flex items-center justify-center shadow-md relative overflow-hidden">
          {/* Custom Skechers 'S' Brand Badge */}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-[1.5px] flex items-center justify-center shadow-lg shadow-blue-500/30">
            <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
              <span className="font-black italic text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-white tracking-tighter transform -skew-x-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                S
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. قسم تحطيم الاسعار
  if (normalizedName.includes('تحطيم') || normalizedName.includes('نار') || normalizedName.includes('عروض') || normalizedName.includes('تخفيضات')) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <motion.div 
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-orange-600/30 blur-md"
        />
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500/30 via-orange-600/30 to-amber-500/20 border border-orange-500/40 flex items-center justify-center shadow-md relative overflow-hidden">
          <motion.div
            animate={{ y: [0, -2, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 flex items-center justify-center"
          >
            <Flame size={32} className="text-orange-500 fill-amber-400 filter drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
          </motion.div>
        </div>
      </div>
    );
  }

  // 7. جديد شحاطة الوفاء / شحاطة / شحاطات
  if (normalizedName.includes('شحاطة') || normalizedName.includes('شحاطات')) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 via-purple-600/20 to-blue-600/20 border border-pink-400/30 flex items-center justify-center shadow-md relative overflow-hidden">
          <div className="flex items-center gap-0.5 filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
            <span className="text-2xl transform -rotate-12">🩴</span>
            <span className="text-xl transform rotate-12 -ml-1">👡</span>
          </div>
        </div>
      </div>
    );
  }

  // 8. جديد حقائب الوفاء / حقائب / حقيبة
  if (normalizedName.includes('حقائب') || normalizedName.includes('حقيبة')) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 via-teal-600/20 to-cyan-600/20 border border-teal-400/30 flex items-center justify-center shadow-md relative overflow-hidden">
          <div className="flex items-center gap-1 filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
            <span className="text-2xl">🎒</span>
            <span className="text-2xl">🧳</span>
          </div>
        </div>
      </div>
    );
  }

  // General Fallbacks based on keywords
  if (normalizedName.includes('اطفال') || normalizedName.includes('أطفال') || normalizedName.includes('ولادي') || normalizedName.includes('بناتي')) {
    return (
      <div className={`w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-3xl border border-white/5 shadow-inner ${className}`}>
        👶
      </div>
    );
  }

  if (normalizedName.includes('نسائي')) {
    return (
      <div className={`w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-3xl border border-white/5 shadow-inner ${className}`}>
        👠
      </div>
    );
  }

  if (normalizedName.includes('رجالي')) {
    return (
      <div className={`w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-3xl border border-white/5 shadow-inner ${className}`}>
        👞
      </div>
    );
  }

  // Default shoe / sneaker fallback
  return (
    <div className={`w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-3xl border border-white/5 shadow-inner ${className}`}>
      👟
    </div>
  );
}
