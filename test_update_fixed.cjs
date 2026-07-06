require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Load env directly
const envFile = require('fs').readFileSync('.env', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=');
  if (key && val) acc[key.trim()] = val.trim();
  return acc;
}, {});

const supabaseUrl = process.env.VITE_SUPABASE_URL || envVars['VITE_SUPABASE_URL'];
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || envVars['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: products } = await supabase.from('products').select('*').limit(2);
  const p = products[0];
  console.log("Product:", p.id, p.name);
  
  // Make sure it has existingSize
  let safeData = { size: { ...p.size, isHidden: true } };
  await supabase.from('products').update(safeData).match({ id: p.id });
  
  const { data: op } = await supabase.from('products').select('size').match({ id: p.id }).single();
  console.log("Size after hide:", op.size);

  const existingSize = op?.size || {};
  
  // Simulate data from UI
  const data = { isHidden: false };
  const wasHidden = data.isHidden === false && existingSize.isHidden === true;
  let oldProduct = wasHidden ? op : null;
  
  console.log("wasHidden?", wasHidden);
  console.log("oldProduct?", oldProduct);

  const updateData = { ...data, updatedAt: Date.now() };
  updateData.size = { ...existingSize, ...(updateData.size || {}) };
  updateData.size.isHidden = false;
  delete updateData.isHidden;

  const { data: r, error } = await supabase.from('products').update(updateData).match({ id: p.id }).select().single();
  
  console.log("Updated product size:", r.size);
  console.log("oldProduct && !updateData.size?.isHidden?", !!(oldProduct && !updateData.size?.isHidden));
}
run();
