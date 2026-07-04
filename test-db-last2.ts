import { supabase } from './src/supabase';

async function run() {
  const { data, error } = await supabase.from('products').select('*');
  if (data && data.length > 0) {
    const sorted = data.sort((a,b) => b.createdAt - a.createdAt);
    console.log(JSON.stringify(sorted[0], null, 2));
  } else {
    console.log("No data", error);
  }
}
run();
