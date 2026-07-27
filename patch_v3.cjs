const fs = require('fs');
let content = fs.readFileSync('src/components/admin/UserManager.tsx', 'utf-8');
content = content.replace(
  '<p className="text-white/50 mb-4">لا يوجد مستخدمون حالياً. {debugMsg}</p>',
  '<p className="text-white/50 mb-4">لا يوجد مستخدمون حالياً.</p>'
);
fs.writeFileSync('src/components/admin/UserManager.tsx', content);
