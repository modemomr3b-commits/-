import { supabase } from './src/supabase';

async function run() {
  const { data, error } = await supabase.from('products').select('*');
  if (data) {
    const recent = data.filter(p => p.createdAt === null && p.piecesCount === 18 && p.price > 100000 && !p.name.includes("Test Product"));
    console.log(JSON.stringify(recent, null, 2));
  }
}
run();
