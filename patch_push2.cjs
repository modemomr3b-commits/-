const fs = require('fs');

let code = fs.readFileSync('src/pushService.ts', 'utf8');

code = code.replace(
  /alert\('الإشعارات محظورة\. يرجى السماح بها من إعدادات المتصفح\.'\);/,
  "alert('الإشعارات محظورة. يرجى فتح التطبيق في نافذة جديدة أو السماح بها من إعدادات المتصفح.');"
);

fs.writeFileSync('src/pushService.ts', code);
