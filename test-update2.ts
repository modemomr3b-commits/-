import { api } from './src/api';
import { supabase } from './src/supabase';

async function run() {
  const prods = await api.getProducts();
  const p = prods[0];
  
  await api.updateProduct(p.id, { isHidden: true });
  
  // Directly fetch from DB avoiding our API parsing to see what's actually there
  const { data } = await supabase.from('products').select('*').match({ id: p.id }).single();
  console.log("DB size object:", data.size);
}
run();
