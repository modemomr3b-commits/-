const fs = require('fs');
const file = 'src/components/admin/UserManager.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  '                   </p>}',
  ''
);

fs.writeFileSync(file, content);
