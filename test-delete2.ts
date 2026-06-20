import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://uxlmpuqnkjfyzroqwwgh.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA');

async function testDelete() {
  const tables = ['products', 'categories', 'users', 'orders', 'updates', 'notifications'];
  for (const t of tables) {
    const { data: prods, error } = await supabase.from(t).select('isDeleted').limit(1);
    console.log(`Table ${t}: error =`, error?.message || 'OK');
  }
}
testDelete();
