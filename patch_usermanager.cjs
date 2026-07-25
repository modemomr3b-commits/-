const fs = require('fs');
const file = 'src/components/admin/UserManager.tsx';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(
  'console.error(e);',
  'console.error("Error fetching users in UserManager:", e);'
);
fs.writeFileSync(file, content);
