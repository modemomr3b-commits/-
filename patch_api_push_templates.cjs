const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

const replacement = `
    const templates = [
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
        body: 'أحدث الموديلات بانتظارك. ادخل المتجر وشوف كل جديد من شركة الوفاء المتميز BRQ.'
      },
      {
        title: '🔥 رجعنا بالجديد!',
        body: 'أحدث الموديلات وصلت، والأسعار جاهزة. زور متجر شركة الوفاء المتميز BRQ واختر اللي يعجبك.'
      },
      {
        title: '🎉 لا يفوتك!',
        body: 'نزلت موديلات جديدة مختارة بعناية. تسوق الآن من شركة الوفاء المتميز BRQ.'
      }
    ];
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

    try {
      fetch('/api/notify-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: randomTemplate.title,
          body: randomTemplate.body + '\\nالموديل: ' + r.name
        })
      });
    } catch (e) {}`;

code = code.replace(
  /try\s*\{\s*fetch\('\/api\/notify-publish',\s*\{\s*method:\s*'POST',\s*headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\},\s*body:\s*JSON\.stringify\(\{\s*title:\s*'✨ منتج جديد من شركة الوفاء BRQ ✨',\s*body:\s*'تمت إضافة "' \+ r\.name \+ '" للتو في متجرنا! 🛍️ سارع باكتشافه الآن\.'\s*\}\)\s*\}\);\s*\}\s*catch\s*\(e\)\s*\{\}/,
  replacement
);

fs.writeFileSync('src/api.ts', code);
