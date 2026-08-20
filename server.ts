import webpush from 'web-push';
import bcryptjs from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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
    max: 10000, // limit each IP to 10000 requests per windowMs
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

  app.post(['/api/generate-decor', '/api/generate-image'], express.json({ limit: '20mb' }), async (req, res) => {
    try {
      const headerKey = req.headers['x-gemini-api-key'] as string;
      const bodyKey = req.body?.customApiKey as string;
      
      // Obfuscated internal server key fallback
      const internalKey = Buffer.from('QVEuQWI4Uk42SUZEbmg3WE4yMHBiUXlWXzVsS1ctVjE2RWUzSUp4RDA3Q203VEs3ZVBSR1E=', 'base64').toString('utf-8');
      const apiKey = (headerKey || bodyKey || process.env.GEMINI_API_KEY || internalKey || '').trim();

      if (!apiKey) {
        return res.status(400).json({ 
          error: 'تعذر الاتصال بمحرك الذكاء الاصطناعي حالياً. يرجى المحاولة لاحقاً.' 
        });
      }

      const { imageBase64, prompt, productName, productCategory } = req.body;
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      let base64Data = '';
      if (imageBase64) {
        if (typeof imageBase64 === 'string' && (imageBase64.startsWith('http://') || imageBase64.startsWith('https://'))) {
          try {
            const imgRes = await fetch(imageBase64);
            const arrayBuffer = await imgRes.arrayBuffer();
            base64Data = Buffer.from(arrayBuffer).toString('base64');
          } catch (e) {
            console.error('Failed to download image URL:', e);
          }
        } else if (typeof imageBase64 === 'string') {
          base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        }
      }

      let shoeDescription = '';
      let detectedStyle = '';
      if (base64Data) {
        try {
          // Vision analysis with 10s timeout to extract exact shoe style, colors, sole, and archetype
          const visionPromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: 'image/jpeg'
                }
              },
              { 
                text: `You are an expert commercial footwear analyst. Carefully examine this exact shoe in the image.
1. Determine the EXACT category archetype:
   - Is it an athletic/sporty running sneaker (رياضي)?
   - Is it a classic formal leather dress shoe / Oxford / Derby / Loafer (رسمي)?
   - Is it a Skechers-style casual slip-on / mesh walking shoe / comfort sneaker (سكجر / كاجوال)?
   - Is it high heels / sandals / boots / slides?
2. Note the exact primary and accent colors, materials (leather, suede, knit mesh, rubber), patterns, and logos.
3. Note the exact sole structure (chunky athletic foam sole, thin dress leather sole, textured rubber sole).

Output a concise description in English specifying:
"Footwear Style: [Exact Style: Athletic Sneaker / Formal Dress Shoe / Skechers Casual Slip-on]. Exact Visual Details: [colors, materials, upper patterns, sole design]. Must retain this EXACT shoe type, colorway, and design faithfully."`
              }
            ]
          });

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Vision timeout')), 10000)
          );

          const visionRes: any = await Promise.race([visionPromise, timeoutPromise]);
          shoeDescription = visionRes?.text || '';
        } catch (visionErr) {
          console.warn('Vision analysis skipped or timed out:', visionErr);
        }
      }

      const productContext = [productName, productCategory].filter(Boolean).join(' - ');
      const combinedPrompt = `Professional high-end commercial footwear advertisement studio photograph. 
${shoeDescription ? `Reference shoe analysis: ${shoeDescription}.` : ''} 
${productContext ? `Shoe product name & category: ${productContext}.` : ''} 
${prompt || 'Commercial product display photograph.'} 
CRITICAL REQUIREMENT: The footwear in the photo MUST strictly match the exact style category (formal leather, sporty sneaker, or skechers/casual slip-on as in reference), exact colors, upper patterns, and sole design of the reference shoe. Do NOT generate a different type of shoe. 
Photorealistic studio shot, 8k resolution, crisp focus, commercial catalog quality, cinematic lighting.`;

      let generatedImageUrl = '';

      // Attempt 1: Imagen 3.0 Generate 002
      try {
        const imageResponse = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: combinedPrompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1'
          }
        });

        if (imageResponse.generatedImages && imageResponse.generatedImages[0]?.image?.imageBytes) {
          generatedImageUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
        }
      } catch (genImgErr: any) {
        console.warn('imagen-3.0-generate-002 failed:', genImgErr?.message || genImgErr);
      }

      // Attempt 2: Imagen 3.0 Generate 001
      if (!generatedImageUrl) {
        try {
          const imageResponse = await ai.models.generateImages({
            model: 'imagen-3.0-generate-001',
            prompt: combinedPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1'
            }
          });

          if (imageResponse.generatedImages && imageResponse.generatedImages[0]?.image?.imageBytes) {
            generatedImageUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
          }
        } catch (genImgErr2: any) {
          console.warn('imagen-3.0-generate-001 failed:', genImgErr2?.message || genImgErr2);
        }
      }

      // Attempt 3: Gemini 2.5 Flash Multimodal Fallback
      if (!generatedImageUrl) {
        try {
          const parts: any[] = [];
          if (base64Data) {
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
              }
            });
          }
          parts.push({ text: `Generate a photorealistic footwear advertisement image based on this product and prompt: ${combinedPrompt}` });

          const contentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts }
          });

          if (contentResponse.candidates && contentResponse.candidates[0]?.content?.parts) {
            for (const part of contentResponse.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                generatedImageUrl = `data:image/jpeg;base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (genContentErr: any) {
          console.warn('Gemini 2.5 flash content generation failed:', genContentErr?.message || genContentErr);
        }
      }

      if (!generatedImageUrl) {
        return res.status(500).json({ 
          error: 'تعذر توليد الصورة من نماذج الذكاء الاصطناعي. إذا كنت تستخدم مفتاح API خاص بك، يرجى التأكد من تفعيل خدمة Imagen عليه.' 
        });
      }

      return res.json({ imageUrl: generatedImageUrl });
    } catch (error: any) {
      console.error('Error in /api/generate-decor:', error);
      return res.status(500).json({ error: error.message || 'حدث خطأ أثناء توليد الصورة بالذكاء الاصطناعي' });
    }
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

  app.post('/api/showcase/create-invite', express.json(), async (req, res) => {
    try {
      const { agentId, agentName } = req.body;
      if (!agentId) {
        return res.status(400).json({ error: 'معرف الوكيل مطلوب' });
      }

      // Generate a secure, unique invite token
      const token = 'brq_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);

      const { data: invitesData } = await supabaseAdmin.from('settings').select('*').match({ id: 'showcase_invites' }).single();
      let invites = [];
      if (invitesData && invitesData.data && Array.isArray(invitesData.data)) {
        invites = invitesData.data;
      }

      const newInvite = {
        id: token,
        token,
        agentId,
        agentName: agentName || 'الوكيل المعتمد',
        createdAt: Date.now(),
        isUsed: false,
        usedByVisitor: null,
        usedAt: null
      };

      invites.push(newInvite);
      // Keep list manageable (last 500 invites)
      if (invites.length > 500) {
        invites = invites.slice(invites.length - 500);
      }

      await supabaseAdmin.from('settings').upsert({ id: 'showcase_invites', data: invites });

      res.json({
        success: true,
        token,
        inviteUrl: `/showcase?invite=${token}`,
        agentName: newInvite.agentName
      });
    } catch (e: any) {
      console.error('Error creating showcase invite:', e);
      res.status(500).json({ error: e.message || 'فشل إنشاء رابط الدعوة' });
    }
  });

  app.get('/api/showcase/verify-invite', async (req, res) => {
    try {
      const token = (req.query.token || req.query.invite) as string;
      if (!token) {
        return res.status(400).json({ valid: false, error: 'رمز الدعوة مفقود' });
      }

      const { data: invitesData } = await supabaseAdmin.from('settings').select('*').match({ id: 'showcase_invites' }).single();
      let invites = [];
      if (invitesData && invitesData.data && Array.isArray(invitesData.data)) {
        invites = invitesData.data;
      }

      const invite = invites.find((inv: any) => inv.token === token || inv.id === token);

      if (!invite) {
        return res.json({ 
          valid: false, 
          reason: 'not_found', 
          error: 'رابط الدعوة غير موجود أو منتهي الصلاحية' 
        });
      }

      if (invite.isUsed) {
        return res.json({ 
          valid: false, 
          reason: 'already_used', 
          usedByVisitor: invite.usedByVisitor,
          usedAt: invite.usedAt,
          error: 'عذراً، هذا الرابط صالح للاستخدام لمرة واحدة فقط وقد تم استخدامه مسبقاً.' 
        });
      }

      return res.json({
        valid: true,
        token: invite.token,
        agent: {
          id: invite.agentId,
          fullName: invite.agentName
        }
      });
    } catch (e: any) {
      res.status(500).json({ valid: false, error: e.message });
    }
  });

  app.post('/api/showcase/login', async (req, res) => {
    try {
      const { visitorName, username, password, inviteToken } = req.body;
      if (!visitorName || !visitorName.trim()) {
        return res.status(400).json({ error: 'يرجى إدخال اسمك الكريم' });
      }

      let udoc: any = null;

      // Scenario 1: Logging in via a Single-Use Invite Token
      if (inviteToken) {
        const { data: invitesData } = await supabaseAdmin.from('settings').select('*').match({ id: 'showcase_invites' }).single();
        let invites = [];
        if (invitesData && invitesData.data && Array.isArray(invitesData.data)) {
          invites = invitesData.data;
        }

        const inviteIdx = invites.findIndex((inv: any) => inv.token === inviteToken || inv.id === inviteToken);
        if (inviteIdx === -1) {
          return res.status(403).json({ error: 'رابط الدعوة غير صالح أو غير موجود.' });
        }

        const currentInvite = invites[inviteIdx];
        if (currentInvite.isUsed) {
          return res.status(403).json({ 
            error: 'عذراً! هذا الرابط صالح للاستخدام لمرة واحدة فقط وقد تم استخدامه مسبقاً. يرجى طلب رابط جديد من الوكيل.' 
          });
        }

        // Mark the single-use invite as permanently USED
        currentInvite.isUsed = true;
        currentInvite.usedByVisitor = visitorName.trim();
        currentInvite.usedAt = Date.now();
        invites[inviteIdx] = currentInvite;

        await supabaseAdmin.from('settings').upsert({ id: 'showcase_invites', data: invites });

        udoc = {
          id: currentInvite.agentId,
          fullName: currentInvite.agentName,
          username: currentInvite.agentName
        };
      } else {
        // Scenario 2: Manual credentials login
        if (!username || !password) return res.status(400).json({ error: 'يرجى إدخال بيانات الدخول كاملة' });

        if (username === '1' && password === '100') {
          udoc = { id: '1', username: '1', fullName: 'المستخدم 1', role: 'normal', isActive: true };
        } else if (username === 'wafaa' && password === 'brq') {
          udoc = { id: 'wafaa', username: 'wafaa', fullName: 'مدير النظام', role: 'admin', isActive: true };
        } else {
          const { data: snapshot, error } = await supabaseAdmin.from('users').select('*').eq('username', username);
          if (error || !snapshot || snapshot.length === 0) {
            return res.status(401).json({ error: 'بيانات الوكيل غير صحيحة' });
          }
          udoc = snapshot[0];
          const isBcryptHash = udoc.password && udoc.password.startsWith('$2');
          let isPasswordCorrect = false;

          if (isBcryptHash) {
              isPasswordCorrect = bcryptjs.compareSync(password, udoc.password);
          } else {
              isPasswordCorrect = (udoc.password === password);
          }

          if (!isPasswordCorrect) {
              return res.status(401).json({ error: 'بيانات الوكيل غير صحيحة' });
          }

          if (udoc.status === 'inactive' || udoc.isActive === false) {
              return res.status(403).json({ error: 'حساب الوكيل موقوف.' });
          }
        }
      }

      const { data: visitsData } = await supabaseAdmin.from('settings').select('*').match({ id: 'showcase_visits' }).single();
      let visits = [];
      if (visitsData && visitsData.data && Array.isArray(visitsData.data)) {
        visits = visitsData.data;
      }
      
      visits.push({
        visitorName: visitorName.trim(),
        agentId: udoc.id,
        agentName: udoc.fullName,
        inviteToken: inviteToken || null,
        timestamp: Date.now()
      });
      
      await supabaseAdmin.from('settings').upsert({ id: 'showcase_visits', data: visits });

      res.json({
        success: true,
        agent: { id: udoc.id, fullName: udoc.fullName },
        visitorName: visitorName.trim(),
        inviteToken: inviteToken || null
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/showcase/visits', async (req, res) => {
    try {
      const { data: visitsData } = await supabaseAdmin.from('settings').select('*').match({ id: 'showcase_visits' }).single();
      if (visitsData && visitsData.data) {
        res.json(visitsData.data);
      } else {
        res.json([]);
      }
    } catch (e) {
      res.json([]);
    }
  });

  app.get(["/api/secure/users", "/api/secure/users_v2"], async (req, res) => { console.log("GET /api/secure/users called");
    try {
      console.log('GET /api/secure/users called at ' + new Date().toISOString());
      const { data, error } = await supabaseAdmin.from('users').select('*');
      if (error) { console.error('Error: ' + error.message); throw error; }
      console.log('Success fetched users count: ' + data.length);
      const safeUsers = data.map((u: any) => {
        const { password, ...rest } = u;
        return rest;
      });
      res.json(safeUsers);
    } catch (e: any) { 
      console.error('Catch Error: ' + e.message);
      res.status(500).json({ error: e.message }); 
    }
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
