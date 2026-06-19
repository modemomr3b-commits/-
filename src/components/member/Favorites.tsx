import { Heart, Trash2 } from 'lucide-react';
import { Link } from 'react-router';

export default function Favorites() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-6 text-brq-gold">
         <Heart className="w-6 h-6 fill-brq-gold" />
         <h1 className="text-xl font-bold">المفضلة</h1>
      </div>
      
      <div className="space-y-3">
         {[1,2,3].map((i) => (
             <div key={i} className="glass-card flex gap-4 p-3 rounded-2xl relative">
                <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=100" className="w-20 h-20 rounded-xl object-contain bg-black/20" />
                <div className="flex flex-col flex-1 pb-1">
                   <h3 className="font-bold text-sm mb-1 leading-tight w-4/5 pt-1">حذاء رياضي ييزي نيون خفيف</h3>
                   <span className="text-xs text-white/50 mb-auto">YZ-100</span>
                   <span className="text-brq-gold font-bold text-sm">25,000 د.ع</span>
                </div>
                <button className="absolute bottom-3 left-4 text-red-500/80 hover:text-red-500 transition-colors p-2 bg-red-500/10 rounded-lg">
                   <Trash2 size={16} />
                </button>
             </div>
         ))}
      </div>
    </div>
  );
}
