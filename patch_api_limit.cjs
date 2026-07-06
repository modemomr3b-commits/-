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
      },
      {
        title: '🤩 الأناقة بين إيديك!',
        body: 'تشكيلة جديدة بانتظارك في شركة الوفاء المتميز BRQ. اكتشف أحدث صيحات الموضة.'
      },
      {
        title: '💎 التميز عنواننا!',
        body: 'موديل جديد ينضم لعائلتنا، تفرد بإطلالتك مع شركة الوفاء المتميز BRQ.'
      },
      {
        title: '🌟 أضف لمسة سحرية!',
        body: 'جديدنا اليوم غير! لا تفوت فرصة مشاهدة أحدث الإضافات من شركة الوفاء المتميز BRQ.'
      },
      {
        title: '🚀 انطلق بأناقة!',
        body: 'أحدث الموديلات نزلت وتنتظرك تكتشفها. شركة الوفاء المتميز BRQ توفر لك الأفضل دائماً.'
      },
      {
        title: '🛍️ وقت التسوق!',
        body: 'منتجات جديدة ومميزة بانتظارك. تسوق الآن من شركة الوفاء المتميز BRQ.'
      }
    ];
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

    let history = [];
    try { history = JSON.parse(localStorage.getItem('brq_push_history') || '[]'); } catch (e) {}
    const now = Date.now();
    // إرسال رسالتين كحد أقصى كل 4 ساعات
    history = history.filter(time => now - time < 4 * 60 * 60 * 1000);

    if (history.length < 2) {
      try {
        fetch('/api/notify-publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: randomTemplate.title,
            body: randomTemplate.body + '\\nالموديل: ' + r.name
          })
        });
        history.push(now);
        localStorage.setItem('brq_push_history', JSON.stringify(history));
      } catch (e) {}
    }
`;

code = code.replace(
  /const templates = \[\s*\{\s*title: '🚨 وصل الجديد!',[\s\S]*?try\s*\{\s*fetch\('\/api\/notify-publish',\s*\{\s*method:\s*'POST',[\s\S]*?catch\s*\(e\)\s*\{\}/,
  replacement
);

fs.writeFileSync('src/api.ts', code);
