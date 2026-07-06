const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabaseAdmin.from('settings').select('*').match({ id: 'push_subs' }).single();
  console.log("Subscriptions data:", data ? data.data.length : 'none', error);
  if (data && data.data && data.data.length > 0) {
     console.log("Endpoint preview:", data.data[0].endpoint.substring(0, 30) + '...');
  }
}
run();
