const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://uxlmpuqnkjfyzroqwwgh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA');

async function test() {
  const { data } = await supabase.from('products').select('*').limit(3);
  console.log(JSON.stringify(data, null, 2));
}
test();
