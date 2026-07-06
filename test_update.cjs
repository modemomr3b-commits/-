require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: p } = await supabase.from('products').select('*').limit(1).single();
  console.log("Product:", p.id, p.name);
  
  // Update it to hidden
  let safeData = { size: { ...p.size, isHidden: true } };
  await supabase.from('products').update(safeData).match({ id: p.id });
  
  // Now simulate unhiding via API
  console.log("Fetching again...");
  const { data: op } = await supabase.from('products').select('size').match({ id: p.id }).single();
  console.log("op:", op.size);
  
  const wasHidden = true;
  let oldProduct = op;
  
  safeData = { size: { ...op.size, isHidden: false } };
  const { data: r, error } = await supabase.from('products').update(safeData).match({ id: p.id }).select().single();
  console.log("Updated product:", r.id, r.size);
  
  if (oldProduct && !safeData.size?.isHidden) {
      console.log("Sending push...");
      const fetch = (await import('node-fetch')).default;
      const res = await fetch('http://localhost:3000/api/notify-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🚨 الموديل متاح الآن!',
          body: 'الموديل ' + r.name + ' أصبح متوفراً الآن في متجر شركة الوفاء المتميز BRQ. تسوق الآن!'
        })
      });
      console.log("Push result:", await res.json());
  }
}
run();
