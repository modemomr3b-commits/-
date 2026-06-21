import { api } from './src/api';
import { supabase } from './src/supabase';

async function run() {
  const { data } = await supabase.from('products').select('*').limit(1);
  const rawP = data[0];
  console.log("Raw from DB `size`:", rawP.size, "typeof size:", typeof rawP.size);
  console.log("rawP.size?.isHidden:", rawP.size?.isHidden);

  const prods = await api.getProducts();
  const apiP = prods.find((p: any) => p.id === rawP.id);
  console.log("From API `isHidden`:", apiP?.isHidden);
}
run();
