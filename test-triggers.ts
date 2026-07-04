import { supabase } from './src/supabase';

async function run() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  // I can't easily query information_schema from supabase-js unless I use rpc
}
run();
