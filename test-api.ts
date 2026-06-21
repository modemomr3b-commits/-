import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';
export const supabase = createClient(supabaseUrl, supabaseKey);

const getData = async (table: string) => {
  const { data, error } = await supabase.from(table).select('*').neq('isDeleted', true);
  if (error) { console.error(error); return []; }
  return data;
};

async function test() {
  const data = await getData('products');
  console.log("length:", data.length);
  if (data.length > 0) {
    console.log("first item size:", data[0].size, "isHidden:", data[0].size?.isHidden);
    
    // Now if we try to simulate what api.ts updateProduct does:
    const safeData = { isHidden: false };
    const p = data[0];
    
    // THIS is the bug! 
    if (safeData.isHidden !== undefined) {
      // In api.ts, it says: safeData.size = { ...(safeData.size || {}), isHidden: safeData.isHidden }
      // But wait! `safeData` is `{ isHidden: false }`. It does NOT have `.size`.
      // It creates size = { isHidden: false }.
      // But wait, that REPLACES the old size entirely, wiping any previous size info.
      // And next time we read it, the size is { isHidden: false }.
    }
  }
}
test();
