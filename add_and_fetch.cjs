const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const userToCreate = {
    id: "test3",
    uid: "test3",
    username: "test3",
    password: "123",
    fullName: "test3 full",
    phone: '',
    role: 'normal',
    status: 'active',
    allowedDevice: 'all',
    createdAt: Date.now()
  };
  console.log("Inserting...");
  const { data, error } = await supabase.from('users').insert(userToCreate).select().single();
  console.log("Insert:", error ? error.message : "Success");
  
  console.log("Fetching from backend...");
  const res = await fetch('http://localhost:3000/api/secure/users_v2?_t=' + Date.now());
  const users = await res.json();
  const found = users.find(u => u.username === 'test3');
  console.log("Found in backend:", !!found);
}
run();
