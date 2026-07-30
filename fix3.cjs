const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

const regex = /استرجاع من المواد المقفلة\s*<\/button>\s*<button\s*onClick=\{\(\) => setFilterStatus\("locked"\)\}\s*className=\{`pb-2 px-2 text-sm font-bold border-b-2 transition-colors \$\{filterStatus === "locked" \? "border-brq-gold text-brq-gold" : "border-transparent text-white\/50 hover:text-white"\}`\}\s*>\s*المواد المقفلة\s*<\/button>\s*<button\s*onClick=\{\(\) => setIsDownloadDialogOpen\(true\)\}\s*className="pb-2 px-2 text-sm font-bold border-b-2 border-transparent text-brq-gold hover:text-white transition-colors flex items-center gap-1"\s*>\s*<Download size=\{14\} \/> تحميل جميع الصور \(Zip\)\s*<\/button>/g;

code = code.replace(regex, `استرجاع من المواد المقفلة\n                    </button>\n                  )}`);
fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
