import { api } from './src/api';
import { supabase } from './src/supabase';

async function run() {
  const prods = await api.getProducts();
  const p = prods[0];
  console.log("update id:", p.id);
  const r = await api.updateProduct(p.id, { isHidden: !p.isHidden });
  
  const prods2 = await api.getProducts();
  const updatedP = prods2.find(x => x.id === p.id);
  console.log("Fetched again isHidden:", updatedP.isHidden);
}
run();
