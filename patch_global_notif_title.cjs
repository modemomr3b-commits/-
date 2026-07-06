const fs = require('fs');
let code = fs.readFileSync('src/components/GlobalNotifications.tsx', 'utf8');

code = code.replace(
  /\{notif\.name\}/g,
  `{notif.name || notif.title || 'إشعار جديد'}`
);

fs.writeFileSync('src/components/GlobalNotifications.tsx', code);
