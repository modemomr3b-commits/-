const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

const regex = /<button\n\s*onClick=\{\(\) => setFilterStatus\("duplicates"\)\}\n\s*className=\{`pb-2 px-2 text-sm font-bold border-b-2 transition-colors \$\{filterStatus === "duplicates" \? "border-brq-gold text-brq-gold" : "border-transparent text-white\/50 hover:text-white"\}`\}\n\s*>\n\s*المواد المكررة\n\s*<\/button>/g;

code = code.replace(regex, `<button
              onClick={() => setFilterStatus("duplicates")}
              className={\`pb-2 px-2 text-sm font-bold border-b-2 transition-colors \${filterStatus === "duplicates" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}\`}
            >
              المواد المكررة
            </button>
            <button
              onClick={() => setFilterStatus("locked")}
              className={\`pb-2 px-2 text-sm font-bold border-b-2 transition-colors \${filterStatus === "locked" ? "border-brq-gold text-brq-gold" : "border-transparent text-white/50 hover:text-white"}\`}
            >
              المواد المقفلة
            </button>
            <button
              onClick={() => setIsDownloadDialogOpen(true)}
              className="pb-2 px-2 text-sm font-bold border-b-2 border-transparent text-brq-gold hover:text-white transition-colors flex items-center gap-1"
            >
              <Download size={14} /> تحميل جميع الصور (Zip)
            </button>
          </div>`);
fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
