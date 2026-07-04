import { supabase } from './src/supabase';

async function run() {
  const { data, error } = await supabase.from('products').select('*').eq('piecesCount', 18);
  if (data) {
    data.forEach(p => console.log(p.name, p.price, p.piecesCount, p.piecePriceIqd, p.createdAt));
  }
}
run();
