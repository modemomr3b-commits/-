const fs = require('fs');
let code = fs.readFileSync('src/components/admin/NotificationManager.tsx', 'utf8');

code = code.replace(
  /\/\/ إرسال إشعار للمشتركين \(Push Notification\)[\s\S]*?\} catch \(err\) \{\n        console\.error\('Failed to send push notification:', err\);\n      \}/,
  ``
);

fs.writeFileSync('src/components/admin/NotificationManager.tsx', code);
