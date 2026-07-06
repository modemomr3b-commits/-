import webpush from 'web-push';
import bcryptjs from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index";
import { users, products, categories, orders, orderItems, updates } from "./src/db/schema";
import { eq, desc } from "drizzle-orm";

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
    icon: '/logo.jpeg.jpeg',
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

  const PORT = 3000;
  app.use(express.json());
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

  // PRODUCTS
  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
      res.json(allProducts);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const inserted = await db.insert(products).values(req.body).returning();
      res.json(inserted[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const updated = await db.update(products).set(req.body).where(eq(products.id, req.params.id)).returning();
      res.json(updated[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await db.delete(products).where(eq(products.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // CATEGORIES
  app.get("/api/categories", async (req, res) => {
    try {
      const allCategories = await db.select().from(categories).orderBy(categories.order);
      res.json(allCategories);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const inserted = await db.insert(categories).values(req.body).returning();
      res.json(inserted[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const updated = await db.update(categories).set(req.body).where(eq(categories.id, req.params.id)).returning();
      res.json(updated[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await db.delete(categories).where(eq(categories.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // USERS
  app.get("/api/users", async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await db.select().from(users).where(eq(users.id, req.params.id));
      res.json(user.length > 0 ? user[0] : null);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const inserted = await db.insert(users).values(req.body).returning();
      res.json(inserted[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const updated = await db.update(users).set(req.body).where(eq(users.id, req.params.id)).returning();
      res.json(updated[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      await db.delete(users).where(eq(users.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ORDERS
  app.get("/api/orders", async (req, res) => {
    try {
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      res.json(allOrders);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const inserted = await db.insert(orders).values(req.body).returning();
      res.json(inserted[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const updated = await db.update(orders).set(req.body).where(eq(orders.id, req.params.id)).returning();
      res.json(updated[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      await db.delete(orders).where(eq(orders.id, req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // UPDATES / NOTIFICATIONS
  app.get("/api/updates", async (req, res) => {
    try {
      const allUpdates = await db.select().from(updates).orderBy(desc(updates.createdAt));
      res.json(allUpdates);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/updates", async (req, res) => {
    try {
      const inserted = await db.insert(updates).values(req.body).returning();
      res.json(inserted[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/updates/:id", async (req, res) => {
    try {
      await db.delete(updates).where(eq(updates.id, req.params.id));
      res.json({ success: true });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
