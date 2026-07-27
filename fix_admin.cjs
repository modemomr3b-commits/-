const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  await supabase.from('users').delete().neq('id', 'xxxx');
  const { data, error } = await supabase.from('users').insert({
    id: 'wafaa',
    uid: 'wafaa',
    username: 'wafaa',
    password: 'brq',
    role: 'admin',
    fullName: 'مدير النظام',
    status: 'active'
  });
  console.log("Created admin wafaa:", error);
}
run();
