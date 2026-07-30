const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

const regex = /            <button\n              onClick=\{\(\) => setFilterStatus\("locked"\)\}\n              className=\{`pb-2 px-2 text-sm font-bold border-b-2 transition-colors \$\{filterStatus === "locked" \? "border-brq-gold text-brq-gold" : "border-transparent text-white\/50 hover:text-white"\}`\}\n            >\n              المواد المقفلة\n            <\/button>\n            <button\n              onClick=\{\(\) => setIsDownloadDialogOpen\(true\)\}\n              className="pb-2 px-2 text-sm font-bold border-b-2 border-transparent text-brq-gold hover:text-white transition-colors flex items-center gap-1"\n            >\n              <Download size=\{14\} \/> تحميل جميع الصور \(Zip\)\n            <\/button>\n          <\/div>/g;

// Since it was replaced via regex before, I will just remove the second occurrence or all occurrences that are inside the table cell.
// Let's just remove it and put it manually in the right place.
code = code.replace(regex, "");
fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
