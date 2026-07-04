import { supabase } from './src/supabase';

async function run() {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false }).limit(1);
  console.log(JSON.stringify(data, null, 2));
}
run();
