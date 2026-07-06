const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

code = code.replace(
  /title: 'منتج جديد من الوفاء!',\s*body: 'تمت إضافة ' \+ r.name \+ ' للتو، سارع لتفقد المتجر.'/g,
  `title: '✨ منتج جديد من شركة الوفاء BRQ ✨',\n          body: 'تمت إضافة "' + r.name + '" للتو في متجرنا! 🛍️ سارع باكتشافه الآن.'`
);

code = code.replace(
  /title: r\.title,\s*body: r\.message/g,
  `title: '🔔 شركة الوفاء BRQ: ' + r.title,\n          body: r.message + ' ✨'`
);

fs.writeFileSync('src/api.ts', code);
