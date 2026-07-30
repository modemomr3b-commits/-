const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');
code = code.replace(/<Download size=\{14\} \/> تحميل جميع الصور \(Zip\)\n\s*<\/button>\n\s*<\/div>\n\s*<\/div>\n\s*<div className="glass-panel/g, `<Download size={14} /> تحميل جميع الصور (Zip)
            </button>
          </div>
          <div className="glass-panel`);
fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
