const fs = require('fs');

let code = fs.readFileSync('src/components/member/Profile.tsx', 'utf8');

const replacement = `      <div className="glass-panel p-6 rounded-2xl border border-brq-royal/30 bg-brq-royal/10 mb-8 text-center flex flex-col items-center">
        <Bell className={\`w-12 h-12 mb-3 \${pushEnabled ? 'text-green-400' : 'text-brq-gold animate-pulse'}\`} />
        <h3 className="text-lg font-bold text-white mb-2">إشعارات الهاتف</h3>
        <p className="text-sm text-white/60 mb-4 max-w-xs leading-relaxed">
          {pushEnabled ? 'الإشعارات مفعلة بنجاح، ستصلك أحدث العروض والمنتجات.' : 'احصل على تنبيهات فورية عند إضافة منتجات جديدة أو عروض مميزة، حتى والتطبيق مغلق.'}
        </p>
        {!pushEnabled ? (
          <button 
            onClick={handleEnablePush}
            className="bg-brq-gold text-brq-navy px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 w-full max-w-xs hover:bg-brq-gold/90 transition-all active:scale-95"
          >
            <Bell className="w-4 h-4" />
            تفعيل الإشعارات
          </button>
        ) : (
          <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 w-full max-w-xs">
            الإشعارات مفعلة ✓
          </div>
        )}
      </div>`;

code = code.replace(/\{\!pushEnabled && \([\s\S]*?<\/div>\s*\)\}/, replacement);

fs.writeFileSync('src/components/member/Profile.tsx', code);
