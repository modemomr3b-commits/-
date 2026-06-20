import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log('Error users:', error);
  const { data: d2, error: e2 } = await supabase.from('settings').select('*').limit(1);
  console.log('Error settings SELECT:', e2);
  const { data: d3, error: e3 } = await supabase.from('settings').update({ data: {} }).match({ id: 'global' });
  console.log('Error settings UPDATE:', e3);
  const { data: d4, error: e4 } = await supabase.from('settings').upsert({ id: 'global', data: {} });
  console.log('Error settings UPSERT:', e4);
}
test();
