import { supabase } from './src/supabase';

async function run() {
  const { data, error } = await supabase.from('products').select('*').like('name', 'Test Product%').limit(5);
  console.log(JSON.stringify(data, null, 2));
}
run();
