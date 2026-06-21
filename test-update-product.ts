import { api } from './src/api';
import { supabase } from './src/supabase';

async function run() {
  try {
    const prods = await api.getProducts();
    if (prods.length === 0) return console.log("no products");
    const p = prods[0];
    console.log("Original:", p.name, "isHidden:", p.isHidden);
    const r = await api.updateProduct(p.id, { isHidden: !p.isHidden });
    console.log("Updated API result:", r.isHidden);
    
    const prods2 = await api.getProducts();
    console.log("Fetched again:", prods2[0].isHidden);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
