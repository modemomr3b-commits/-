const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const intervalCode = `
  // Auto-send 3 notifications every half hour (i.e. every 10 minutes)
  const templates = [
    { title: '🚨 وصل الجديد!', body: 'موديلات جديدة نزلت الآن في شركة الوفاء المتميز BRQ. لا تتأخر وشوفها قبل الجميع.' },
    { title: '✨ تحديث جديد!', body: 'أضفنا موديلات مميزة بأسعار محدثة. تصفح الجديد الآن مع شركة الوفاء المتميز BRQ.' },
    { title: '📦 الجديد صار متوفر!', body: 'أجمل الموديلات بانتظارك في تطبيق شركة الوفاء المتميز BRQ. سارع بالشراء!' }
  ];
  setInterval(async () => {
    try {
      const { data } = await supabaseAdmin.from('settings').select('*').match({ id: 'push_subs' }).single();
      let subs = data?.data || [];
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      const payload = JSON.stringify({
        title: randomTemplate.title,
        body: randomTemplate.body,
        icon: '/logo.jpeg.jpeg',
        url: '/messages'
      });
      let updated = false;
      const promises = subs.map(sub => 
        webpush.sendNotification(sub, payload).catch(e => {
          if (e.statusCode === 410 || e.statusCode === 404) {
            subs = subs.filter(s => s.endpoint !== sub.endpoint);
            updated = true;
          }
        })
      );
      await Promise.all(promises);
      if (updated) {
        await supabaseAdmin.from('settings').upsert({ id: 'push_subs', data: subs });
      }
    } catch (e) {
      console.error(e);
    }
  }, 10 * 60 * 1000);
`;

if (!code.includes('Auto-send 3 notifications')) {
  code = code.replace(/app\.listen\(PORT/, intervalCode + '\n  app.listen(PORT');
  fs.writeFileSync('server.ts', code);
}
