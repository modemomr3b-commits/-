const fs = require('fs');
let code = fs.readFileSync('src/components/shared/CategoryDownloadDialog.tsx', 'utf8');

code = code.replace(/user\?\.role === 'normal'/g, "(user?.role !== 'admin' && user?.role !== 'sales')");

fs.writeFileSync('src/components/shared/CategoryDownloadDialog.tsx', code);
