const fs = require('fs');
let code = fs.readFileSync('src/components/member/Profile.tsx', 'utf8');

code = code.replace(
  /\{\!isInstalled && \(/,
  `{!pushEnabled && (
        <div className="glass-panel p-6 rounded-2xl border border-brq-royal/30 bg-brq-royal/10 mb-8 text-center flex flex-col items-center">
          <Bell className="w-12 h-12 text-brq-gold mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-2">تفعيل إشعارات الهاتف</h3>
          <p className="text-sm text-white/60 mb-4 max-w-xs leading-relaxed">
            احصل على تنبيهات فورية عند إضافة منتجات جديدة أو عروض مميزة، حتى والتطبيق مغلق.
          </p>
          <button 
            onClick={handleEnablePush}
            className="bg-brq-gold text-brq-navy px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 w-full max-w-xs hover:bg-brq-gold/90 transition-all active:scale-95"
          >
            <Bell className="w-4 h-4" />
            تفعيل الإشعارات
          </button>
        </div>
      )}

      {!isInstalled && (`
);

fs.writeFileSync('src/components/member/Profile.tsx', code);
