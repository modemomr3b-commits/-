import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';

async function fetchColumns() {
  const res = await fetch(`${supabaseUrl}/rest/v1/users?limit=1`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', data);
  // Also we can do an OPTIONS request to get schema
  const resOptions = await fetch(`${supabaseUrl}/rest/v1/users`, {
    method: 'OPTIONS',
    headers: { 'apikey': supabaseKey }
  });
  const text = await resOptions.text();
  console.log('Schema options keys:', Object.keys(data[0] || {}));
}
fetchColumns();
