import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://uxlmpuqnkjfyzroqwwgh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA');

async function update() {
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 'global').single();
  
  let currentData = settings && settings.data ? settings.data : {};
  currentData.usdExchangeRate = 1600;
  
  const { error } = await supabase.from('settings').upsert({ id: 'global', data: currentData });
  
  if (error) {
     console.error("Error updating settings:", error);
  } else {
     console.log("Settings updated successfully to 1600!");
  }
}
update();
