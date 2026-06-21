import { api } from './src/api';
import { supabase } from './src/supabase';

async function run() {
  const prods = await api.getProducts();
  const p = prods.find(x => x.id === '3beac476-854d-4f9e-92fb-a250ef48bd09');
  
  console.log("Original isHidden:", p.isHidden);
  const r = await api.updateProduct(p.id, { isHidden: !p.isHidden });
  
  const prods2 = await api.getProducts();
  const updatedP = prods2.find(x => x.id === p.id);
  console.log("Fetched again size:", updatedP.size);
  console.log("Fetched again isHidden:", updatedP.isHidden);
}
run();
