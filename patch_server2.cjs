const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /app\.post\('\/api\/subscribe', express\.json\(\), async \(req, res\) => \{[\s\S]*?res\.status\(201\)\.json\(\{\}\);\n\}\);/,
  `app.post('/api/subscribe', express.json(), async (req, res) => {
  const subscription = req.body;
  try {
    const { data } = await supabaseAdmin.from('settings').select('*').match({ id: 'push_subs' }).single();
    let subs = data?.data || [];
    if (!subs.find(s => s.endpoint === subscription.endpoint)) {
      subs.push(subscription);
      await supabaseAdmin.from('settings').upsert({ id: 'push_subs', data: subs });
    }
  } catch (e) {
    console.error(e);
  }
  res.status(201).json({});
});`
);

code = code.replace(
  /app\.post\('\/api\/notify-publish', express\.json\(\), async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{\ success:\ true\ \}\);\n\}\);/,
  `app.post('/api/notify-publish', express.json(), async (req, res) => {
  const payload = JSON.stringify({
    title: req.body.title || 'منتج جديد!',
    body: req.body.body || 'تمت إضافة منتج جديد في المتجر',
    icon: '/logo.jpeg.jpeg',
    url: '/'
  });

  try {
    const { data } = await supabaseAdmin.from('settings').select('*').match({ id: 'push_subs' }).single();
    let subs = data?.data || [];
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
  
  res.status(200).json({ success: true });
});`
);

fs.writeFileSync('server.ts', code);
