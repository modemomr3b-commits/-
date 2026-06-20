import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  const { data: prods } = await supabase.from('products').select('id').limit(1);
  if (prods && prods.length > 0) {
    const { error } = await supabase.from('products').update({ isDeleted: true, deletedAt: Date.now() }).match({ id: prods[0].id });
    console.log("Delete response products:", error);
  } else {
    console.log("No products.");
  }
}

testDelete();
