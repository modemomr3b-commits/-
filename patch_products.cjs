const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

const injection = `
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                  <div className="flex flex-col">
                    <p className="text-[9px] text-white/40 mb-0.5">تاريخ النزول</p>
                    <p className="text-[10px] text-white/70 font-mono tracking-tight">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-IQ') : '---'}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-[9px] text-white/40 mb-0.5">أخر تحديث</p>
                    <p className="text-[10px] text-white/70 font-mono tracking-tight">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('ar-IQ') : (p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-IQ') : '---')}</p>
                  </div>
                </div>
                <div className="mt-2">`;

code = code.replace(
  /<\/div>\s*<div className="mt-2">/,
  `</div>${injection}`
);

fs.writeFileSync('src/components/member/Products.tsx', code);
