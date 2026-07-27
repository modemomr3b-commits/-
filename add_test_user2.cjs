const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const userToCreate = {
    id: "test2",
    uid: "test2",
    username: "test2",
    password: "123",
    fullName: "test2 full",
    phone: '',
    role: 'normal',
    status: 'active',
    allowedDevice: 'all',
    createdAt: Date.now()
  };
  const { data, error } = await supabase.from('users').insert(userToCreate).select().single();
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
