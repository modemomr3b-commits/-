const fs = require('fs');
let code = fs.readFileSync('src/components/member/ProductDetail.tsx', 'utf8');

const injection = `</div>
                <div className="glass-panel p-3 rounded-xl border border-white/5 bg-black/20">
                   <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">تاريخ النزول</p>
                   <p className="font-mono text-xs font-bold text-white tracking-tight">{product.createdAt ? new Date(product.createdAt).toLocaleDateString('ar-IQ') : '---'}</p>
                </div>
                <div className="glass-panel p-3 rounded-xl border border-white/5 bg-black/20">
                   <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">أخر تحديث</p>
                   <p className="font-mono text-xs font-bold text-white tracking-tight">{product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('ar-IQ') : (product.createdAt ? new Date(product.createdAt).toLocaleDateString('ar-IQ') : '---')}</p>
                </div>
            </div>`;

code = code.replace(
  /<\/div>\s*<\/div>\s*<\/div>\s*\{/s,
  `</div>\n            ${injection}\n         </div>\n\n         {`
);

fs.writeFileSync('src/components/member/ProductDetail.tsx', code);
