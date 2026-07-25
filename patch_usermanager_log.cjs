const fs = require('fs');
const file = 'src/components/admin/UserManager.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  'return (',
  'console.log("Rendering UserManager, users length:", users.length, "filtered:", filteredUsers.length);\n  return ('
);

fs.writeFileSync(file, content);
