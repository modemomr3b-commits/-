const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('web-push')) {
  // Restore and patch properly
  code = `import webpush from 'web-push';\n` + code;
  
  const pushCode = `
const VAPID_PUBLIC = 'BLyNGvqb8WAkMzf7JPOzKihbeHnZR_fcVPCC3Hv1382Y1EoNhw3uDIBL4l6eF6lezioeP1XGmqr4Al2WPy--Qpk';
const VAPID_PRIVATE = '2n_KjPNXJ_VlxYITu8ELcOHqTLkQ_3qdFJyMxI8hHqA';
webpush.setVapidDetails(
  'mailto:support@brq.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

let subscriptions: any[] = [];
async function loadSubscriptions() {
  try {
    const { data } = await supabaseAdmin.from('settings').select('*').match({ id: 'push_subs' }).single();
    if (data && data.data && Array.isArray(data.data)) {
      subscriptions = data.data;
    }
  } catch (e) {}
}
async function saveSubscriptions() {
  try {
    await supabaseAdmin.from('settings').upsert({ id: 'push_subs', data: subscriptions });
  } catch (e) {}
}

loadSubscriptions();

app.get('/api/vapidPublicKey', (req, res) => {
  res.send(VAPID_PUBLIC);
});

app.post('/api/subscribe', express.json(), async (req, res) => {
  const subscription = req.body;
  if (!subscriptions.find(s => s.endpoint === subscription.endpoint)) {
    subscriptions.push(subscription);
    await saveSubscriptions();
  }
  res.status(201).json({});
});

app.post('/api/notify-publish', express.json(), async (req, res) => {
  const payload = JSON.stringify({
    title: req.body.title || 'منتج جديد!',
    body: req.body.body || 'تمت إضافة منتج جديد في المتجر',
    icon: '/icon-192.png',
    url: '/'
  });

  const promises = subscriptions.map(sub => 
    webpush.sendNotification(sub, payload).catch(e => {
      if (e.statusCode === 410) {
        subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
      }
    })
  );
  
  await Promise.all(promises);
  await saveSubscriptions();
  res.status(200).json({ success: true });
});
`;

  code = code.replace(/const app = express\(\);/, 'const app = express();' + pushCode);
  fs.writeFileSync('server.ts', code);
  console.log('Patched');
} else {
  console.log('Already patched');
}
