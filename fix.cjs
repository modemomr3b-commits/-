const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');
code = code.replace(/<button\n\s*onClick=\{\(\) => setFilterStatus\("locked"\)\}\n\s*className=\{`pb-2 px-2 text-sm font-bold border-b-2 transition-colors \$\{filterStatus === "locked" \? "border-brq-gold text-brq-gold" : "border-transparent text-white\/50 hover:text-white"\}`\}\n\s*>\n\s*المواد المقفلة\n\s*<\/button>\n\s*<button\n\s*onClick=\{\(\) => setFilterStatus\("locked"\)\}\n\s*className=\{`pb-2 px-2 text-sm font-bold border-b-2 transition-colors \$\{filterStatus === "locked" \? "border-brq-gold text-brq-gold" : "border-transparent text-white\/50 hover:text-white"\}`\}\n\s*>\n\s*المواد المقفلة\n\s*<\/button>/g, `<button
              onClick={() => setFilterStatus("locked")}
              className={\`pb-2 px-2 text-sm font-bold border-b-2 transition-colors \${filterStatus === "locked" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}\`}
            >
              المواد المقفلة
            </button>`);
fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
