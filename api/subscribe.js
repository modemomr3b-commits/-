import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const subscription = req.body;
  
  try {
    const { data } = await supabase.from('settings').select('*').match({ id: 'push_subs' }).single();
    let subscriptions = [];
    if (data && data.data && Array.isArray(data.data)) {
      subscriptions = data.data;
    }
    
    if (!subscriptions.find(s => s.endpoint === subscription.endpoint)) {
      subscriptions.push(subscription);
      await supabase.from('settings').upsert({ id: 'push_subs', data: subscriptions });
    }
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
