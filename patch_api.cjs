const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

code = code.replace(
  /body: randomTemplate\.body \+ '\\nالموديل: ' \+ r\.name/g,
  "body: randomTemplate.body"
);

code = code.replace(
  /fetch\('\/api\/notify-publish', \{\n\s*method: 'POST',\n\s*headers: \{ 'Content-Type': 'application\/json' \},\n\s*body: JSON\.stringify\(\{\n\s*title: '🚨 الموديل متاح الآن!',\n\s*body: 'الموديل ' \+ r\.name \+ ' أصبح متوفراً الآن في متجر شركة الوفاء المتميز BRQ\. تسوق الآن!'\n\s*\}\)\n\s*\}\);/,
  `const templates = [
          {
            title: '🚨 وصل الجديد!',
            body: 'موديلات جديدة نزلت الآن في شركة الوفاء المتميز BRQ. لا تتأخر وشوفها قبل الجميع.'
          },
          {
            title: '✨ تحديث جديد!',
            body: 'أضفنا موديلات مميزة بأسعار محدثة. تصفح الجديد الآن مع شركة الوفاء المتميز BRQ.'
          },
          {
            title: '📦 الجديد صار متوفر!',
            body: 'أجمل الموديلات بانتظارك في تطبيق شركة الوفاء المتميز BRQ. سارع بالشراء!'
          }
        ];
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        fetch('/api/notify-publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: randomTemplate.title,
            body: randomTemplate.body
          })
        });`
);

fs.writeFileSync('src/api.ts', code);
