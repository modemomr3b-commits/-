import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const VAPID_PUBLIC = 'BLyNGvqb8WAkMzf7JPOzKihbeHnZR_fcVPCC3Hv1382Y1EoNhw3uDIBL4l6eF6lezioeP1XGmqr4Al2WPy--Qpk';
const VAPID_PRIVATE = '2n_KjPNXJ_VlxYITu8ELcOHqTLkQ_3qdFJyMxI8hHqA';

webpush.setVapidDetails(
  'mailto:support@brq.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const payload = JSON.stringify({
    title: req.body.title || 'تحديث جديد',
    body: req.body.body || 'يوجد شيء جديد لتكتشفه!',
    icon: '/icon-192x192.png',
    badge: '/badge.png'
  });

  try {
    const { data } = await supabase.from('settings').select('*').match({ id: 'push_subs' }).single();
    if (!data || !data.data || !Array.isArray(data.data)) {
      return res.status(200).json({ sent: 0 });
    }
    
    let subscriptions = data.data;
    let sentCount = 0;
    
    const results = await Promise.allSettled(
      subscriptions.map(sub => webpush.sendNotification(sub, payload))
    );
    
    results.forEach(r => {
      if (r.status === 'fulfilled') sentCount++;
    });
    
    res.status(200).json({ sent: sentCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
