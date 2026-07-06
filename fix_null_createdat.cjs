const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://uxlmpuqnkjfyzroqwwgh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA');

async function fix() {
  const defaultDate = 1782968132150; // roughly 2026-07-02
  const { data, error } = await supabase.from('products').update({ createdAt: defaultDate }).is('createdAt', null);
  if (error) console.error(error);
  else console.log('Updated null createdAts');
}
fix();
