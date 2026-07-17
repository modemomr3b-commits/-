import webpush from 'web-push';
import bcryptjs from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
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
    const { error } = await supabaseAdmin.from('settings').upsert({ id: 'push_subs', data: subscriptions });
    if (error) console.error("Error saving subs:", error);
    else console.log("Saved subscriptions:", subscriptions.length);
  } catch (e) {
    console.error("Exception saving subs:", e);
  }
}

loadSubscriptions();

app.get('/api/vapidPublicKey', (req, res) => {
  res.send(VAPID_PUBLIC);
});

app.post('/api/subscribe', express.json(), async (req, res) => {
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
});

app.post('/api/notify-publish', express.json(), async (req, res) => {
  const payload = JSON.stringify({
    title: req.body.title || 'منتج جديد!',
    body: req.body.body || 'تمت إضافة منتج جديد في المتجر',
    icon: '/logo.jpeg.jpeg',
    url: '/messages'
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
});

  const PORT = 3000;

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api/', limiter);
  
  // Custom API Key middleware for sensitive routes if needed
  const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real scenario, verify Supabase JWT token here
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  app.use(cors());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });

      if (username === '1' && password === '100') {
          return res.json({
             id: '1', uid: 'demo_user_1', username: '1', fullName: 'المستخدم 1', role: 'normal', isActive: true
          });
      }
      if (username === 'wafaa' && password === 'brq') {
          return res.json({
             id: 'wafaa', uid: 'admin_user_wafaa', username: 'wafaa', fullName: 'مدير النظام', role: 'admin', isActive: true
          });
      }

      const { data: snapshot, error } = await supabaseAdmin.from('users').select('*').eq('username', username);
      if (error || !snapshot || snapshot.length === 0) {
        return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
      }

      const udoc = snapshot[0];
      const isBcryptHash = udoc.password && udoc.password.startsWith('$2');
      let isPasswordCorrect = false;

      if (isBcryptHash) {
          isPasswordCorrect = bcryptjs.compareSync(password, udoc.password);
      } else {
          isPasswordCorrect = (udoc.password === password);
      }

      if (!isPasswordCorrect) {
          return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
      }

      if (udoc.status === 'inactive' || udoc.isActive === false) {
          return res.status(403).json({ error: 'تم إيقاف هذا الحساب.' });
      }

      const { password: _dbPassword, ...userWithoutPassword } = udoc;
      res.json({ id: udoc.id, ...userWithoutPassword, uid: udoc.id });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/secure/users", async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('users').select('*');
      if (error) throw error;
      const safeUsers = data.map((u: any) => {
        const { password, ...rest } = u;
        return rest;
      });
      res.json(safeUsers);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/secure/users/:id", async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('users').select('*').match({ id: req.params.id }).single();
      if (error || !data) return res.status(404).json({ error: 'Not found' });
      const { password, ...rest } = data;
      res.json(rest);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
